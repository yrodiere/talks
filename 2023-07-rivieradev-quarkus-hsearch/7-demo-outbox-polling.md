## Demo

Quarkus, Hibernate Search & outbox polling

@Notes:

1. Arrêter me dev mode
2. Passer sur l'outbox-polling
   1. Dépendance: `quarkus ext add hibernate-search-orm-coordination-outbox-polling`
   2. Config: `quarkus.hibernate-search-orm.coordination.strategy=outbox-polling`
3. Build et déploiement
   1. `quarkus build`
   2. Montrer `docker-compose.yml`
   3. `docker-compose up -V`
   4. Réindexer: `curl -XPOST 'localhost:9000/admin/reindex'`
4. Appuyer sur entrée quelques fois pour nettoyer le terminal
5. http://localhost:8080/q/swagger-ui/
   1. `GET /author/all`: repérer Asimov
   2. `PUT /author/5`: modifier le nom d'Asimov (Blugerman)
   3. `GET /book/_search`: rechercher Blugerman
6. Montrer les logs; expliquer
   1. Événement de modif d'auteur
   2. Événement de réindexation des livres (cause auteur)
   3. Réindexation des livres, avec bulking
   4. Charge répartie entre les instances d'appli
