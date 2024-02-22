## Hibernate Search

TODO: expliquer immédiatement tous les cas d'utilisation (ORM, Standalone, Infinispan, ...)?

<div class="grid">

<div class="column" style="font-size: 3em;">
*
</div>


<div class="column" style="font-size: 3em;">
&rarr;
</div>

<div class="column">
<img data-src="../image/logo/lucene.svg" class="logo" />
<p>
<img data-src="../image/logo/elasticsearch-color-horizontal.svg" class="logo" />
<p>
<img data-src="../image/logo/opensearch-monochrome.svg" class="logo" />
</div>

</div>

@Notes:

1. TODO

-

## *Mapping*

TODO code?

-

<!-- .element class="grid" -->
## Et bien plus...

<div class="column">

Search DSL
```java
List<Book> hits = searchSession
        .search( Book.class )
        .where( f -> f.simpleQueryString()
                .fields( "title",
                        "authors.name" )
                .matching( query ) )
        .sort( f -> f.field( "title_sort" ) )
        .fetchHits( 20 )
```

</div>
<div class="column">

Projection mapping
```java
@ProjectionConstructor
record BookDTO(@IdProjection long id,
               String title) {
}

List<BookDTO> hits = searchSession
        .search( Book.class )
        .select( BookDTO.class )
        .where( ... )
        .fetchHits( ... )
```

</div>
<div class="column">

Geospatial search
```java
.where( f.spatial().within()
        .field( "location")
        .circle( 53.97, 32.15,
                50, DistanceUnit.METERS ) )
```

</div>
<div class="column">

Faceting
```java
Map<Genre, Long> countByGenre =
        searchResult.aggregation( ... );
```

</div>

-

<!-- .element data-visibility="hidden" -->
## Search

<div class="viz" data-viz-engine="neato" data-viz-images="../image/logo/elasticsearch-color-horizontal.svg,200px,100px">
digraph {
	splines = polyline;

	node [margin = 0.2];

	app [label = "Application", pos = "-4,-2!"];
	orm [label = "ORM", labelloc="t", pos = "0,0!"];
	db [shape=cylinder, label = "DB", pos = "4,0!"];

	hsearch [label = "Hibernate Search", labelloc="b", pos = "0,-2!"];
    elasticsearch [shape=none, image="../image/logo/elasticsearch-color-horizontal.svg", label="", penwidth=0, pos = "4,-2!"];

	orm -> hsearch [label = "Managed entities", tailclip = false, headclip = false, class="fragment data-fragment-index_2"];
	db -> orm [headclip = false, arrowhead = none, class="fragment data-fragment-index_2"];

	elasticsearch -> hsearch [taillabel = "Hits", headclip = false, class="fragment data-fragment-index_1"];
	hsearch -> app [label = "Managed entities", tailclip = false, class="fragment data-fragment-index_3"];
}
</div>

@Notes:

1. First, Hibernate Search fetches hits from Elasticsearch
1. Then Hibernate Search extracts document IDs and derives entity IDs
1. Then Hibernate Search fetches entities from the DB through Hibernate ORM
   and forwards them to the application.
1. Obvisouly, this requires DB access
1. Enables in particular lazy loading, including for related, non-indexed data

---

<!-- .element: class="grid" -->
## Hibernate Search et les graphes<br><small>La dé-normalisation</small>

<div class="column">

<p><img data-src="../image/logo/hibernate_color.svg" class="logo" />

<div class="viz">
digraph {
	node [margin = 0.2, shape = record, style = rounded];
	rankdir = TB;

	containing1 [label = "Livre 1"];
	contained1 [label = "Auteur 1"];
	contained2 [label = "Auteur 2"];
	containing2 [label = "Livre 2"];

	containing1 -> contained1;
	containing2 -> contained1;
	containing2 -> contained2;
}
</div>

Entités (graphe)

</div>

<div class="column" style="font-size: 3em;">
&rarr;
</div>

<div class="column">

<p><img data-src="../image/logo/lucene.svg" class="logo" />

<div class="viz">
digraph {
	node [margin = 0.2, shape = record, style = rounded];
	rankdir = TB;

    # Note the "cluster" prefix is necessary to have the subgraph drawn.
    subgraph clusterBook1 {
      label = "Livre 1";
      style = rounded;
      book1_contained1 [label = "Auteur 1"];
    }

    # Note the "cluster" prefix is necessary to have the subgraph drawn.
    subgraph clusterBook2 {
      label = "Livre 2";
      style = rounded;
      book2_contained2 [label = "Auteur 2"];
      book2_contained1 [label = "Auteur 1", class = "highlight"];
    }
}
</div>

Documents (arbres)

</div>

@Notes:

1. Support limité des jointures dans Elasticsearch, et généralement déconseillé (pas toujours très rapide)
2. En pratique, on contourne le problème via la de-normalization
3. C'est en partie ça qui fait la performance d'Elasticsearch

-

<!-- .element: class="nested-fragments-highlight-current" -->
### Indexation d'entités Hibernate ORM

<div class="viz" data-viz-engine="neato" data-width="900"
        data-viz-images="../image/logo/elasticsearch-color-horizontal.svg,200px,100px">
digraph {
	node [margin = 0.2];

	app [label = "Application", pos = "-3,0!"];
	orm [label = "ORM", labelloc="t", pos = "0,0!"];
	db [shape=cylinder, label = "DB", pos = "5,0!"];

	app -> orm [label = "1. Modif. d'entité", headclip = false, arrowhead = none];
	orm -> db [headlabel = "1.1. INSERT/UPDATE", tailclip = false, labeldistance=10, labelangle=-6.0, class="fragment data-fragment-index_1"];

	hsearch [label = "Hibernate Search", pos = "0,-2!"];
    elasticsearch [shape=none, image="../image/logo/elasticsearch-color-horizontal.svg", label="", penwidth=0, pos = "5,-2!"];

	orm -> hsearch:nw [headlabel = "1.2. Evénement\nde modif.", style = dashed, tailclip = false, labeldistance=7, labelangle=50.0, class="fragment data-fragment-index_2"];
	orm -> hsearch:n [headlabel = "1.3. Evénement\nde pré-commit", style = dashed, tailclip = false, labeldistance=1, labelangle=180.0, class="fragment data-fragment-index_3"];
	hsearch -> db [headlabel = "(1.3.1. SELECT ...)", labeldistance=15, labelangle=-10.0, class="fragment data-fragment-index_3"];
	orm -> db [headlabel = "1.4. COMMIT", tailclip = false, labeldistance=10, labelangle=6.0, class="fragment data-fragment-index_4"];
    orm -> hsearch:ne [headlabel = "1.5. Evénement\nde post-commit", style = dashed, tailclip = false, labeldistance=7, labelangle=-50.0, class="fragment data-fragment-index_5"];
	hsearch -> elasticsearch [label = "1.5.1. PUT /book/_doc/1/", class="fragment data-fragment-index_5"];
}
</div>

@Notes:

1. Developer asks Hibernate ORM to persist entity changes
1. Hibernate ORM notifies Hibernate Search of changes (through a listener);
   Hibernate Search accumulates change events in the session
1. Before commit, Hibernate ORM notifies Hibernate Search again
1. Then Hibernate Search extracts information from entities and builds documents... but does not send them!
1. The transaction gets committed
1. After commit, Hibernate ORM notifies Hibernate Search again
1. Then Hibernate Search sends the indexing request to Elasticsearch
1. Indexing after commit means we won't erroneously update the index if a transaction rolls back
