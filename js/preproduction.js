(() => {
  "use strict";

  const panel = document.getElementById("execution-panel");
  const playButton = document.getElementById("run-program");
  const runButton = document.getElementById("execution-run");
  const stopButton = document.getElementById("execution-stop");
  const closeButton = document.getElementById("execution-close");
  const generatedCode = document.querySelector("#generated-js code");
  const output = document.getElementById("execution-output");
  const status = document.getElementById("execution-status");
  const inputForm = document.getElementById("execution-input");
  const inputLabel = document.getElementById("execution-input-label");
  const inputValue = document.getElementById("execution-input-value");
  const inputCancel = document.getElementById("execution-input-cancel");

  const labels = {
    fr: {
      title: "Test du programme", run: "▶ Exécuter", stop: "■ Arrêter", close: "Fermer",
      code: "JavaScript généré", output: "Sortie du programme", validate: "Valider",
      running: "Exécution…", done: "Terminé", stopped: "Arrêté", empty: "Aucune instruction à exécuter.",
      input: "Saisis une valeur", inputCancelled: "Saisie annulée (chaîne vide).",
      timeout: "Durée maximale dépassée : exécution arrêtée.",
      loopLimit: "Limite de sécurité atteinte : boucle arrêtée.",
      parallelWarning: "Attention : les branches parallèles peuvent modifier les mêmes variables et produire des résultats variables."
    },
    en: {
      title: "Program test", run: "▶ Run", stop: "■ Stop", close: "Close",
      code: "Generated JavaScript", output: "Program output", validate: "Submit",
      running: "Running…", done: "Finished", stopped: "Stopped", empty: "There are no instructions to execute.",
      input: "Enter a value", inputCancelled: "Input cancelled (empty string).",
      timeout: "Maximum run time exceeded: execution stopped.",
      loopLimit: "Safety limit reached: loop stopped.",
      parallelWarning: "Warning: parallel branches may change the same variables and produce varying results."
    },
    de: {
      title: "Programm testen", run: "▶ Ausführen", stop: "■ Stoppen", close: "Schließen",
      code: "Erzeugtes JavaScript", output: "Programmausgabe", validate: "Bestätigen",
      running: "Wird ausgeführt…", done: "Beendet", stopped: "Angehalten", empty: "Keine Anweisungen zum Ausführen.",
      input: "Wert eingeben", inputCancelled: "Eingabe abgebrochen (leere Zeichenfolge).",
      timeout: "Maximale Laufzeit überschritten: Ausführung gestoppt.",
      loopLimit: "Sicherheitsgrenze erreicht: Schleife gestoppt.",
      parallelWarning: "Achtung: Parallele Zweige können dieselben Variablen ändern und unterschiedliche Ergebnisse erzeugen."
    }
  };

  let worker = null;
  let workerUrl = null;
  let timeoutHandle = null;
  let pendingInputId = null;
  let currentLanguage = "fr";

  function languageStrings() {
    return labels[document.getElementById("lang-select").value] || labels.fr;
  }

  function updateLabels() {
    currentLanguage = document.getElementById("lang-select").value || "fr";
    const text = languageStrings();
    document.getElementById("execution-title").textContent = text.title;
    runButton.textContent = text.run;
    stopButton.textContent = text.stop;
    closeButton.setAttribute("aria-label", text.close);
    document.querySelector("#execution-panel summary").textContent = text.code;
    document.querySelector(".execution-output-section h3").textContent = text.output;
    document.getElementById("execution-input-submit").textContent = text.validate;
    playButton.setAttribute("aria-label", text.run);
    playButton.title = text.run;
  }

  function appendOutput(message) {
    output.textContent += (output.textContent ? "\n" : "") + String(message);
    output.scrollTop = output.scrollHeight;
  }

  function finishWorker(nextStatus) {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    if (worker) {
      worker.terminate();
      worker = null;
    }
    if (workerUrl) {
      URL.revokeObjectURL(workerUrl);
      workerUrl = null;
    }
    pendingInputId = null;
    inputForm.hidden = true;
    stopButton.disabled = true;
    status.textContent = nextStatus || "";
  }

  function stopExecution(showMessage) {
    if (!worker) return;
    finishWorker(languageStrings().stopped);
    if (showMessage) appendOutput(languageStrings().stopped);
  }

  function getDirectBlocks(area) {
    if (!area) return [];
    return Array.from(area.children).filter(child =>
      child.classList && child.classList.contains("dblock")
    );
  }

  function firstDirectTextarea(block, selector) {
    return Array.from(block.children).find(child =>
      child.tagName === "TEXTAREA" && (!selector || child.matches(selector))
    ) || null;
  }

  function fieldValue(textarea, usePlaceholder) {
    if (!textarea) return "";
    const value = String(textarea.value || "").trim();
    if (value) return value;
    return usePlaceholder ? String(textarea.placeholder || "").trim() : "";
  }

  function displayName(block) {
    if (block.classList.contains("input-block")) return "demande";
    if (block.classList.contains("decision-two")) return "alternative";
    if (block.classList.contains("for-loop")) return "pour";
    if (block.classList.contains("repeatwhile")) return "jusqu’à";
    if (block.classList.contains("iteration")) return "tant que";
    if (block.classList.contains("decision")) return "sélection";
    if (block.classList.contains("parallel")) return "traitement parallèle";
    if (block.classList.contains("begin-end")) return "boucle sans fin";
    const text = firstDirectTextarea(block);
    return text ? fieldValue(text, true) : "bloc";
  }

  function makeError(block, message, number) {
    const prefix = "Bloc " + number + " (« " + displayName(block) + " ») : ";
    return new Error(prefix + message);
  }

  const reservedWords = new Set((
    "await break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield enum implements interface package private protected public static null true false"
  ).split(/\s+/));

  function registerVariable(name, block, number) {
    if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
      throw makeError(block, "nom de variable invalide « " + name + " ». Utilise des lettres non accentuées, des chiffres et _.", number);
    }
    if (reservedWords.has(name) || name.indexOf("__nsd") === 0) {
      throw makeError(block, "« " + name + " » est réservé et ne peut pas servir de variable.", number);
    }
    return name;
  }

  function tokenizeExpression(source) {
    const tokens = [];
    let index = 0;
    while (index < source.length) {
      const char = source[index];
      if (/\s/.test(char)) {
        index += 1;
        continue;
      }

      if (char === '"' || char === "'") {
        const quote = char;
        index += 1;
        let value = "";
        let closed = false;
        while (index < source.length) {
          const current = source[index++];
          if (current === quote) {
            closed = true;
            break;
          }
          if (current === "\\") {
            if (index >= source.length) throw new Error("chaîne de caractères incomplète.");
            const escaped = source[index++];
            const escapes = { n: "\n", r: "\r", t: "\t", "\\": "\\", "\"": "\"", "'": "'" };
            value += Object.prototype.hasOwnProperty.call(escapes, escaped) ? escapes[escaped] : escaped;
          } else {
            value += current;
          }
        }
        if (!closed) throw new Error("guillemet non fermé.");
        tokens.push({ type: "value", value: JSON.stringify(value) });
        continue;
      }

      const numberMatch = source.slice(index).match(/^(?:\d+(?:[.,]\d*)?|[.,]\d+)/);
      if (numberMatch) {
        tokens.push({ type: "value", value: numberMatch[0].replace(",", ".") });
        index += numberMatch[0].length;
        continue;
      }

      const identifierMatch = source.slice(index).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
      if (identifierMatch) {
        const word = identifierMatch[0];
        const lower = word.toLowerCase();
        const wordOperators = {
          mod: "%", and: "&&", et: "&&", und: "&&",
          or: "||", ou: "||", oder: "||",
          not: "!", non: "!", nicht: "!",
          vrai: "true", true: "true", wahr: "true",
          faux: "false", false: "false", falsch: "false"
        };
        if (Object.prototype.hasOwnProperty.call(wordOperators, lower)) {
          tokens.push({ type: "operator", value: wordOperators[lower] });
        } else {
          tokens.push({ type: "identifier", value: word });
        }
        index += word.length;
        continue;
      }

      const operatorMatch = source.slice(index).match(/^(?:<=|>=|==|!=|<>|&&|\|\||[()+\-*/%^<>!=])/);
      if (operatorMatch) {
        let operator = operatorMatch[0];
        if (operator === "=" || operator === "==") operator = "===";
        if (operator === "!=" || operator === "<>") operator = "!==";
        if (operator === "^") operator = "**";
        tokens.push({ type: "operator", value: operator });
        index += operatorMatch[0].length;
        continue;
      }

      throw new Error("caractère non pris en charge « " + char + " ».");
    }
    tokens.push({ type: "eof", value: "" });
    return tokens;
  }

  function parseExpression(source) {
    const tokens = tokenizeExpression(source);
    let position = 0;
    const precedence = {
      "||": 1, "&&": 2, "===": 3, "!==": 3,
      "<": 4, "<=": 4, ">": 4, ">=": 4,
      "+": 5, "-": 5, "*": 6, "/": 6, "%": 6, "**": 7
    };
    const current = () => tokens[position];
    const consume = () => tokens[position++];

    function parsePrimary() {
      const token = consume();
      if (token.type === "value" || token.type === "identifier") return token.value;
      if (token.value === "(") {
        const value = parseBinary(0);
        if (current().value !== ")") throw new Error("parenthèse fermante manquante.");
        consume();
        return "(" + value + ")";
      }
      throw new Error("expression incomplète.");
    }

    function parseUnary() {
      if (["!", "-", "+"].includes(current().value)) {
        const operator = consume().value;
        return "(" + operator + parseUnary() + ")";
      }
      return parsePrimary();
    }

    function parseBinary(minimumPrecedence) {
      let left = parseUnary();
      while (current().type === "operator" && Object.prototype.hasOwnProperty.call(precedence, current().value) &&
        precedence[current().value] >= minimumPrecedence) {
        const operator = consume().value;
        const level = precedence[operator];
        const right = parseBinary(level + (operator === "**" ? 0 : 1));
        left = "(" + left + " " + operator + " " + right + ")";
      }
      return left;
    }

    const result = parseBinary(0);
    if (current().type !== "eof") throw new Error("élément inattendu « " + current().value + " ».");
    return result;
  }

  function parseStatement(source, block, number, context) {
    const statement = source.trim();
    if (!statement) return "";

    const displayMatch = statement.match(/^(?:affiche|print|anzeigen)\b\s*(.*)$/i);
    if (displayMatch) {
      if (!displayMatch[1]) throw makeError(block, "il manque la valeur à afficher.", number);
      try {
        return "await __display(" + parseExpression(displayMatch[1]) + ");";
      } catch (error) {
        throw makeError(block, "expression à afficher invalide : " + error.message, number);
      }
    }

    const waitMatch = statement.match(/^attendre\s+(.+?)(?:\s+(ms|millisecondes?|milliseconds?|s|secondes?|seconds?))?(?:\s+(?:à|to)\s+.*)?$/i);
    if (waitMatch) {
      try {
        const divisor = /^(?:ms|millisecondes?|milliseconds?)$/i.test(waitMatch[2] || "") ? 1000 : 1;
        const duration = parseExpression(waitMatch[1]);
        return "await __sleep((" + duration + ") / " + divisor + ");";
      } catch (error) {
        throw makeError(block, "durée d’attente invalide : " + error.message, number);
      }
    }

    const assignmentMatch = statement.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?![=>])(.+)$/);
    if (assignmentMatch) {
      const name = registerVariable(assignmentMatch[1], block, number);
      context.variables.add(name);
      try {
        return name + " = " + parseExpression(assignmentMatch[2]) + ";";
      } catch (error) {
        throw makeError(block, "expression d’affectation invalide : " + error.message, number);
      }
    }

    throw makeError(block, "instruction non reconnue. Utilise une affectation, affiche/print/anzeigen ou attendre.", number);
  }

  function sequence(area, context) {
    return getDirectBlocks(area).map(block => compileBlock(block, context)).filter(Boolean).join("\n");
  }

  function conditionValue(block, context, number) {
    const field = firstDirectTextarea(block, ":not(.decision-two-ta)");
    const value = fieldValue(field, false);
    if (!value) throw makeError(block, "la condition est vide.", number);
    try {
      return parseExpression(value);
    } catch (error) {
      throw makeError(block, "condition invalide : " + error.message, number);
    }
  }

  function compileBlock(block, context) {
    const number = ++context.blockNumber;
    try {
      if (block.classList.contains("process") || block.classList.contains("decision-item") ||
          block.classList.contains("parallel-item")) {
        const field = firstDirectTextarea(block);
        const instruction = fieldValue(field, false);
        return parseStatement(instruction, block, number, context);
      }

      if (block.classList.contains("input-block")) {
        const nameField = block.querySelector(":scope > .input-block-fields > textarea.input-name");
        const commandField = block.querySelector(":scope > .input-block-fields > textarea.input-command");
        const variable = registerVariable(fieldValue(nameField, false), block, number);
        const command = fieldValue(commandField, true);
        const promptMatch = command.match(/^(?:demande|prompt|frage)\s*\(([\s\S]*)\)$/i);
        if (!promptMatch) throw makeError(block, "l’appel doit utiliser demande(\"…\"), prompt(\"…\") ou frage(\"…\").", number);
        context.variables.add(variable);
        let promptExpression;
        try {
          promptExpression = parseExpression(promptMatch[1] || "\"\"");
        } catch (error) {
          throw makeError(block, "texte de demande invalide : " + error.message, number);
        }
        return variable + " = await __ask(" + promptExpression + ");";
      }

      if (block.classList.contains("for-loop")) {
        const variableField = block.querySelector(":scope > .for-header textarea.for-variable");
        const startField = block.querySelector(":scope > .for-header textarea.for-start");
        const endField = block.querySelector(":scope > .for-header textarea.for-end");
        const variable = registerVariable(fieldValue(variableField, true), block, number);
        const startText = fieldValue(startField, true);
        const endText = fieldValue(endField, true);
        if (!startText || !endText) throw makeError(block, "les valeurs de début et de fin sont nécessaires.", number);
        let startExpression;
        let endExpression;
        try {
          startExpression = parseExpression(startText);
          endExpression = parseExpression(endText);
        } catch (error) {
          throw makeError(block, "valeur de boucle invalide : " + error.message, number);
        }
        context.variables.add(variable);
        const id = ++context.loopId;
        const startName = "__nsdStart" + id;
        const endName = "__nsdEnd" + id;
        const stepName = "__nsdStep" + id;
        const bodyArea = block.querySelector(":scope > .droparea.drop-iteration");
        const body = sequence(bodyArea, context);
        return "{\n" +
          "  const " + startName + " = " + startExpression + ";\n" +
          "  const " + endName + " = " + endExpression + ";\n" +
          "  const " + stepName + " = " + startName + " <= " + endName + " ? 1 : -1;\n" +
          "  " + variable + " = " + startName + ";\n" +
          "  for (; " + stepName + " > 0 ? " + variable + " <= " + endName + " : " + variable + " >= " + endName + "; " + variable + " += " + stepName + ") {\n" +
          "    __guard();\n" + indent(body, 4) + "\n" +
          "  }\n" +
          "}";
      }

      if (block.classList.contains("iteration") && !block.classList.contains("for-loop")) {
        const condition = conditionValue(block, context, number);
        const bodyArea = block.querySelector(":scope > .droparea.drop-iteration");
        const body = sequence(bodyArea, context);
        return "while (" + condition + ") {\n  __guard();\n" + indent(body, 2) + "\n}";
      }

      if (block.classList.contains("repeatwhile")) {
        const condition = conditionValue(block, context, number);
        const bodyArea = block.querySelector(":scope > .droparea.drop-repeatwhile");
        const body = sequence(bodyArea, context);
        return "do {\n  __guard();\n" + indent(body, 2) + "\n} while (!(" + condition + "));";
      }

      if (block.classList.contains("begin-end")) {
        const bodyArea = block.querySelector(":scope > .droparea.drop-begin-end, :scope > .droparea.drop-before-end");
        const body = sequence(bodyArea, context);
        return "while (true) {\n  __guard();\n" + indent(body, 2) + "\n}";
      }

      if (block.classList.contains("decision-two")) {
        const condition = conditionValue(block, context, number);
        const branches = Array.from(block.querySelectorAll(":scope > .decision-branches > .decision-branch"));
        if (branches.length !== 2) throw makeError(block, "l’alternative doit contenir deux branches.", number);
        const trueBody = sequence(branches[0].querySelector(":scope > .droparea"), context);
        const falseBody = sequence(branches[1].querySelector(":scope > .droparea"), context);
        return "if (" + condition + ") {\n" + indent(trueBody, 2) + "\n} else {\n" + indent(falseBody, 2) + "\n}";
      }

      if (block.classList.contains("decision") && !block.classList.contains("parallel")) {
        const selectorField = firstDirectTextarea(block);
        const selector = fieldValue(selectorField, false);
        if (!selector) throw makeError(block, "l’expression de sélection est vide.", number);
        let selectorExpression;
        try {
          selectorExpression = parseExpression(selector);
        } catch (error) {
          throw makeError(block, "expression de sélection invalide : " + error.message, number);
        }
        const branches = Array.from(block.querySelectorAll(":scope > .decision-branches > .decision-branch"));
        if (!branches.length) throw makeError(block, "aucune branche n’est définie.", number);
        const cases = [];
        let hasDefault = false;
        branches.forEach(branch => {
          const labelField = branch.querySelector(":scope > textarea");
          const label = fieldValue(labelField, true);
          const lower = label.toLowerCase();
          const body = sequence(branch.querySelector(":scope > .droparea"), context);
          if (["défaut", "default", "standard", "sonst"].includes(lower)) {
            if (hasDefault) throw makeError(block, "une seule branche par défaut est autorisée.", number);
            hasDefault = true;
            cases.push("default:\n" + indent(body, 2) + "\n  break;");
          } else {
            try {
              cases.push("case " + parseExpression(label) + ":\n" + indent(body, 2) + "\n  break;");
            } catch (error) {
              throw makeError(block, "libellé de branche invalide « " + label + " ».", number);
            }
          }
        });
        return "switch (" + selectorExpression + ") {\n" + indent(cases.join("\n"), 2) + "\n}";
      }

      if (block.classList.contains("parallel")) {
        const branchesContainer = block.querySelector(":scope > .decision-branches");
        const branches = branchesContainer
          ? Array.from(branchesContainer.querySelectorAll(":scope > .decision-branch"))
          : [];
        if (!branches.length) throw makeError(block, "aucune branche parallèle n’est définie.", number);
        context.warnings.push(languageStrings().parallelWarning);
        const tasks = branches.map(branch => {
          const area = branch.querySelector(":scope > .droparea");
          return "(async () => {\n" + indent(sequence(area, context), 2) + "\n})()";
        });
        return "await Promise.all([\n" + indent(tasks.join(",\n"), 2) + "\n]);";
      }

      throw makeError(block, "type de bloc non pris en charge.", number);
    } catch (error) {
      if (/^Bloc \d+/.test(error.message)) throw error;
      throw makeError(block, error.message, number);
    }
  }

  function indent(source, spaces) {
    if (!source) return " ".repeat(spaces) + "// branche vide";
    const prefix = " ".repeat(spaces);
    return source.split("\n").map(line => prefix + line).join("\n");
  }

  function compileProgram() {
    const root = document.getElementById("rblock");
    const mainArea = root.querySelector(":scope > .droparea.drop-before-end");
    const context = { variables: new Set(), blockNumber: 0, loopId: 0, warnings: [] };
    const body = sequence(mainArea, context).trim();
    if (!body) throw new Error(languageStrings().empty);
    const declarations = context.variables.size
      ? "  let " + Array.from(context.variables).join(", ") + ";\n"
      : "";
    const javascript = "async function main() {\n" +
      declarations +
      (body ? indent(body, 2) : "") +
      "\n}\n\nmain().then(() => postMessage({ type: \"done\" })).catch(error => {\n" +
      "  postMessage({ type: \"error\", message: error && error.message ? error.message : String(error) });\n" +
      "});";
    return { javascript, warnings: context.warnings };
  }

  function workerSource(javascript) {
    return [
      "const __pendingInputs = new Map();",
      "let __inputSequence = 0;",
      "let __stepCount = 0;",
      "self.onmessage = event => {",
      "  const data = event.data || {};",
      "  if (data.type === 'input-result' && __pendingInputs.has(data.id)) {",
      "    const resolve = __pendingInputs.get(data.id);",
      "    __pendingInputs.delete(data.id);",
      "    resolve(String(data.value == null ? '' : data.value));",
      "  }",
      "};",
      "function __guard() {",
      "  __stepCount += 1;",
      "  if (__stepCount > 100000) throw new Error(" + JSON.stringify(languageStrings().loopLimit) + ");",
      "}",
      "function __display(value) { postMessage({ type: 'output', text: String(value) }); }",
      "function __ask(promptText) {",
      "  const id = ++__inputSequence;",
      "  return new Promise(resolve => {",
      "    __pendingInputs.set(id, resolve);",
      "    postMessage({ type: 'request-input', id, prompt: String(promptText) });",
      "  });",
      "}",
      "function __sleep(seconds) {",
      "  const duration = Number(seconds);",
      "  if (!Number.isFinite(duration) || duration < 0) throw new Error('Invalid wait duration.');",
      "  return new Promise(resolve => setTimeout(resolve, Math.min(duration * 1000, 30000)));",
      "}",
      javascript
    ].join("\n");
  }

  function startExecution() {
    stopExecution(false);
    panel.hidden = false;
    output.textContent = "";
    generatedCode.textContent = "";
    status.textContent = "";
    updateLabels();

    let compiled;
    try {
      compiled = compileProgram();
    } catch (error) {
      status.textContent = "Erreur";
      output.textContent = error.message;
      return;
    }

    generatedCode.textContent = compiled.javascript;
    compiled.warnings.forEach(warning => appendOutput("⚠ " + warning));

    try {
      const blob = new Blob([workerSource(compiled.javascript)], { type: "text/javascript" });
      workerUrl = URL.createObjectURL(blob);
      worker = new Worker(workerUrl);
    } catch (error) {
      status.textContent = "Erreur";
      appendOutput("Impossible de démarrer l’environnement isolé : " + error.message);
      finishWorker("");
      return;
    }

    status.textContent = languageStrings().running;
    stopButton.disabled = false;
    timeoutHandle = setTimeout(() => {
      if (!worker) return;
      finishWorker(languageStrings().timeout);
      appendOutput(languageStrings().timeout);
    }, 10000);

    worker.onmessage = event => {
      const data = event.data || {};
      if (data.type === "output") {
        appendOutput(data.text);
      } else if (data.type === "request-input") {
        pendingInputId = data.id;
        inputLabel.textContent = String(data.prompt || languageStrings().input);
        inputValue.value = "";
        inputForm.hidden = false;
        inputValue.focus();
      } else if (data.type === "done") {
        finishWorker(languageStrings().done);
      } else if (data.type === "error") {
        finishWorker("Erreur");
        appendOutput("Erreur : " + data.message);
      }
    };
    worker.onerror = event => {
      finishWorker("Erreur");
      appendOutput("Erreur JavaScript : " + (event.message || "erreur inconnue"));
    };
  }

  playButton.addEventListener("click", startExecution);
  runButton.addEventListener("click", startExecution);
  stopButton.addEventListener("click", () => stopExecution(true));
  closeButton.addEventListener("click", () => {
    stopExecution(false);
    panel.hidden = true;
  });

  inputForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!worker || pendingInputId === null) return;
    worker.postMessage({ type: "input-result", id: pendingInputId, value: inputValue.value });
    pendingInputId = null;
    inputForm.hidden = true;
  });

  inputCancel.addEventListener("click", () => {
    if (!worker || pendingInputId === null) return;
    worker.postMessage({ type: "input-result", id: pendingInputId, value: "" });
    pendingInputId = null;
    inputForm.hidden = true;
  });

  document.getElementById("lang-select").addEventListener("change", updateLabels);
  updateLabels();
})();