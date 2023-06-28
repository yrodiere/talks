## Les limites

-

<!-- .element: class="grid" -->
## Dé-normalisation
<div class="column">
<div class="viz">
digraph {
	node [margin = 0.2, shape = record, style = rounded];
	rankdir = TB;

	entity1 [label = "Book"];
	entity2 [label = "Chapter 1"];
	entity3 [label = "Chapter 2"];
	entity1 -> entity2;
	entity1 -> entity3;
}
</div>
</div>

<div class="column" style="font-size: 3em;">
&rarr;
</div>

<div class="column">
<div class="viz">
digraph {
	node [margin = 0.6, shape = note];

	document [label = "Un seul document"];
}
</div>
</div>

@Notes:

1. Support limité des jointures dans Elasticsearch, et généralement déconseillé (perf)
1. En pratique, on contourne le problème via la de-normalization
1. Comment la mettre en oeuvre ?

-

## Conflits

TODO expliquer dénormalisation (cf. 2-hibernate-search.md?)
TODO diagramme de séquence pour expliquer la situation
TODO peut-être aussi deux JSON pour illustrer

-

## Isolation `serializable` + `if_seq_no`?

TODO expliquer que oui, utiliser l'isolation serializable pourrait fonctionner...
à condition d'utiliser `if_seq_no` et un identifiant de transaction strictement croissant ou une timestamp. 
Mais 1. identifiant/timestamp pas forcément possible et 2. Il faut être prêt à accepter les inconvénients

-

## Latence

TODO expliquer que charger des entités de la BDD pour les indexer a un coût.
Si on pouvait éviter que ça se traduise en latence pour les requêtes HTTP, ça serait bien...
