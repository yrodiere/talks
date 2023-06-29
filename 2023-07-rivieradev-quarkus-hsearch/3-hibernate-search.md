## Hibernate Search

ORM. Elasticsearch. Intégrés.

@Notes:

1. Bibliothèque Java
1. S'intègre à Hibernate ORM
1. Résout les problèmes mentionnés à l'instant

-

<!-- .element: class="nested-fragments-highlight-current" -->
### Indexation automatique

<div class="viz" data-viz-engine="neato" data-viz-images="../image/logo/elastic-search-logo-color-reversed-horizontal.svg,200px,100px">
digraph {
	node [margin = 0.2];

	app [label = "Application", pos = "-3,0!"];
	orm [label = "ORM", labelloc="t", pos = "0,0!"];
	db [shape=cylinder, label = "BDD", pos = "5,0!"];

	app -> orm [label = "1.1 Modif. d'entité", headclip = false, arrowhead = none];
	orm -> db [label = "1.3 INSERT/UPDATE", class="fragment data-fragment-index_2", tailclip = false];

	hsearch [label = "Hibernate Search", pos = "0,-2!"];
    elasticsearch [shape=none, image="../image/logo/elastic-search-logo-color-reversed-horizontal.svg", label="", penwidth=0, pos = "5,-2!"];

	orm -> hsearch:nw [headlabel = "1.2 Evénement\nde modif.", style = dashed, tailclip = false, class="fragment data-fragment-index_1"];
	orm -> hsearch:ne [headlabel = "1.4 Evénement\nde commit", style = dashed, tailclip = false, class="fragment data-fragment-index_3"];
	hsearch -> elasticsearch [label = "1.5 PUT /book/_doc/1/", class="fragment data-fragment-index_4"];
}
</div>

@Notes:

1. Utilisateur demande à ORM de persister des modifications
1. ORM notifie HSearch des changements
1. HSearch stockes cette information
1. Lors du commit, ORM notifie encore HSearch
1. Puis HSearch envoie la demande d'indexation à Elasticsearch
1. Indexer lors d'un commit signifie qu'on n'introduit pas de données erronées dans l'index lors d'un rollback

-

### *Bulking* automatique
<div class="viz" data-viz-images="../image/logo/elastic-search-logo-color-reversed-horizontal.svg,200px,100px">
digraph {
	rankdir = LR;
	node [margin = 0.25];

	change1 [label = "Modif. 1", shape = record, style = rounded];
	change2 [label = "Modif. 2", shape = record, style = rounded];
	change3 [label = "Modif. 3", shape = record, style = rounded];

	hsearch [label = "Hibernate Search"];
    elasticsearch [shape=none, image="../image/logo/elastic-search-logo-color-reversed-horizontal.svg", label="", penwidth=0];

	change1 -> hsearch;
	change2 -> hsearch;
	change3 -> hsearch;
	hsearch -> elasticsearch [label = "POST /_bulk/"];
}
</div>

-

## Recherche

<div class="viz" data-viz-engine="neato" data-viz-images="../image/logo/elastic-search-logo-color-reversed-horizontal.svg,200px,100px">
digraph {
	splines = polyline;

	node [margin = 0.2];

	app [label = "Application", pos = "-4,-2!"];
	orm [label = "ORM", labelloc="t", pos = "0,0!"];
	db [shape=cylinder, label = "BDD", pos = "4,0!"];

	hsearch [label = "Hibernate Search", labelloc="b", pos = "0,-2!"];
    elasticsearch [shape=none, image="../image/logo/elastic-search-logo-color-reversed-horizontal.svg", label="", penwidth=0, pos = "4,-2!"];

	orm -> hsearch [label = "Entités managées", tailclip = false, headclip = false, class="fragment data-fragment-index_2"];
	db -> orm [headclip = false, arrowhead = none, class="fragment data-fragment-index_2"];

	elasticsearch -> hsearch [taillabel = "Hits", headclip = false, class="fragment data-fragment-index_1"];
	hsearch -> app [label = "Entités managées", tailclip = false, class="fragment data-fragment-index_3"];
}
</div>

@Notes:

1. Comment ça marche?
2. En premier lieu, HSearch récupère les hits d'Elasticsearch
3. Puis, à partir des identifiants de documents, HSearch récupère les entités
4. Et les transmet à l'application
5. Évidemment, ça implique un accès à la BDD
6. Permet ensuite de modifier les entités ou de bénéfier du lazy loading, y compris pour des données non indexées