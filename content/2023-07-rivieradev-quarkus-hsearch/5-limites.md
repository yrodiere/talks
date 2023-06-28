## Les limites

-

<!-- .element: class="grid" -->
## Dé-normalisation
<div class="column">
<div class="viz">
digraph {
	node [margin = 0.2, shape = record, style = rounded];
	rankdir = TB;

	entity1 [label = "Livre"];
	entity2 [label = "Chapitre 1"];
	entity3 [label = "Chapitre 2"];
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

<div class="grid">
<div class="column">
<div class="viz">
digraph {
	node [margin = 0.2, shape = record, style = rounded];
	rankdir = TB;

	entity1 [label = "Livre"];
	entity2 [label = "Chapitre 1 (v2)", color = "red"];
	entity3 [label = "Chapitre 2"];
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

	document [label = "Un seul document (Chapitre 1 v2)"];
}
</div>
</div>
</div>

<div class="grid">
<div class="column">
<div class="viz">
digraph {
	node [margin = 0.2, shape = record, style = rounded];
	rankdir = TB;

	entity1 [label = "Livre"];
	entity2 [label = "Chapitre 1"];
	entity3 [label = "Chapitre 2 (v2)"];
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

	document [label = "Un seul document (Chapitre 2 v2)"];
}
</div>
</div>
</div>

@Notes:

* Il est théoriquement possible d'arriver à un index non synchronisé en cas de conflit
* Deux modifications en parallèles sur deux entités différentes (donc pas de conflit pour la BDD)
* Pas de transactions dans Elasticsearch, donc pas de conflit détecté non plus
* En pratique rare et pas forcément critique (réindexation la nuit), mais quand même...

-

## Résoudre à l'aide d'une version ?

```java
@Entity
@Indexed
public class Book {
    @Version
    private long version;

   // ...
}
```

```java
if (needsIndexing(book)) {
	entityManager.lock(book, LockModeType.OPTIMISTIC_FORCE_INCREMENT);
}
```
```
PUT my-index-000001/_doc/1?version=${book.getVersion()}&version_type=external
```

@Notes:

1. Elasticsearch ne supporte pas les transactions mais supporte le contrôle de concurrence optimiste
2. Consiste à maintenir une version dans le document pour détecter les modifications concurrentes
3. couplé à la même fonctionnalité dans ORM, ça pourrait fonctionner...
4. ... mais implique plus d'accès concurrents en écriture sur la même table 
5. ... et  veut-on vraiment annuler une transaction pour un simple problème d'indexation ?

-

## Latence

<div class="viz" data-width="900">
digraph {
	rankdir = LR;

    node [shape = record, style = rounded, margin = 0.2];

    request [label = "Requête\nHTTP"];
    entityUpdate [label = "Modification\nd'entités"];
    indexingResolution [label = "Résolution entités\nà réindexer"];

    # Note the "cluster" prefix is necessary to have the graph drawn.
	subgraph clusterLatency {
        label = "Latence supplémentaire";
        color=red;

		indexingLoad [label = "Chargement BDD\npour indexation", rank=1];
		indexing [label = "Indexation"];
	}

    response [label = "Réponse\nHTTP"];

    request -> entityUpdate;
    entityUpdate -> indexingResolution;
    indexingResolution -> indexingLoad;
    indexingLoad -> indexing;
    indexing -> response;
}
</div>


@Notes:

* Charger des entités de la BDD pour les indexer a un coût.
* Expliquer le diagramme
* On attend pour garantir que l'indexation aura lieu
* Si on pouvait éviter que ça se traduise en latence pour les requêtes HTTP, ça serait bien...
* Déporter dans un thread réduit la latence, mais on perd la garantie d'indexation (crash JVM, ...)
