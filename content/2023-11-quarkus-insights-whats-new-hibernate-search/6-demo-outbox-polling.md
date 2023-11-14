## Demo

Quarkus, Hibernate Search & outbox polling

@Notes:

1. Switch to `hsearch-outbox-polling`
2. Show what's needed for outbox-polling
   1. Dependency: see POM, `hibernate-search-orm-coordination-outbox-polling`
   2. Config: see `application.properties`, `quarkus.hibernate-search-orm.coordination.strategy=outbox-polling`
3. Show mapping quickly
   1. Book
   2. Author
4. Build and deploy
   1. `quarkus build`
   2. Show `docker-compose.yml`
   3. `podman compose up -V`
   4. Reindex: `curl -XPOST 'localhost:9000/admin/reindex'`
5. Press enter a few times to clear the terminal
6. http://localhost:8080/q/swagger-ui/
   1. `GET /author/all`: locate "Asimov"
   2. `PUT /author/5`: change the name of "Asimov" ("Blugerman")
   3. `GET /book/_search`: search for "Blugerman"
7. Show logs; explain event processing
   1. Author change event
   2. Book reindexing events (because of author change)
   3. Book reindexing, with bulking
   4. Load is distributed over app instances
8. Start a new instance:
   ```
   podman run --rm -it \
    --net hsearch-outbox-polling_pgnet,hsearch-outbox-polling_esnet \
    -e QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://pg01:5432/hibernate_demo \
    -e QUARKUS_DATASOURCE_USERNAME=hibernate_demo \
    -e QUARKUS_DATASOURCE_PASSWORD=hibernate_demo \
    -e QUARKUS_HIBERNATE_SEARCH_ORM_ELASTICSEARCH_HOSTS=es01:9200,es02:9200 \
    hibernate-demo/hsearch-outbox-polling:1.0.0-SNAPSHOT
   ```
9. Show logs; explain rebalancing
10. Change "Asimov" name again
11. Show logs; explain event processing again 
