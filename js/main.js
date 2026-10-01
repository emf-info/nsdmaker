
/**
 *
 * @licstart  The following is the entire license notice for the 
 *  JavaScript code in this page.
 *
 * Copyright (C) 2023 Yannis Charalambidis
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 *
 * @licend  The above is the entire license notice
 * for the JavaScript code in this page.
 *
 */


let undoList = [];
let redoList = [];

function undo() {
  resetSelectedElement();
  if (undoList.length == 0) {
    return;
  }

  pushToRedo();
  setFromUndo();
}

function printHistory() {
  console.log("UNDO LIST", undoList);
  console.log("REDO LIST", redoList);
}

function redo() {
  resetSelectedElement();
  if (redoList.length == 0) {
    return;
  }

  pushToUndo();
  setFromRedo();
}

function pushToUndo() {
  let r = document.getElementById("rblock");
  undoList.push(r.cloneNode(true));
}

function pushToRedo() {
  let r = document.getElementById("rblock");
  redoList.push(r.cloneNode(true));
}

function setFromUndo() {
  let el = undoList[undoList.length - 1];
  let or = document.getElementById("canvas");
  or.innerHTML = '';
  or.appendChild(el);

  undoList.pop();

  let dr = document.getElementById("rblock").lastElementChild;
  if (dr.children.length == 0) {
    setDropareaDefaultColor(dr);
  }
}

function setFromRedo() {
  let el = redoList[redoList.length - 1];
  let or = document.getElementById("canvas");
  or.innerHTML = '';
  or.appendChild(el);

  redoList.pop();
}

function clrCanvas() {
  // document.getElementById("rblock").getElementsByClassName("drop-before-end")[0].innerHTML = '';
  let canvas = document.getElementById("canvas");
  canvas.innerHTML = '<div id="rblock" class="dblock program"><textarea rows="1" placeholder="Program" ondrop="return false;" oninput="textareaResize(event);"></textarea><div class="droparea drop-before-end" ondrop="drop(event)" ondragover="allowDrop(event)" ondragenter="dragEnter(event)" ondragleave="dragLeave(event)"></div></div>';
}

function clearCanvas() {
  resetSelectedElement();
  undoList = [];
  redoList = [];

  let msg = (translations[currentLang] && translations[currentLang].confirm_clear) || "Unsaved changes will be lost.";
  if (confirm(msg)) {
    clrCanvas();
  }
}

document.addEventListener('keydown', function(event) {
  if (event.ctrlKey && event.code == "Delete") {
    event.preventDefault();
    clearCanvas();
  } else if (event.key == "Delete") { // DELETE
    event.preventDefault();
    removeElement();
  }
  if (event.ctrlKey && (event.key === "z" || event.key === "Z"))  { // CTRL Z
    event.preventDefault();
    undo();
  }
  if (event.ctrlKey && (event.key === "y" || event.key === "Y")) { // CTRL Y
    event.preventDefault();
    redo();
  }
  if (event.ctrlKey && (event.key === "o" || event.key === "O")) { // CTRL O
    event.preventDefault();
    upload();
  }
  if (event.ctrlKey && (event.key === "s" || event.key === "S")) { // CTRL S
    event.preventDefault();
    save();
  }
  if (event.ctrlKey && (event.key === "a" || event.key === "A")) { // CTRL A
    event.preventDefault();
    centerCanvas();
  }
  if (event.ctrlKey && (event.key === "p" || event.key === "P")) { // CTRL P
    event.preventDefault();
    printContent();
  }
  if (event.ctrlKey && (event.key === "e" || event.key === "E")) { // CTRL E
    event.preventDefault();
    getImage();
  }

});


setAllTriangles();

let isSpacePressed = false;
let isCustomPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartTransformX = 0;
let panStartTransformY = 0;

document.addEventListener("keydown", function(e) {
  if (e.code === "Space" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "INPUT") {
    isSpacePressed = true;
    document.body.style.cursor = "grab";
    e.preventDefault();
  }
});

document.addEventListener("keyup", function(e) {
  if (e.code === "Space") {
    isSpacePressed = false;
    if (!isCustomPanning) {
      document.body.style.cursor = "";
    }
  }
});

document.addEventListener("mousedown", function(e) {
  // Middle mouse button (button 1) OR Space + Left click (button 0)
  if (e.button === 1 || (isSpacePressed && e.button === 0)) {
    if (document.activeElement && document.activeElement.tagName === "TEXTAREA") {
      document.activeElement.blur();
    }
    isCustomPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    if (instance) {
      let currentTransform = instance.getTransform();
      panStartTransformX = currentTransform.x;
      panStartTransformY = currentTransform.y;
    }
    document.body.style.cursor = "grabbing";
    e.preventDefault();
  }
});

document.addEventListener("mousemove", function(e) {
  if (isCustomPanning && instance) {
    let dx = e.clientX - panStartX;
    let dy = e.clientY - panStartY;
    instance.moveTo(panStartTransformX + dx, panStartTransformY + dy);
    e.preventDefault();
  }
});

document.addEventListener("mouseup", function(e) {
  if (isCustomPanning) {
    isCustomPanning = false;
    document.body.style.cursor = isSpacePressed ? "grab" : "";
  }
});

var canvas = document.getElementById("canvas");

let instance = panzoom(canvas, {
  maxZoom: 2,
  minZoom: 0.3,
  zoomDoubleClickSpeed: 1,
  smoothScroll: false,
  beforeMouseDown: function(e) {
    // allow mouse-down panning only if altKey is down. Otherwise - ignore
    var shouldIgnore = !e.altKey;
    return shouldIgnore;
  },
  beforeWheel: function(e) {
    // allow wheel-zoom only if altKey is down. Otherwise - ignore
    var shouldIgnore = !e.altKey;
    return shouldIgnore;
  },
  filterKey: function(/* e, dx, dy, dz */) {
    return true;
  }
});

let origin = instance.getTransformOrigin();

function centerCanvas() {
  if (instance) {
    instance.moveTo(0, 0);
    instance.zoomAbs(0, 0, 1);
  }
}

function zoomInCanvas() {
  if (instance) {
    let transform = instance.getTransform();
    let newScale = Math.min(2, transform.scale * 1.25);
    instance.zoomAbs(window.innerWidth / 2, window.innerHeight / 2, newScale);
  }
}

function zoomOutCanvas() {
  if (instance) {
    let transform = instance.getTransform();
    let newScale = Math.max(0.3, transform.scale / 1.25);
    instance.zoomAbs(window.innerWidth / 2, window.innerHeight / 2, newScale);
  }
}

lastDrop = Date.now()

/*
function resetColors(target) {

  if (target.classList.contains("drop-before-begin") ||
    target.classList.contains("dinput") ||
    target.classList.contains("drop-before-end")) {
    target.style.backgroundColor = "transparent";
  } else {
    target.style.backgroundColor = "white";
  }

  if (target.classList.contains("drop-before-end") && target.classList.contains("droparea")) {
    darea = target.getElementsByClassName("droparea")[0];
    console.log(darea);
    if (darea.children.length === 0) {
      console.log(target);
      darea.style.borderColor = "#7f7f7f";
    } else {
      darea.style.borderColor = "white";
    }

  }

}

*/


function setDropareaDefaultColor(dr) {
  if (dr == null) {
    return;
  }

  if (dr.classList.contains("droparea")) {
    if (dr.classList.contains("drop-before-begin")) {
      dr.style.backgroundColor = "transparent";
    } else {
      dr.style.backgroundColor = "white";
    }
    dr.style.borderColor = "#7f7f7f";

  }
}

function setDropareaSelectedColor(dr) {
  if (dr == null) {
    return;
  }

  if (!isElementInRblock(dr)) {
    return false;
  }

  if (dr.classList.contains("droparea")) {
    dr.style.backgroundColor = "red";
    dr.style.borderColor = "red";
  }
}

/*
function setDropBeforeEndTransparent(dr) {
  if (dr == null) {
    return;
  }

  if (dr.classList.contains("droparea")) {
    dr.style.backgroundColor = "white";
    dr.style.borderColor = "#7f7f7f";
  }
} */


function setDBE(dr) {
  if (dr == null) {
    return false;
  }

  if (!isElementInRblock(dr)) {
    return false;
  }


  let dbe = getDropBeforeEnd(dr);
  if (dbe == null) {
    return false;
  }

  dbe.style.backgroundColor = "red";
  dbe.style.borderColor = "red";
  dbe.style.paddingBottom = "2rem";


}

function unsetDBE(dr) {
  if (dr == null) {
    return false;
  }


  let dbe = getDropBeforeEnd(dr);
  if (dbe == null) {
    return false;
  }

  dbe.style.backgroundColor = "white";
  dbe.style.borderColor = "#7f7f7f";
  dbe.style.paddingBottom = "";
  return true;
}

function dragEnter(ev) {
  if (!isElementInRblock(ev.target)) {
    setDropareaDefaultColor(ev.target);
    return;
  }

  if (!setDBE(ev.target) && ev.target.classList.contains("droparea")) {
    setDropareaSelectedColor(ev.target);
  }


}

function dragLeave(ev) {
  if (!isElementInRblock(ev.target)) {
    setDropareaDefaultColor(ev.target);
    return;
  }

  if (!unsetDBE(ev.target) && ev.target.classList.contains("droparea")) {
    setDropareaDefaultColor(ev.target);
  }

  // If drop-before-end is empty
  /*if (ev.target.children.length === 0 && ev.target.classList.contains("drop-before-end")) {
    setDropareaDefaultColor(ev.target);
  } else {
    setDropBeforeEndTransparent(ev.target);
  }*/

}

function allowDrop(ev) {
  if (!isElementInRblock(ev.target)) {
    return;
  }
  setDBE(ev.target);

  ev.preventDefault();
}

let draggedBlock = null;
let draggedFromProgram = false;
let armedDragBlock = null;

function ensureProgramDragHandles(root = document) {
  root.querySelectorAll("#rblock .dblock:not(#rblock)").forEach(block => {
    if (block.querySelector(":scope > .drag-handle")) return;
    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "↕";
    handle.title = "Déplacer ce bloc";
    handle.setAttribute("aria-label", "Déplacer ce bloc");
    handle.draggable = true;
    block.insertBefore(handle, block.firstChild);
  });
}

ensureProgramDragHandles();
new MutationObserver(() => ensureProgramDragHandles()).observe(
  document.getElementById("canvas"),
  { childList: true, subtree: true }
);

// In the program, a block can only be picked up from its visible handle.
// Sidebar blocks remain draggable from anywhere.
document.addEventListener("mousedown", function(event) {
  armedDragBlock = null;
  if (event.button !== 0) return;

  const handle = event.target.closest ? event.target.closest("#rblock .drag-handle") : null;
  if (!handle) return;

  const block = handle.closest(".dblock");
  if (block && block.id !== "rblock") armedDragBlock = block;
});

function drag(ev) {
  const block = ev.target.closest ? ev.target.closest(".dblock") : ev.target;
  if (!block || block.id === "rblock") {
    ev.preventDefault();
    return;
  }

  // Sidebar blocks are palette templates and should be copied into the program.
  // In-program blocks can only be dragged from their visible handle.
  draggedFromProgram = isElementInRblock(block);
  if (draggedFromProgram && (armedDragBlock !== block || !ev.target.closest(".drag-handle"))) {
    ev.preventDefault();
    return;
  }
  draggedBlock = draggedFromProgram ? block : null;
  ev.dataTransfer.effectAllowed = draggedFromProgram ? "move" : "copy";
  const serializedBlock = block.cloneNode(true);
  serializedBlock.querySelectorAll(".drag-handle").forEach(handle => handle.remove());
  ev.dataTransfer.setData("text/plain", serializedBlock.outerHTML);
}

function drop(ev) {
  if (!isElementInRblock(ev.target)) {
    return;
  }
  ev.preventDefault();
  if (draggedFromProgram && draggedBlock && (ev.target === draggedBlock || draggedBlock.contains(ev.target))) {
    return;
  }

  d = Date.now()
  if (d - lastDrop < 1000) {
    return;
  }
  lastDrop = d;


  target = ev.target;

  let dbe = getDropBeforeEnd(ev.target);
  if (dbe != null) {
    target = dbe;
  }

  if (target.classList.contains("droparea") && target.tagName != "input") {
    setDropareaDefaultColor(target);
    target.style.borderColor = "transparent";

    redoList = [];
    pushToUndo();

    var data = ev.dataTransfer.getData("text/plain");

    let newNode = null;

    if (target.classList.contains("drop-before-begin")) {
      target.parentElement.insertAdjacentHTML('beforebegin', data);
      newNode = target.parentElement.previousSibling;
    } else {
      target.insertAdjacentHTML('beforeend', data);
      newNode = target.lastChild;
    }

    if (newNode.nodeName == "#text") {
      setDropareaDefaultColor(newNode.parentElement);
      setFromUndo();
      newNode.remove();
    } else {
      // Move existing program blocks instead of leaving a duplicate behind.
      if (draggedFromProgram && draggedBlock && draggedBlock !== newNode && draggedBlock.isConnected) {
        const sourceArea = draggedBlock.parentElement;
        if (sourceArea && sourceArea.classList.contains("droparea") && sourceArea.children.length === 1) {
          setDropareaDefaultColor(sourceArea);
        }
        draggedBlock.remove();
        draggedBlock = null;
        draggedFromProgram = false;
      }

      if (newNode.classList.contains("decision-item")) {
        setFromUndo();
        newNode.remove();
      }

      if (newNode.classList.contains("parallel-item")) {
        setFromUndo();
        newNode.remove();
      }

      if (target.classList.contains("decision")) {
        setDecisionTriangle(target);
      }
    }


    unselectAllElementsFromDroparea(target);



  }


  unsetDBE(dbe);
  setAllTriangles();
}

document.addEventListener("dragend", function() {
  draggedBlock = null;
  draggedFromProgram = false;
  armedDragBlock = null;
});

function decisionDrop(ev) {
  if (!isElementInRblock(ev.target)) {
    return;
  }

  setDropareaDefaultColor(ev.target);
  unselectAllElementsFromDroparea(ev.target);
  unsetDBE(ev.target);
  ev.preventDefault();

  // Special drop zones add branches from the sidebar. Existing program blocks
  // are moved through normal drop areas instead.
  if (draggedFromProgram) return;

  d = Date.now()
  if (d - lastDrop < 1000) {
    return;
  }
  lastDrop = d;

  var data = ev.dataTransfer.getData("text/plain");

  let parent = getParentDBlock(ev.target);

  if (parent.classList.contains("decision")) {
    let dNode = document.createElement("div");
    dNode.insertAdjacentHTML('beforeend', data);

    let newNode = dNode.firstElementChild;

    if (newNode.classList.contains("decision-item")) {
      let lastBranch = parent.getElementsByClassName("decision-branches")[0].lastElementChild;
      let copy = lastBranch.cloneNode(true);
      copy.lastElementChild.innerHTML = '';
      copy.firstElementChild.value = '';
      copy.firstElementChild.placeholder = "Default";
      console.log(copy);
      lastBranch.after(copy);

    }

    newNode.remove();
  }

  setAllTriangles();
}

function parallelDrop(ev) {
  setDropareaDefaultColor(ev.target);
  unselectAllElementsFromDroparea(ev.target);
  unsetDBE(ev.target);
  ev.preventDefault();

  // Special drop zones add branches from the sidebar. Existing program blocks
  // are moved through normal drop areas instead.
  if (draggedBlock) return;

  d = Date.now()
  if (d - lastDrop < 1000) {
    return;
  }
  lastDrop = d;

  var data = ev.dataTransfer.getData("text/plain");

  let parent = getParentDBlock(ev.target);

  if (parent.classList.contains("parallel")) {
    let dNode = document.createElement("div");
    dNode.insertAdjacentHTML('beforeend', data);

    let newNode = dNode.firstElementChild;

    if (newNode.classList.contains("parallel-item")) {
      let lastBranch = parent.getElementsByClassName("decision-branches")[0].lastElementChild;
      let copy = lastBranch.cloneNode(true);
      copy.firstElementChild.innerHTML = '';
      lastBranch.after(copy);

    }

    newNode.remove();
  }

}

function setAllTextareaValuesToPlaceholder() {
  let tareas = document.getElementsByTagName("textarea");

  for (let i = 0; i < tareas.length; ++i) {
    if (tareas[i].value == '') {
      tareas[i].value = tareas[i].placeholder;
    }
  }
}

function setAllTextareaValuesToEmptyIfNoValue() {
  let tareas = document.getElementsByTagName("textarea");

  for (let i = 0; i < tareas.length; ++i) {
    if (tareas[i].value == tareas[i].placeholder) {
      tareas[i].value = '';
    }
  }
}

function hideParallelLines() {
  let top = document.getElementsByClassName("parallel-top");
  let bottom = document.getElementsByClassName("parallel-bottom");

  for (let i = 0; i < top.length; ++i) {
    top[i].querySelector("div:first-child").style.display = "none";
    top[i].querySelector("div:last-child").style.display = "none";
  }

  for (let i = 0; i < bottom.length; ++i) {
    bottom[i].querySelector("div:first-child").style.display = "none";
    bottom[i].querySelector("div:last-child").style.display = "none";
  }

}

function showParallelLines() {
  let top = document.getElementsByClassName("parallel-top");
  let bottom = document.getElementsByClassName("parallel-bottom");

  for (let i = 0; i < top.length; ++i) {
    top[i].querySelector("div:first-child").style.display = "block";
    top[i].querySelector("div:last-child").style.display = "block";
  }

  for (let i = 0; i < bottom.length; ++i) {
    bottom[i].querySelector("div:first-child").style.display = "block";
    bottom[i].querySelector("div:last-child").style.display = "block";
  }
}


function getImage() {
  resetSelectedElement();
  document.getElementById("png").disabled = true;
  instance.on('zoomend', function(e) {
    setAllTextareaValuesToPlaceholder();
    html2canvas(document.querySelector("#rblock")).then(canvas => {
      let rootElement = document.getElementById("rblock");

      let filename = rootElement.querySelector("textarea").value;
      if (filename === '') {
        filename = "diagram";
      }

      var img = canvas.toDataURL("image/png");

      var link = document.createElement('a');
      link.download = filename + '.png';
      link.href = img;

      link.click();

      setAllTextareaValuesToEmptyIfNoValue();
      /* showParallelLines(); */
      document.getElementById("png").disabled = false;
    });
  });


  instance.moveTo(0, 0);
  instance.smoothZoom(0, 0, 100);


  instance.on('zoomend', function(e) { });
}

function setAllTriangles() {
  t = document.getElementsByClassName("triangles");

  for (let i = 0; i < t.length; ++i) {

    let leftLine = t[i].lastElementChild;
    let rightLine = t[i].firstElementChild;
    let branches = t[i].nextElementSibling;
    let lastBranch = t[i].nextElementSibling.lastElementChild;

    let newLeftLineWidth = (lastBranch.clientWidth / branches.clientWidth) * 100;
    leftLine.style.width = newLeftLineWidth + '%';
    rightLine.style.width = (100 - newLeftLineWidth) + '%';
  }
}

function setAllTrianglesZero() {
  t = document.getElementsByClassName("triangles");

  for (let i = 0; i < t.length; ++i) {

    let leftLine = t[i].lastElementChild;
    let rightLine = t[i].firstElementChild;

    leftLine.style.width = 0 + '%';
    rightLine.style.width = 0 + '%';
  }

}

function setDecisionTriangleZero(newNode) {
  tr = [
    newNode.getElementsByClassName("trig1")[0],
    newNode.getElementsByClassName("trig2")[0],
    newNode.getElementsByClassName("trig3")[0],
    newNode.getElementsByClassName("trig4")[0]
  ];

  tr[0].style.borderRightWidth = 0;

  tr[1].style.borderRightWidth = 0;

  tr[2].style.borderLeftWidth = 0;

  tr[3].style.borderLeftWidth = 0;
}

function setDecisionTriangle(newNode) {
  tr = [
    newNode.getElementsByClassName("trig1")[0],
    newNode.getElementsByClassName("trig2")[0],
    newNode.getElementsByClassName("trig3")[0],
    newNode.getElementsByClassName("trig4")[0]
  ];


  let parentWidth = tr[0].parentElement.offsetWidth;
  let branches = tr[0].parentElement.parentElement.getElementsByClassName("decision-branches")[0].children;
  let lastBranch = branches[branches.length - 1];


  let lastBranchWidth = lastBranch.clientWidth;

  tr[0].style.borderLeftColor = "#7f7f7f";
  tr[0].style.borderBottomColor = "#7f7f7f7";
  tr[0].style.borderRightWidth = parentWidth - lastBranchWidth - 5;

  tr[1].style.top = "4px";
  tr[1].style.borderRightWidth = parentWidth - lastBranchWidth - 5;

  tr[2].style.top = "8px";
  tr[2].style.left = 0;
  tr[2].style.borderLeftWidth = lastBranchWidth - 5;

  tr[3].style.top = "5px";
  tr[3].style.borderLeftWidth = lastBranchWidth;
  tr[3].style.left = -lastBranchWidth;
  tr[3].style.borderBottomWidth = "37px";

}


function unselectAllElementsFromDroparea(element) {
  selectedElement = null;
  for (let i = 0; i < element.children.length; ++i) {
    element.children[i].style.backgroundColor = "white";
  }
}

var topIndex = 100;

var selectedElement = null

function isElementInRblock(element) {
  if (element.parentElement == null) {
    return false;
  }

  if (element.parentElement.id == "rblock") {
    return true;
  }
  return (isElementInRblock(element.parentElement));
}

function resetSelectedElement() {
  if (selectedElement != null) {
    selectedElement.style.backgroundColor = "";
  }

  selectedElement = null;
}

document.addEventListener("mousedown", (event) => {
  if (event.button !== 0 || isSpacePressed || isCustomPanning) {
    return;
  }

  if (event.target.tagName === "BUTTON") {
    return;
  }

  if (!isElementInRblock(event.target)) {
    resetSelectedElement();
    return;
  }

  if (event.target.tagName === "textarea") {
    return;
  }



  if (event.target.classList.contains("dblock")) {

    if (selectedElement != null) {
      selectedElement.style.backgroundColor = "";
    }

    selectedElement = event.target;
    selectedElement.style.backgroundColor = "#ffebeb";

  } else if (event.target.classList.contains("drop-before-begin")) {
    if (selectedElement != null) {
      selectedElement.style.backgroundColor = "";
    }

    selectedElement = event.target.parentElement;
    selectedElement.style.backgroundColor = "#ffebeb";

  }
});


let contextMenuTargetBlock = null;

document.addEventListener("contextmenu", function(event) {
  if (event.target.tagName === "BUTTON") {
    return;
  }

  if (!isElementInRblock(event.target)) {
    hideContextMenu();
    return;
  }

  event.preventDefault();

  let targetBlock = event.target.classList.contains("dblock") ? event.target : getParentDBlock(event.target);
  if (!targetBlock) {
    hideContextMenu();
    return;
  }

  contextMenuTargetBlock = targetBlock;

  if (selectedElement != null) {
    selectedElement.style.backgroundColor = "";
  }
  selectedElement = targetBlock;
  selectedElement.style.backgroundColor = "#ffebeb";

  showContextMenu(event.clientX, event.clientY, targetBlock);
});

function showContextMenu(x, y, block) {
  let menu = document.getElementById("context-menu");
  if (!menu) return;

  let removeBtn = menu.querySelector(".remove-item");
  if (removeBtn) {
    if (block.id === "rblock") {
      removeBtn.classList.add("disabled");
    } else {
      removeBtn.classList.remove("disabled");
    }
  }

  let selBranchItems = menu.querySelectorAll('[data-type="decision-item"]');
  let parBranchItems = menu.querySelectorAll('[data-type="parallel-item"]');

  let inDecision = (block.classList.contains("decision") && !block.classList.contains("parallel"))
    || (block.closest && block.closest(".decision:not(.parallel)") !== null);
  let inParallel = block.classList.contains("parallel")
    || (block.closest && block.closest(".parallel") !== null);

  selBranchItems.forEach(item => {
    if (inDecision) item.classList.remove("disabled");
    else item.classList.add("disabled");
  });

  parBranchItems.forEach(item => {
    if (inParallel) item.classList.remove("disabled");
    else item.classList.add("disabled");
  });

  menu.classList.remove("hidden");

  let menuWidth = menu.offsetWidth || 220;
  let menuHeight = menu.offsetHeight || 220;
  let posX = (x + menuWidth > window.innerWidth) ? (x - menuWidth) : x;
  let posY = (y + menuHeight > window.innerHeight) ? (y - menuHeight) : y;

  menu.style.left = posX + "px";
  menu.style.top = posY + "px";

  let submenus = menu.querySelectorAll(".context-submenu");
  submenus.forEach(sub => {
    if (posX + menuWidth + 220 > window.innerWidth) {
      sub.style.left = "auto";
      sub.style.right = "100%";
    } else {
      sub.style.left = "100%";
      sub.style.right = "auto";
    }
  });
}

function hideContextMenu() {
  let menu = document.getElementById("context-menu");
  if (menu) {
    menu.classList.add("hidden");
  }
  contextMenuTargetBlock = null;
}

function removeSelectedFromContextMenu() {
  if (!contextMenuTargetBlock || contextMenuTargetBlock.id === "rblock") {
    hideContextMenu();
    return;
  }
  selectedElement = contextMenuTargetBlock;
  removeElement();
  hideContextMenu();
}

function moveContextMenuBlock(direction) {
  const block = contextMenuTargetBlock;
  if (!block || block.id === "rblock" || !isElementInRblock(block)) {
    hideContextMenu();
    return;
  }

  const parent = block.parentElement;
  if (!parent || !parent.classList.contains("droparea")) {
    hideContextMenu();
    return;
  }

  const neighbor = direction < 0 ? block.previousElementSibling : block.nextElementSibling;
  if (!neighbor || !neighbor.classList.contains("dblock")) {
    hideContextMenu();
    return;
  }

  redoList = [];
  pushToUndo();

  if (direction < 0) {
    parent.insertBefore(block, neighbor);
  } else {
    parent.insertBefore(neighbor, block);
  }

  selectedElement = block;
  hideContextMenu();
  setAllTriangles();
}

function addElementFromContextMenu(type, position) {
  position = position || 'after';

  if (!contextMenuTargetBlock) {
    hideContextMenu();
    return;
  }

  let targetBlock = contextMenuTargetBlock;

  let inDecision = (targetBlock.classList.contains("decision") && !targetBlock.classList.contains("parallel"))
    || (targetBlock.closest && targetBlock.closest(".decision:not(.parallel)") !== null);
  let inParallel = targetBlock.classList.contains("parallel")
    || (targetBlock.closest && targetBlock.closest(".parallel") !== null);

  if (type === "decision-item" && !inDecision) {
    hideContextMenu();
    return;
  }
  if (type === "parallel-item" && !inParallel) {
    hideContextMenu();
    return;
  }

  hideContextMenu();

  let sidebar = document.getElementById("sidebar");
  let template = null;

  if (type === "process") {
    template = sidebar.querySelector(".dblock.process");
  } else if (type === "decision-two") {
    template = sidebar.querySelector(".dblock.decision.decision-two");
  } else if (type === "decision") {
    template = sidebar.querySelector(".dblock.decision:not(.decision-two):not(.parallel)");
  } else if (type === "decision-item") {
    template = sidebar.querySelector(".dblock.decision-item");
  } else if (type === "for-loop") {
    template = sidebar.querySelector(".dblock.iteration.for-loop");
  } else if (type === "iteration") {
    template = sidebar.querySelector(".dblock.iteration:not(.for-loop)");
  } else if (type === "repeatwhile") {
    template = sidebar.querySelector(".dblock.repeatwhile");
  } else if (type === "begin-end") {
    template = sidebar.querySelector(".dblock.begin-end");
  } else if (type === "parallel") {
    template = sidebar.querySelector(".dblock.parallel");
  } else if (type === "parallel-item") {
    template = sidebar.querySelector(".dblock.parallel-item");
  }

  if (!template) return;

  redoList = [];
  pushToUndo();

  if (type === "decision-item") {
    let parent = (targetBlock.classList.contains("decision") && !targetBlock.classList.contains("parallel"))
      ? targetBlock
      : (targetBlock.closest ? targetBlock.closest(".decision:not(.parallel)") : null);
    if (parent) {
      let branches = parent.getElementsByClassName("decision-branches")[0];
      if (branches && branches.lastElementChild) {
        let lastBranch = branches.lastElementChild;
        let copy = lastBranch.cloneNode(true);
        copy.lastElementChild.innerHTML = '';
        let ta = copy.querySelector("textarea");
        if (ta) {
          ta.value = '';
          ta.placeholder = "Défaut";
        }
        lastBranch.after(copy);
      }
    }
  } else if (type === "parallel-item") {
    let parent = targetBlock.classList.contains("parallel")
      ? targetBlock
      : (targetBlock.closest ? targetBlock.closest(".parallel") : null);
    if (parent) {
      let branches = parent.getElementsByClassName("decision-branches")[0];
      if (branches && branches.lastElementChild) {
        let lastBranch = branches.lastElementChild;
        let copy = lastBranch.cloneNode(true);
        let innerDa = copy.querySelector(".droparea");
        if (innerDa) innerDa.innerHTML = '';
        lastBranch.after(copy);
      }
    }
  } else {
    let clone = template.cloneNode(true);

    if (targetBlock.id === "rblock") {
      let dropArea = targetBlock.querySelector(".droparea.drop-before-end");
      if (dropArea) {
        if (position === 'before' && dropArea.firstElementChild) {
          dropArea.firstElementChild.before(clone);
        } else {
          dropArea.appendChild(clone);
        }
        setDropareaDefaultColor(dropArea);
        dropArea.style.borderColor = "transparent";
      }
    } else {
      if (position === 'before') {
        targetBlock.before(clone);
      } else {
        targetBlock.after(clone);
      }
      let parentDropArea = clone.parentElement;
      if (parentDropArea && parentDropArea.classList.contains("droparea")) {
        setDropareaDefaultColor(parentDropArea);
        parentDropArea.style.borderColor = "transparent";
      }
    }
  }

  setAllTriangles();
}

document.addEventListener("click", function(event) {
  let menu = document.getElementById("context-menu");
  if (menu && !menu.contains(event.target)) {
    hideContextMenu();
  }
});

document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    hideContextMenu();
  }
});


function removeElement() {
  if (selectedElement != null && isElementInRblock(selectedElement)) {
    redoList = [];
    pushToUndo();
    if (selectedElement.parentElement.children.length === 1) {
      setDropareaDefaultColor(selectedElement.parentElement);
    }
    selectedElement.remove();
    selectedElement = null;

    setAllTrianglesZero();
    setAllTriangles();
  }
}

function disableDraggableParent(ev) {
  if (!isElementInRblock(ev.target)) {
    return;
  }

  if (getParentDBlock(ev.target) == null) {
    return;
  }

  getParentDBlock(ev.target).setAttribute("draggable", "false");
  /* ev.target.parentElement.setAttribute("draggable", "false");*/
}

function enableDraggableParent(ev) {
  if (!isElementInRblock(ev.target)) {
    return;
  }

  if (getParentDBlock(ev.target) == null) {
    return;
  }

  getParentDBlock(ev.target).setAttribute("draggable", "false");
  /* ev.target.parentElement.setAttribute("draggable", "true"); */
}

function getParentDBlock(element) {
  if (element == null || element.parentElement == null) {
    return null;
  }

  if (element.classList.contains("dblock")) {
    return element;
  }

  return getParentDBlock(element.parentElement);
}

function getDropBeforeEnd(element) {
  // If we found the root element of the DOM or another type of droparea found first
  if (element == null || (element.classList.contains("droparea") && !element.classList.contains("drop-before-end"))) {
    return null;
  }

  if (element.classList.contains("drop-before-end")) {
    return element;
  }

  return getDropBeforeEnd(element.parentElement);
}

function save() {
  let rootElement = document.getElementById("rblock");

  var element = document.createElement('a');
  const savedRoot = rootElement.cloneNode(true);
  savedRoot.querySelectorAll(".drag-handle").forEach(handle => handle.remove());
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(savedRoot.outerHTML));

  let filename = rootElement.querySelector("textarea").value;

  if (filename === '') {
    filename = "diagram";
  }
  element.setAttribute('download', filename + ".html");

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function applyRootElement(content) {
  document.getElementById("canvas").innerHTML = content;
}

function applyTextareas() {

  t = document.getElementsByTagName("textarea");

  for (let i = 0; i < t.length; ++i) {
    if (isElementInRblock(t[i])) {
      t[i].value = t[i].getAttribute("value");
    }
  }
}

function upload() {
  var input = document.createElement('input');
  input.type = 'file';

  input.onchange = e => {
    var file = e.target.files[0];
    var reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = readerEvent => {
      applyRootElement(readerEvent.target.result);
      applyTextareas();
      setAllTriangles();
    }


  }

  input.click();
}

function printContent() {
  resetSelectedElement();
  if (selectedElement != null) {
    selectedElement.style.backgroundColor = "";
    selectedElement = null;
  }
  instance.moveTo(0, 0);
  instance.zoomTo(0, 0, 0.5);
  setTimeout(() => {
    setAllTriangles();
    window.print();
  }, 1000);
}


function textareaResize(ev) {
  if (!isElementInRblock(ev.target)) {
    ev.target.value = '';
  }
  ev.target.style.boxSizing = 'border-box';
  var offset = ev.target.offsetHeight - ev.target.clientHeight;
  ev.target.style.height = 'auto';
  ev.target.style.height = ev.target.scrollHeight + offset + 'px';

  ev.target.setAttribute("value", ev.target.value);
}

function resetSidebar() {
  let da = document.getElementById("sidebar").getElementsByClassName("droparea");

  for (let i = 0; i < da.length; ++i) {
  }
}

/*
dblocks = document.getElementsByClassName("dblock")
for (let i = 0; i < dblocks.length; ++i) {
  dragElement(dblocks[i])
}

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

  elmnt.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.target.style.zIndex = ++topIndex;

    if (e.target.classList.contains("dblock") && !e.target.parentElement.classList.contains("droparea")) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;

    }
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

/*
  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

*/

/* INTERNATIONALIZATION (i18n) */
const translations = {
  fr: {
    btn_open: "Ouvrir <b>[^O]</b>",
    btn_save: "Enregistrer <b>[^S]</b>",
    btn_delete: "Supprimer <b>[DEL]</b>",
    btn_center: "Centrer <b>[^A]</b>",
    btn_undo: "Annuler <b>[^Z]</b>",
    btn_redo: "Rétablir <b>[^Y]</b>",
    btn_export: "Exporter l'image <b>[^E]</b>",
    btn_clear: "Tout effacer <b>[^DEL]</b>",

    heading_instruction: "Instruction",
    heading_alternative: "Alternative",
    heading_selection: "Sélection",
    heading_for_loop: "Boucle",
    heading_while: "Tant que",
    heading_until: "Jusqu'à",
    heading_endless: "Sans fin",
    heading_parallel: "Traitement parallèle",

    ph_program: "Programme",
    ph_instruction: "Instruction",
    ph_alternative: "Alternative",
    ph_true: "Vrai",
    ph_false: "Faux",
    ph_selection: "Sélection",
    ph_default: "Défaut",
    ph_branch: "Branche",
    ph_condition: "Condition",
    ph_parallel_block: "Bloc parallèle",
    sep_for: "à",

    ctx_delete: "Supprimer ce bloc",
    ctx_move_up: "Déplacer vers le haut",
    ctx_move_down: "Déplacer vers le bas",
    ctx_add_before: "Ajouter avant...",
    ctx_add_after: "Ajouter après...",
    ctx_instruction: "Instruction",
    ctx_alternative: "Alternative",
    ctx_selection: "Sélection",
    ctx_selection_branch: "Branche (Sélection)",
    ctx_for_loop: "Boucle (Pour)",
    ctx_while: "Tant que",
    ctx_until: "Jusqu'à",
    ctx_endless: "Sans fin",
    ctx_parallel: "Traitement parallèle",
    ctx_parallel_branch: "Branche (Parallèle)",

    title_zoom_in: "Zoomer (+)",
    title_zoom_out: "Dézoomer (-)",
    title_center: "Centrer le schéma",

    confirm_clear: "Les modifications non enregistrées seront perdues. Voulez-vous continuer ?"
  },
  en: {
    btn_open: "Open <b>[^O]</b>",
    btn_save: "Save <b>[^S]</b>",
    btn_delete: "Delete <b>[DEL]</b>",
    btn_center: "Center <b>[^A]</b>",
    btn_undo: "Undo <b>[^Z]</b>",
    btn_redo: "Redo <b>[^Y]</b>",
    btn_export: "Export image <b>[^E]</b>",
    btn_clear: "Clear all <b>[^DEL]</b>",

    heading_instruction: "Instruction",
    heading_alternative: "Alternative",
    heading_selection: "Selection",
    heading_for_loop: "Loop (For)",
    heading_while: "While",
    heading_until: "Until",
    heading_endless: "Endless",
    heading_parallel: "Parallel processing",

    ph_program: "Program",
    ph_instruction: "Instruction",
    ph_alternative: "Alternative",
    ph_true: "True",
    ph_false: "False",
    ph_selection: "Selection",
    ph_default: "Default",
    ph_branch: "Branch",
    ph_condition: "Condition",
    ph_parallel_block: "Parallel Block",
    sep_for: "to",

    ctx_delete: "Delete this block",
    ctx_move_up: "Move up",
    ctx_move_down: "Move down",
    ctx_add_before: "Add before...",
    ctx_add_after: "Add after...",
    ctx_instruction: "Instruction",
    ctx_alternative: "Alternative",
    ctx_selection: "Selection",
    ctx_selection_branch: "Branch (Selection)",
    ctx_for_loop: "Loop (For)",
    ctx_while: "While",
    ctx_until: "Until",
    ctx_endless: "Endless",
    ctx_parallel: "Parallel processing",
    ctx_parallel_branch: "Branch (Parallel)",

    title_zoom_in: "Zoom in (+)",
    title_zoom_out: "Zoom out (-)",
    title_center: "Center diagram",

    confirm_clear: "Unsaved changes will be lost. Do you want to proceed?"
  },
  de: {
    btn_open: "Öffnen <b>[^O]</b>",
    btn_save: "Speichern <b>[^S]</b>",
    btn_delete: "Löschen <b>[DEL]</b>",
    btn_center: "Zentrieren <b>[^A]</b>",
    btn_undo: "Rückgängig <b>[^Z]</b>",
    btn_redo: "Wiederholen <b>[^Y]</b>",
    btn_export: "Bild exportieren <b>[^E]</b>",
    btn_clear: "Alles löschen <b>[^DEL]</b>",

    heading_instruction: "Anweisung",
    heading_alternative: "Alternativ",
    heading_selection: "Auswahl",
    heading_for_loop: "Schleife (Für)",
    heading_while: "Solange",
    heading_until: "Bis",
    heading_endless: "Endlos",
    heading_parallel: "Parallele Verarbeitung",

    ph_program: "Programm",
    ph_instruction: "Anweisung",
    ph_alternative: "Alternativ",
    ph_true: "Wahr",
    ph_false: "Falsch",
    ph_selection: "Auswahl",
    ph_default: "Standard",
    ph_branch: "Zweig",
    ph_condition: "Bedingung",
    ph_parallel_block: "Paralleler Block",
    sep_for: "bis",

    ctx_delete: "Diesen Block löschen",
    ctx_move_up: "Nach oben verschieben",
    ctx_move_down: "Nach unten verschieben",
    ctx_add_before: "Davor hinzufügen...",
    ctx_add_after: "Danach hinzufügen...",
    ctx_instruction: "Anweisung",
    ctx_alternative: "Alternativ",
    ctx_selection: "Auswahl",
    ctx_selection_branch: "Zweig (Auswahl)",
    ctx_for_loop: "Schleife (Für)",
    ctx_while: "Solange",
    ctx_until: "Bis",
    ctx_endless: "Endlos",
    ctx_parallel: "Parallele Verarbeitung",
    ctx_parallel_branch: "Zweig (Parallel)",

    title_zoom_in: "Vergrößern (+)",
    title_zoom_out: "Verkleinern (-)",
    title_center: "Diagramm zentrieren",

    confirm_clear: "Ungespeicherte Änderungen gehen verloren. Möchten Sie fortfahren?"
  }
};

let currentLang = localStorage.getItem("nsd_lang") || "fr";

function setLanguage(lang) {
  if (!translations[lang]) lang = "fr";
  currentLang = lang;
  localStorage.setItem("nsd_lang", lang);

  let langSelect = document.getElementById("lang-select");
  if (langSelect) {
    langSelect.value = lang;
  }

  let dict = translations[lang];

  document.querySelectorAll("[data-i18n]").forEach(el => {
    let key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.innerHTML = dict[key];
    }
  });

  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    let key = el.getAttribute("data-i18n-ph");
    if (dict[key]) {
      el.placeholder = dict[key];
    }
  });

  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    let key = el.getAttribute("data-i18n-title");
    if (dict[key]) {
      el.title = dict[key];
    }
  });
}

document.addEventListener("DOMContentLoaded", function() {
  setLanguage(currentLang);
});
setLanguage(currentLang);
