Vous utilisez Hibernate ORM pour accéder à votre SGBD relationnel ?
Vous voulez offrir à vos utilisateurs une recherche dans des données textuelles ?

Vous avez donc constaté que le standard SQL (et donc Hibernate ORM) est limité à de simples LIKE/ILIKE.
Certains SGBD proposent des extensions SQL full-text non standards, mais leurs fonctionnalités sont parfois limitées;
rien à voir avec des solutions dédiées à la recherche full-text telles que [Elasticsearch](https://www.elastic.co/elasticsearch/).

Et si, au lieu de se limiter au SQL,
vous pouviez indexer une partie de votre base de donnée relationnelle dans Elasticsearch,
et ainsi profiter de ses API de recherche avancée ?

Ce talk présente Hibernate Search 6, une intégration à Hibernate ORM qui permet d'indexer automatiquement
ses entités dans Elasticsearch, et offre une API Java haut niveau pour requêter d'Elasticsearch.

Pré-requis : connaissances basiques de JPA ou Hibernate ORM.

La présentation inclut :

* Les fondamentaux de la recherche full-text dans le monde Apache Lucene / Elasticsearch
* Les problématiques de l'indexation automatique d'une base de données dans Elasticsearch, et les solutions apportées par Hibernate Search 6.
* Les bases de l'utilisation d'Hibernate Search 6 : configuration, annotations, initialisation, API de recherche.
* Une démonstration d'une application utilisant Hibernate Search 6 avec la stack Quarkus.

## Speaker

Yoann Rodière est Software Engineer chez Red Hat dans l'équipe Hibernate.
Il est lead developer du projet Hibernate Search (http://hibernate.org/search/),
ainsi que l'un des principaux contributeurs aux extensions Hibernate (ORM, Search, Validator)
au sein de la stack Quarkus (https://quarkus.io/).
