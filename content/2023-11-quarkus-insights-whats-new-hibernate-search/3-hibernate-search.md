## Hibernate Search

ORM. Elasticsearch. Integrated.

@Notes:

1. Java library
1. Integrates into Hibernate ORM
1. Solves problems mentioned earlier

-

<!-- .element: class="nested-fragments-highlight-current" -->
### Listener-triggered indexing

<div class="viz" data-viz-engine="neato" data-width="900"
        data-viz-images="../image/logo/elasticsearch-color-horizontal.svg,200px,100px">
digraph {
	node [margin = 0.2];

	app [label = "Application", pos = "-3,0!"];
	orm [label = "ORM", labelloc="t", pos = "0,0!"];
	db [shape=cylinder, label = "DB", pos = "5,0!"];

	app -> orm [label = "1. Entity change", headclip = false, arrowhead = none];
	orm -> db [headlabel = "1.1. INSERT/UPDATE", tailclip = false, labeldistance=10, labelangle=-6.0, class="fragment data-fragment-index_1"];

	hsearch [label = "Hibernate Search", pos = "0,-2!"];
    elasticsearch [shape=none, image="../image/logo/elasticsearch-color-horizontal.svg", label="", penwidth=0, pos = "5,-2!"];

	orm -> hsearch:nw [headlabel = "1.2. Change event", style = dashed, tailclip = false, labeldistance=7, labelangle=50.0, class="fragment data-fragment-index_2"];
	orm -> hsearch:n [headlabel = "1.3. Pre-commit event", style = dashed, tailclip = false, labeldistance=1, labelangle=180.0, class="fragment data-fragment-index_3"];
	hsearch -> db [headlabel = "(1.3.1. SELECT ...)", labeldistance=15, labelangle=-10.0, class="fragment data-fragment-index_3"];
	orm -> db [headlabel = "1.4. COMMIT", tailclip = false, labeldistance=10, labelangle=6.0, class="fragment data-fragment-index_4"];
    orm -> hsearch:ne [headlabel = "1.5. Post-commit event", style = dashed, tailclip = false, labeldistance=7, labelangle=-50.0, class="fragment data-fragment-index_5"];
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

-

<!-- .element data-visibility="hidden" -->
### Implicit *bulking*
<div class="viz" data-viz-images="../image/logo/elastic-search-logo-color-horizontal.svg,200px,100px">
digraph {
	rankdir = LR;
	node [margin = 0.25];

	change1 [label = "Doc. 1 update", shape = record, style = rounded];
	change2 [label = "Doc. 2 update", shape = record, style = rounded];
	change3 [label = "Doc. 3 update", shape = record, style = rounded];

	hsearch [label = "Hibernate Search"];
    elasticsearch [shape=none, image="../image/logo/elastic-search-logo-color-horizontal.svg", label="", penwidth=0];

	change1 -> hsearch;
	change2 -> hsearch;
	change3 -> hsearch;
	hsearch -> elasticsearch [label = "POST /_bulk/"];
}
</div>

-

<!-- .element: class="grid" -->
## De-normalization
<div class="column">
<div class="viz">
digraph {
	node [margin = 0.2, shape = record, style = rounded];
	rankdir = TB;

	entity1 [label = "Book"];
	entity2 [label = "Author 1"];
	entity3 [label = "Author 2"];
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

	document [label = "Single document"];
}
</div>
</div>

@Notes:

1. Limited support for joins in Elasticsearch, and generally not recommended (performs badly)
2. In practice, no need for joins: we de-normalize data
3. This is, in part, what makes Elasticsearch so fast

-

<!-- .element class="grid" -->
## And much more...

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

<div class="viz" data-viz-engine="neato" data-viz-images="../image/logo/elastic-search-logo-color-horizontal.svg,200px,100px">
digraph {
	splines = polyline;

	node [margin = 0.2];

	app [label = "Application", pos = "-4,-2!"];
	orm [label = "ORM", labelloc="t", pos = "0,0!"];
	db [shape=cylinder, label = "DB", pos = "4,0!"];

	hsearch [label = "Hibernate Search", labelloc="b", pos = "0,-2!"];
    elasticsearch [shape=none, image="../image/logo/elastic-search-logo-color-horizontal.svg", label="", penwidth=0, pos = "4,-2!"];

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
