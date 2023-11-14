## Demo

Quarkus & Hibernate Search

@Notes:

1. Switch to `hsearch-feature-examples/search-advanced`
2. Show what's needed for outbox-polling
   1. Dependency: see POM, `hibernate-search-orm-elasticsearch`
   2. Config: see `application.properties`, `quarkus.hibernate-search-orm.elasticsearch.version=8`
3. Analyse: `AnalysisConfigurer.java`
   1. DSL
   2. `@SearchExtension`
   3. available types: see Elasticsearch docs
4. Mapping
   1. `@Entity` Hibernate ORM entity
   2. `@Indexed` Switches Hibernate Search indexing on
   3. ... but empty doc
   4. `@*Field` Adds fields, configurable
   5. May have more than one field per property
   6. `@IndexedEmbedded` for de-normalization
   7. And more: https://docs.jboss.org/hibernate/stable/search/reference/en-US/html_single/#search-mapping
      1. Définition d'annotations, de binders, ...
5. Mass indexing
   1. DevUI: http://localhost:8080/q/dev-ui
   2. Click Hibernate Search, reindex a few entites
6. Show CRUD quickly
   1. http://localhost:8080/q/swagger-ui/
   2. Mention there's no code specific to Hibernate Search, indexing happens transparently 
7. Show search
   1. `TShirtService#search`
   2. http://localhost:8080/q/swagger-ui/
   3. Search for `jumped` => matches `jumping`
   4. Search for `pin` => doesn't match `jumping`
8. Projections
   1. `TShirtService#autocompleteNoDatabase`
   2. Run script:
   ```shell script
   while read TEXT; do curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/autocomplete_nodb' -G --data-urlencode "terms=$TEXT" | jq ; done
   # Then type whatever you want, followed by <ENTER>
   ju
   ju sk
   ```
9. Highlighting
   1. `TShirtService#searchWithHighlights`
   2. Run script:
   ```shell script
   while read TEXT; do curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/highlight' -G --data-urlencode "q=$TEXT" | jq ; done
   # Then type whatever you want, followed by <ENTER>
   jumped
   ```
10. OpenSearch
    1. STOP THE APP
    2. Config: see `application.properties`, `quarkus.hibernate-search-orm.elasticsearch.version=8`
    3. `opensearch:2`
    4. `quarkus dev`
