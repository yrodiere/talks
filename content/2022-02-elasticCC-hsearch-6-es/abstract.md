Traditionnellement, les applications Java utilisent souvent Hibernate ORM et une base de données relationnelle
pour leurs besoin en stockage de données.
Bien que ce soit une solution populaire,
elle souffre néanmoins d'inconvénients communs à la plupart des base de données relationnelles,
en particulier des fonctionnalités de recherche full-text inférieures à Elasticsearch.

Cette session présente Hibernate Search 6,
une bibliothèque logicielle qui s'intègre à Hibernate ORM pour indexer (au moins en partie)
les données relationnelles d'une application,
soit en une seule fois pour toutes les données disponibles ("mass indexer"),
soit en continu lorsque les données changent ("indexation automatique" au fil de l'eau).
Hibernate Search fournit également une API Java qui s'abstrait des différences
entre le modèle entité/relationnel et le modèle Elasticsearch/document.

Cette solution simple à mettre en place mais complète fournit aux applications
les moyens de continuer à utiliser leur base de données relationnelle habituelle
pour leurs besoins de stockage de données,
tout en bénéficiant d'index Elasticsearch continuellement mis à jour
pour leurs besoins de recherche full-text (et plus).

## Speaker

Yoann Rodière is lead developer of the Hibernate Search project (http://hibernate.org/search/),
and one of the main contributors to the Hibernate extensions (ORM, Search, Validator)
in the Quarkus Java stack (https://quarkus.io/).
