<!-- .element: class="nested-fragments-highlight-current" -->

## Outbox polling

<div class="viz" data-viz-engine="neato" data-width="900"
    data-viz-images="../image/logo/elastic-search-logo-color-reversed-horizontal.svg,200px,100px">
digraph {
    node [margin = 0.2];
    splines = ortho;

	app [label = "Application", pos = "-3,0!"];
	orm [label = "ORM", labelloc="t", pos = "0,0!"];
	db [shape=cylinder, label = "BDD", pos = "3,0!"];

	app -> orm [label = "1.1 Modif. d'entité", headclip = false, arrowhead = none];
	orm -> db [headlabel = "1.3 INSERT/UPDATE", tailclip = false, labeldistance=5, labelangle=-20.0, class="fragment data-fragment-index_2"];

	hsearch [label = "Hibernate Search", pos = "0,-2!"];
    elasticsearch [shape=none, image="../image/logo/elastic-search-logo-color-reversed-horizontal.svg", label="", penwidth=0, pos = "7,-2!"];

	orm -> hsearch:nw [headlabel = "1.2 Evénement\nde modif.", style = dashed, tailclip = false, class="fragment data-fragment-index_1"];
	orm -> hsearch:ne [label = "1.4 Evénement\nde pré-commit", style = dashed, tailclip = false, class="fragment data-fragment-index_3"];
	hsearch -> db [headlabel = "1.5 INSERT INTO\nOutboxEvent ...", class="fragment data-fragment-index_4", labeldistance=6, labelangle=40.0];
	orm -> db [headlabel = "1.6 COMMIT", tailclip = false, class="fragment data-fragment-index_5", labeldistance=4, labelangle=20.0];

	eventProcessor [label = "Processeur\nd'événement\n(Hibernate Search)", pos = "7,0!"];

    pollingSplineRoutingNode [style=invis, pos="4.5,0.6!"];
    commitSplineRoutingNode [style=invis, pos="4.5,-0.6!"];

	eventProcessor -> pollingSplineRoutingNode [class="fragment data-fragment-index_6", headclip = false, arrowhead = none];
    pollingSplineRoutingNode -> db:ne [taillabel = "2.1 SELECT ... FROM OutboxEvent\n(polling)", class="fragment data-fragment-index_6", tailclip = false, labeldistance=2, labelangle=-120.0];

	eventProcessor -> db [headlabel = "2.4 DELETE FROM OutboxEvent", class="fragment data-fragment-index_9", labeldistance=8, labelangle=-7.0];
	eventProcessor -> db [headlabel = "2.2 SELECT ... FROM Book", class="fragment data-fragment-index_7", labeldistance=8, labelangle=7.0];

	eventProcessor -> commitSplineRoutingNode [class="fragment data-fragment-index_10", headclip = false, arrowhead = none];
    commitSplineRoutingNode -> db:se [taillabel = "2.5 COMMIT", class="fragment data-fragment-index_10", tailclip = false];

	eventProcessor -> elasticsearch [label = "2.3 PUT /book/_doc/1/", class="fragment data-fragment-index_8"];
}
</div>

@Notes:

1. Utilisateur demande à ORM de persister des modifications
1. ORM notifie HSearch des changements
1. HSearch stocke cette information
1. Avant le commit, ORM notifie encore HSearch
1. HSearch persiste un événement dans la table "OutboxEvent"
1. ORM commit 
1. Un event processor qui requête périodiquement la BDD détecte le nouvel événement
1. L'event processor charge l'entité à réindexer
1. L'event processor envoie la demande d'indexation à Elasticsearch
1. Lorsque l'indexation est terminée, l'event processor supprime l'évenement et commit
1. Indexer avant le commit signifie qu'on ne perd pas d'événements en cas d'échec de l'indexation

-

## Pas de conflits

<div class="viz" data-width="900">
digraph {
	rankdir = LR;
    compound=true;

    node [shape = record, style = rounded, margin = 0.2];

    application1 [label = "Instance\nd'application 1"];
    application2 [label = "Instance\nd'application 2"];

    application1 -> shard1 [lhead = clusterOutbox, label = "Événement\nentité id=12"]
    application1 -> shard2 [lhead = clusterOutbox, label = "Événement\nentité id=42", class = "highlight"]
    application2 -> shard2 [lhead = clusterOutbox, label = "Événement\nentité id=42", class = "highlight"]
    application2 -> shard3 [lhead = clusterOutbox, label = "Événement\nentité id=35"]

    # Note the "cluster" prefix is necessary to have the subgraph drawn.
	subgraph clusterOutbox {
        label = "Outbox (BDD)";
        labelloc = tl;
        style = rounded;

		shard1 [label = "Shard 1"];
		shard2 [label = "Shard 2"];
		shard3 [label = "Shard 3"];
	}

    shard1 -> processor1 [label = "Événements\nentité id=12"]
    shard2 -> processor2 [label = "Événements\nentité id=42", class = "highlight"]
    shard3 -> processor3 [label = "Événements\nentité id=35"]

    processor1 [label = "Processeur\nd'événement 1"];
    processor2 [label = "Processeur\nd'événement 2"];
    processor3 [label = "Processeur\nd'événement 3"];

    entityTable [label = "Table entité\n(BDD)"];

    processor1 -> entityTable [dir = back, label = "Données\nentité id=12"]
    processor2 -> entityTable [dir = back, label = "Données\nentité id=42", class = "highlight"]
    processor3 -> entityTable [dir = back, label = "Données\nentité id=35"]
}
</div>

@Notes:

* Pas d'indexation concurrente d'une entité donnée:
  Répartition des entités à indexer entre processeurs d'évenements selon leur ID (*sharding*)
* Pas de problème de conflit de données entre événements:
  Récupération de l'intégralité des données dans une nouvelle transaction

-

## Perte d'événement impossible

```sql
BEGIN TRANSACTION;
UPDATE myentity SET name = 'updated' WHERE id = 42;
INSERT INTO hsearch_outboxevent (entity_name, entity_id, <...>)
    VALUES ('MyEntity', 42, <...>);
COMMIT TRANSACTION;
```

@Notes:

1. Une seule transaction: soit on persiste ET on enregistre les événements, soit _tout_ échoue
2. Une fois l'évenements persisté, il est conservé jusqu'à être traité avec succès

-

## Latence minimale

<div class="viz" data-width="900">
digraph {
    node [shape = record, style = rounded, margin = 0.2];
	rankdir = LR;

    request [label = "Requête\nHTTP"];
    entityUpdate [label = "Modification\nd'entités"];
    indexingResolution [label = "Résolution entités\nà réindexer"];

    # Note the "cluster" prefix is necessary to have the subgraph drawn.
    subgraph clusterMinimalLatency {
        label = "Latence minimale";
        style = rounded;
        class = "highlight";

        eventInsert [label = "INSERT INTO\nOutboxEvent ..."];
    }

    subgraph clusterMediumLatency {
        label = "Latence";
        style = invis;
        node [style = dashed];

        indexingLoad [label = "Chargement BDD\npour indexation"];
        indexing [label = "Indexation"];
    }

    response [label = "Réponse\nHTTP"];

    request -> entityUpdate;
    entityUpdate -> indexingResolution;
    indexingResolution -> eventInsert;
    indexingResolution -> indexingLoad [style = dashed];
    indexingLoad -> indexing [style = dashed];
    eventInsert -> response;
    indexing -> response [style = dashed];
}
</div>

@Notes:

1. Pas de chargement d'énormes graphes pour indexation dans les threads de la webapp
2. L'indexation peut passer à l'échelle indépendamment grace au partitionnement:
   100 threads HTTP + 1 thread d'indexation ou 100 thread HTTP + 10 thread d'indexation, ou ...

-

<!-- .element: class="grid" -->
## Pas d'infra supplémentaire

<div class="column">
<div class="viz" data-viz-engine="neato" data-viz-images="../image/logo/elastic-search-logo-color-reversed-horizontal.svg,200px,100px">
digraph {
	node [margin = 0.2];

	app [label = "Application", pos = "0,0!"];
	db [shape=cylinder, label = "BDD", pos = "2,0!"];
    elasticsearch [shape=none, image="../image/logo/elastic-search-logo-color-reversed-horizontal.svg", label="", penwidth=0, pos = "1,-1!"];
}
</div>
</div>

<div class="column" style="font-size: 3em;">
&rarr;
</div>

<div class="column">
<div class="viz" data-viz-engine="neato" data-viz-images="../image/logo/elastic-search-logo-color-reversed-horizontal.svg,200px,100px">
digraph {
	node [margin = 0.2];

	app [label = "Application", pos = "0,0!"];
	db [shape=cylinder, label = "BDD", pos = "2,0!"];
    elasticsearch [shape=none, image="../image/logo/elastic-search-logo-color-reversed-horizontal.svg", label="", penwidth=0, pos = "1,-1!"];
}
</div>
</div>

@Notes:

* le polling implique un usage légèrement plus important de la BDD
* mais en échange, on n'a besoin de configurer un autre élément d'infra: on utilise la même BDD
