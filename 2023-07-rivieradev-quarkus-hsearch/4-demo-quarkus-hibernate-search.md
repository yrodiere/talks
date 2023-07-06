## Demo

Quarkus & Hibernate Search

@Notes:

1. `pom.xml`
   1. dépendances
   2. Généré par `quarkus create`
   3. addition manuelle de `mapstruct`.
2. Lancer l'appli: `quarkus dev`
   1. Montrer `http://localhost:8080`
   2. Ne pas détailler, "on va y revenir"
3. Configuration
   1. Config générale, pas important
   2. Version
   3. Initialisation du schéma: `quarkus.hibernate-search-orm.schema-management.strategy`
      1. `create-or-validate`
      2. `none`
      3. `drop-and-create-and-drop`
      4. autres, pas besoin de détailler
4. Analyse: `CustomAnalysisDefinitions.java`
   1. DSL, plus pratique grâce à l'auto-complétion
   2. Sera poussé vers Elasticsearch avec le schéma
   3. types disponibles: cf. doc Elasticsearch
   4. Également possible de définir JSON Elasticsearch
   5. Exemple `name`, `english_sort`
5. Mapping
   1. `@Entity` Entité annotée ordinaire pour Hibernate ORM
   2. `@Indexed` Active l'indexation Hibernate Search
   3. Super! Un document vide.
   4. `@*Field` Ajoute un champ full-text, avec sa config
   5. Plusieurs champs par propriété possible, avec config différente (pour tri par ex.)
   6. `@IndexedEmbedded` pour dénormalisation
   7. Et plus: https://docs.jboss.org/hibernate/stable/search/reference/en-US/html_single/#search-mapping
      1. Définition d'annotations, de binders, ...
   8. Entité => Document, c'est bon. Et ensuite?
6. Montrer rapidement DTO, endpoints CRUD
7. Indexation de données pré-existantes
   1. DevUI: `http://localhost:8080` puis cliquer `DevUI`
      1. Réindexe toutes les entités; peut prendre un certain temps
   2. Endpoint (management port?)
      1. Plein d'options pour tuner les performances
      2. Ici, executé au démarrage en mode dev
8. Recherche
   1. On peut utiliser les API d'Elasticsearch directement, si on le désire
   2. Mais une API Java peut aider: type-safe dans une certaine mesure, auto-complétion, pas de parsing
      1. Configuration classique: terme fourni par l'utilisateur + entity manager (session)
      2. Accès à l'API HSearch via `SearchSession` (injecté par Quarkus)
      3. De là, on démarre une recherche sur la classe `Book` (cible implicitement l'index "book")
      4. On définit un prédicat (`f` est une "factory" de prédicats)
      5. On récupère les hits: ce sont des entités managées! (i.e. lazy loading, etc.)
      6. Tri
      7. Fetch, mapstruct pour DTO
   3. Montrer la recherche en action
      1. http://localhost:8080/q/swagger-ui/
      2. `robot`/`robots`/`mystery`
      3. `cord` => no match, even if there is `according`
   4. Et plus: https://docs.jboss.org/hibernate/stable/search/reference/en-US/html_single/#search-dsl
      1. Projections
      2. Spatial
      3. Faceting (aggrégations)
      4. JSON natif
9. Indexation par listener: modification d'auteur => réindexation de livre
   1. http://localhost:8080/q/swagger-ui/
   2. `GET /author/all`: repérer Asimov
   3. `PUT /author/5`: modifier le nom d'Asimov (Blugerman)
   4. Mais... aucun événement de modification pour le livre?
   5. Pas de souci, HSearch sait ce qu'il faut faire (grâce au mapping + métadonnées d'ORM)
   6. `GET /book/_search`: rechercher Blugerman
   7. Le livre est réindexé comme attendu
