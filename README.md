# NSD-Maker

**NSD-Maker** est un éditeur de schémas de Nassi–Shneiderman accessible depuis un navigateur. Il permet de représenter visuellement la logique d’un programme à l’aide de blocs structurés, puis d’enregistrer ou d’exporter le schéma.

L’outil est destiné notamment à l’apprentissage de la programmation : les structures de contrôle et l’enchaînement des instructions peuvent être visualisés sans écrire immédiatement du code dans un langage particulier.

## Accéder à l’application

[Ouvrir NSD-Maker](https://emf-info.github.io/nsdmaker/)

L’application fonctionne côté navigateur et ne nécessite ni compte utilisateur ni installation. Le dépôt contient les fichiers nécessaires à son exécution.

## Fonctionnalités

### Construire un schéma

Une zone latérale propose les blocs à ajouter au programme. Fais glisser un bloc dans une zone de dépôt du schéma. Le bloc est alors ajouté au programme et tu peux saisir son contenu dans les champs de texte.

Les blocs disponibles sont :

- **Instruction** : une action ou une étape du programme.
- **Alternative** : une condition avec deux chemins, vrai et faux.
- **Sélection** : un choix entre plusieurs branches, avec une branche par défaut.
- **Boucle « Pour »** : une boucle avec une valeur de départ et une valeur de fin.
- **Boucle « Tant que »** : une boucle conditionnelle.
- **Boucle « Jusqu’à »** : une boucle avec une condition de sortie.
- **Bloc « Sans fin »** : une structure répétée sans condition d’arrêt.
- **Traitement parallèle** : plusieurs branches exécutées en parallèle.

Les couleurs facilitent la lecture du schéma :

- **Blanc** : instruction ordinaire.
- **Jaune** : instruction dont le texte commence par `affiche` (sans distinction entre majuscules et minuscules).
- **Cyan** : boucles.
- **Vert** : alternatives et sélections. Les branches d’une sélection restent blanches.

Le programme commence par un bloc racine. Sa largeur est conçue pour laisser de la place aux instructions et aux structures imbriquées.

### Modifier et organiser les blocs

- Clique dans un champ pour saisir ou modifier son texte. Les zones de texte utilisent la police **Courier New**.
- Déplace un bloc déjà dans le programme avec la poignée **↕** en haut à droite. Fais glisser la poignée vers une zone de dépôt.
- Fais glisser un bloc depuis la barre latérale pour en ajouter une nouvelle copie.
- Fais un clic droit sur un bloc du programme pour ouvrir le menu contextuel. Tu peux y ajouter un bloc avant ou après, supprimer le bloc, ou le déplacer vers le haut ou vers le bas dans sa zone.
- Utilise **Annuler** et **Rétablir** pour revenir sur les changements récents.
- Sélectionne un bloc puis utilise **Supprimer** ou la touche **Suppr** pour le retirer. Le bloc racine ne peut pas être supprimé.

### Naviguer dans le schéma

- Utilise les boutons **+** et **−** pour zoomer et dézoomer.
- Utilise le bouton **🎯** pour recentrer le schéma.
- Tu peux aussi déplacer la vue avec la touche **Espace** maintenue pendant un glisser, ou avec le bouton central de la souris.

### Ouvrir, enregistrer et exporter

- **Ouvrir** : charge un fichier de schéma `.nsd` (son contenu est un document HTML).
- **Enregistrer** : télécharge le schéma au format `.nsd`.
- **Exporter l’image** : crée une image PNG du schéma.

Le nom du fichier enregistré et de l’image PNG reprend le titre saisi dans le champ du bloc **Programme**. Les espaces deviennent des tirets bas, les caractères interdits sont retirés et un nom par défaut est utilisé si le titre est vide.

Les raccourcis clavier disponibles sont :

| Raccourci | Action |
| --- | --- |
| <kbd>Alt</kbd> + molette | Zoomer ou dézoomer |
| <kbd>Alt</kbd> + clic gauche | Déplacer la vue |
| <kbd>Ctrl</kbd> + <kbd>A</kbd> | Recentrer le schéma |
| <kbd>Ctrl</kbd> + <kbd>E</kbd> | Exporter le schéma en PNG |
| <kbd>Ctrl</kbd> + <kbd>O</kbd> | Ouvrir un schéma |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Enregistrer le schéma |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> | Rétablir |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Annuler |
| <kbd>Suppr</kbd> | Supprimer le bloc sélectionné |
| <kbd>Ctrl</kbd> + <kbd>Suppr</kbd> | Effacer tout le schéma |

### Langues

L’interface est disponible en français, anglais et allemand. Le sélecteur de langue se trouve dans la barre supérieure.

## Utilisation locale

Tu peux cloner le dépôt et ouvrir `index.html` dans un navigateur :

```bash
git clone https://github.com/emf-info/nsdmaker.git
cd nsdmaker
```

Tu peux ensuite ouvrir `index.html` avec ton navigateur. Aucun processus de compilation n’est requis.

## Technologies

NSD-Maker est une application web statique construite avec **HTML, CSS et JavaScript**. Elle utilise les bibliothèques incluses dans le dépôt pour le zoom/déplacement de la vue et l’export PNG.

## Dépôt

[github.com/emf-info/nsdmaker](https://github.com/emf-info/nsdmaker)
