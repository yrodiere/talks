## Les limites

-

## Perte d'événement possible

<div class="viz" data-width="900">
digraph {
	rankdir = LR;

    node [shape = record, style = rounded, margin = 0.2];

    entityUpdate [label = "Modification\nd'entités"];
    subgraph commitGraph {
        rank = "same";
        commit [label = "Commit"];
        restartJvm3 [label = "Redémarrage\ninopiné"];
        commit -> restartJvm3;
    }
    indexing [label = "Indexation"];
    sync [label = "Index\nsynchronisé"];
    outOfSync [label = "Index\ndésynchronisé"];
    restartJvm1 [label = "Redémarrage\ninopiné"];
    restartJvm2 [label = "Redémarrage\ninopiné"];
    ok [label = "OK"];
    ko [label = "Événement\nperdu", class = "highlight"];

    entityUpdate -> commit -> indexing;

    indexing -> sync [label = "Succès"];
    indexing -> outOfSync [label = "Erreur"];

    sync -> restartJvm1 -> ok;
    outOfSync -> restartJvm2 -> ko;
    restartJvm3 -> ko;
}
</div>

Les événements sont stockés en mémoire vive !

@Notes:

* Dans de rares cas, l'indexation peut échouer (Elasticsearch surchargé, ...)
* Dans ces cas, la BDD est à jour mais pas les index
* On peut éventuellement réessayer
* Mais l'évenement n'est présent qu'en mémoire vive!
* Si la JVM s'arrête, on perd l'information

-

## Latence

<div class="viz" data-width="900">
digraph {
	rankdir = LR;

    node [shape = record, style = rounded, margin = 0.2];

    request [label = "Requête\nHTTP"];
    entityUpdate [label = "Modification\nd'entités"];
    indexingResolution [label = "Résolution entités\nà réindexer"];

    # Note the "cluster" prefix is necessary to have the subgraph drawn.
	subgraph clusterMediumLatency {
        label = "Latence supplémentaire";
        style = rounded;
        class = "highlight";

		indexingLoad [label = "Chargement BDD\npour indexation"];
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

La transaction ne peut pas être terminée avant la construction des documents !

@Notes:

* Charger des entités de la BDD pour les indexer a un coût.
* Expliquer le diagramme
* On attend pour garantir que l'indexation aura lieu
* Si on pouvait éviter que ça se traduise en latence pour les requêtes HTTP, ça serait bien...
* Déporter dans un thread réduit la latence, mais on perd la garantie d'indexation (crash JVM, ...)

-

## Conflits 

<div class="grid">
<div class="column">
<div class="viz">
digraph {
	node [margin = 0.2, shape = record, style = rounded];
	rankdir = TB;

	entity1 [label = "Livre"];
	entity2 [label = "Auteur 1 (v2)", color = "red"];
	entity3 [label = "Auteur 2"];
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

	document [label = "Un seul document (Auteur 1 v2)"];
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
	entity2 [label = "Auteur 1"];
	entity3 [label = "Auteur 2 (v2)"];
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

	document [label = "Un seul document (Auteur 2 v2)"];
}
</div>
</div>
</div>

Conflit en BDD != Conflit dans l'index

@Notes:

* Dans de rares cas, il est théoriquement possible d'arriver à un index non synchronisé en cas de conflit
* Deux modifications en parallèles sur deux entités différentes (donc pas de conflit pour la BDD)
* Pas de transactions dans Elasticsearch, donc pas de conflit détecté non plus
* En pratique rare et pas forcément critique (réindexation la nuit), mais quand même...

-

<!-- .element data-visibility="hidden" -->

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
