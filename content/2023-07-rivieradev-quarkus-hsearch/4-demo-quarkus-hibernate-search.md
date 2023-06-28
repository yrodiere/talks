## Demo

Quarkus & Hibernate Search

@Notes:

1. Dépendance
2. Mapping
   1. Entité annotée ordinaire pour Hibernate ORM
   2. `@Indexed` Active l'indexation Hibernate Search
   3. Super! Un document vide.
   4. `@*Field` Ajoute un champs full-text, avec sa config
   5. On peut ajouter plusieurs champs avec une config différente (utile pour tri, par exemple)
   6. `@IndexedEmbedded` pour dénormalisation
   7. Entité => Document, c'est bon. Et ensuite?
3. Configuration
   1. Version
   2. Initialisation du schéma: `quarkus.hibernate-search-orm.schema-management.strategy`
      1. `create-or-validate`
      2. `none`
      3. `drop-and-create-and-drop`
      4. autres, pas besoin de détailler
   3. Analyse
4. Indexation de données pré-existantes
   1. DevUI
      1. Réindexe toutes les entités; peut prendre un certain temps
   2. Endpoint (management port?)
      1. Plein d'options pour tuner les performances
5. Indexation par listener
   1. Simple
   2. Modification d'auteur => réindexation de book
      1. On modifie un objet inclus dans un autre
      2. Le titre du chapitre est inclus dans la version indexée du livre
      3. Mais... aucun événement de modification pour le livre?
      4. Pas de souci, HSearch sait ce qu'il faut faire (grâce au mapping + métadonnées d'ORM)
      5. Le livre est réindexé comme attendu 
6. Recherche
   1. On peut utiliser les API d'Elasticsearch directement, si on le désire
   2. Mais une API Java peut aider: type-safe dans une certaine mesure, auto-complétion, pas de parsing
      1. Configuration classique: terme fourni par l'utilisateur + entity manager (session)
      2. Accès à l'API HSearch via `Search.session`
      3. De là, on démarre une recherche sur la classe `Book` (cible implicitement l'index "book")
      4. On définit un prédicat (`f` est une "factory" de prédicats)
      5. On récupère les hits: ce sont des entités managées! (i.e. lazy loading, etc.)
   3. Tri
   4. Projections
   5. Spatial
   6. Faceting (aggrégations)
   7. Et beaucoup plus
      1. JSON natif
      2. Définition d'annotations, de binders, ...
