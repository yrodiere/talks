## Outbox polling

TODO schema pour montrer qu'on n'indexe plus directement, mais à travers une outbox

-

## Pas d'infra supplémentaire

TODO:

* le polling implique un usage légèrement plus important de la BDD, à mettre en regard des autres avantages
* pas besoin de configurer un autre élément d'infra: on utilise la même BDD

-

## Pas de conflits

TODO

Les conflits sont impossibles:

1. Lorsqu'on réindexe, on recharge les données les plus récentes depuis la BDD
2. La coordination entre noeuds empêche l'indexation concurrente d'un même document

-

## Cohérence à terme

TODO:

Tout changement est, à terme, reflété:

1. Une seule transaction: soit on persiste ET on enregistre les événements, soit _tout_ échoue
2. les évenements sont persistés et seront, à terme, traités

-

## Séparation des requêtes HTTP

TODO:

1. Pas de chargement d'énormes graphes pour indexation dans les threads de la webapp
2. L'indexation peut passer à l'échelle indépendamment grace au partitionnement:
   100 threads HTTP + 1 thread d'indexation ou 100 thread HTTP + 10 thread d'indexation, ou ...
