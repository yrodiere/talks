## Context

* Java 8+
* Hibernate Object/Relational Mapper
* Relational database
* Any framework: Spring Boot, Jakarta EE, ...


@Notes:

Application with...

-

## Goal

<div class="viz" data-viz-engine="neato">
digraph {
	rankdir = LR;
	splines = curves;

	node [margin = 0.2];

	subgraph {
		app [label = "Application", pos = "0,2!"];
		orm [label = "ORM", pos = "3,2!"];
		db [label = "DB", pos = "6,2!"];

		app -> orm [headlabel = "Create/Update/Delete", labeldistance="6"];
		orm -> app [headlabel = "Relational queries", labeldistance="5"];
		orm -> db [dir = both]
	}
	subgraph {
		node [class="fragment data-fragment-index_1"];
		edge [class="fragment data-fragment-index_1"];
	
		ftQuery [label = "Full-text engine?", pos = "3,-1!", style = dashed];
	
		ftQuery -> app [headlabel = "Full-text queries", labeldistance="7", style = dashed];
	}
	subgraph {
		node [class="fragment data-fragment-index_2"];
		edge [class="fragment data-fragment-index_2"];
		
		elasticsearch [label = "Elasticsearch", pos = "6,-1!", style = dashed];
		ftQuery -> elasticsearch [dir = both, style = dashed]
	}
	subgraph {
		node [class="fragment data-fragment-index_4"];
		edge [class="fragment data-fragment-index_4"];
		
		ftSync [label = "Sync? Mapping?", pos = "6,0.5!", style = dashed];
	
		db -> ftSync [arrowhead = false, style = dashed];
		ftSync -> elasticsearch [style = dashed];
	}
}
</div>

@Notes:

Flow of information

1. Starting point: DB => Relational queries, transactions
1. Add full-text search

Our approach:

1. ES: many features, don't reinvent the wheel
1. Two datastores... two truths?
1. Two writes => error prone
1. Automatic sync?
1. How to trigger the sync? Full reindexing every minute = bad...
1. How to map tables to documents?

---

## Hibernate Search

@Notes:

1. Java library
1. Integrates into Hibernate ORM
1. Solves the problems mentioned before

-

### `pom.xml`

```xml
<dependency>
   <groupId>org.hibernate.search</groupId>
   <artifactId>hibernate-search-mapper-orm</artifactId>
   <version>6.0.0.Alpha2</version>
</dependency>
<dependency>
   <groupId>org.hibernate.search</groupId>
   <artifactId>hibernate-search-backend-elasticsearch</artifactId>
   <version>6.0.0.Alpha2</version>
</dependency>
```

@Notes:

1. Using Apache Maven
1. Mapper maps entities to documents
1. Backend allows to index and query documents

-

### Minimal configuration

`persistence.xml`, `hibernate.properties`, `application.yaml`, ...

<pre><code data-trim data-noescape>
<span class="fragment">hibernate.search.default_backend = backend1</span>
<span class="fragment">hibernate.search.backends.backend1.type = elasticsearch</span>
<span class="fragment">hibernate.search.backends.backend1.host = https://elasticsearch.mycompany.com</span>
<span class="fragment">hibernate.search.backends.backend1.username = ironman
hibernate.search.backends.backend1.password = j@rV1s</span>
</code></pre>

@Notes:

1. Pick a name, make it the default
1. Pick a technology: we also support embedded Lucene
1. Cluster URL
1. If relevant, authentication

-

<!-- .element: class="grid nested-fragments-highlight-current-red" -->

### Mapping

<div class="column">
Java Entity
<pre><code class="lang-java" data-trim data-noescape>
<span class="fragment" data-fragment-index="1">@Indexed(index = "book")</span>
@Entity
public class Book {
	@Id
	@GeneratedValue
	private Long id;

	<span class="fragment" data-fragment-index="2">@FullTextField(analyzer = "cleaned_text")</span>
	<span class="fragment" data-fragment-index="3">@KeywordField(
			name = "title_sort",
			normalizer = "cleaned_keyword",
			sortable = Sortable.YES
	)</span>
	@Basic(optional = false)
	private String title;
}
</code></pre>
</div>

<div class="column">
Elasticsearch mapping
<pre><code class="lang-json" data-trim data-noescape>
<span class="fragment" data-fragment-index="1">{
  "dynamic" : "strict",
  "properties" : {
    <span class="fragment" data-fragment-index="2">"title" : {
  	"type" : "text",
  	"analyzer" : "cleaned_text"
    }</span><span class="fragment" data-fragment-index="3">,
    "title_sort" : {
  	"type" : "keyword",
  	"normalizer" : "cleaned_keyword"
    }</span>
  }
}
</span></code></pre>
</div>

@Notes:

1. Ordinary annotated entity used in ORM
1. Enable Hibernate Search indexing
1. Great! Empty documents.
1. Add a field, with its settings
1. Can add multiple fields with different settings
1. Entity => Document OK, what then?

-

### Analysis

<pre class="fragment" data-fragment-index="1"><code data-trim data-noescape>
hibernate.search.backends.backend1.analysis_configurer = myAnalysisConfigurer
</code></pre>

<pre><code class="lang-java" data-trim data-noescape>
<span class="fragment" data-fragment-index="1">@Component("myAnalysisConfigurer")</span>
public class MyAnalysisConfigurer implements ElasticsearchAnalysisConfigurer {
	@Override
	public void configure(
			ElasticsearchAnalysisDefinitionContainerContext context
	) {<span class="fragment" data-fragment-index="2">
		context.analyzer( "cleaned_text" ).custom()
				.withTokenizer( "whitespace" )
				.withCharFilters( "html_strip" )
				.withTokenFilters(
					"asciifolding", "lowercase", "stop", "porter_stem"
				);
		</span><span class="fragment" data-fragment-index="3">
		context.normalizer( "cleaned_keyword" ).custom()
				.withTokenFilters( "asciifolding", "lowercase" );</span>
	}
}
</code></pre>

@Notes:

1. Analyzers referenced in the mapping need to be defined
1. In HSearch, requires to implement a bean
1. Bean needs to be referenced in configuration
1. Supported: Spring DI, CDI, and raw reflection (`class.getConstructor().newInstance()`)
1. Now, let's add definitions!
1. And we're all set!

---

## Persisting *and* indexing

<pre><code class="lang-java" data-trim data-noescape>
EntityManager entityManager = ...;
EntityTransaction tx = entityManager.getTransaction();
tx.begin();
Book book1 = new Book();
book1.setTitle("The Hobbit");
entityManager.persist(book1);
tx.commit();<span class="fragment" data-fragment-index="1"> // Also triggers indexing</span>
</code></pre>

<span class="fragment" data-fragment-index="2">Also works for updates, deletes.</span>

@Notes:

1. This is how an entity is persisted in ORM
1. This is how an entity is persisted and then indexed in Elasticsearch

-

### Automatic indexing

<div class="viz" data-viz-engine="neato">
digraph {
	node [margin = 0.2];

	app [label = "Application", pos = "-3,0!"];
	orm [label = "ORM", labelloc="t", pos = "0,0!"];
	db [label = "DB", pos = "5,0!"];

	app -> orm [label = "Entity changes", headclip = false, arrowhead = none];
	orm -> db [label = "INSERT/UPDATE", tailclip = false];

	hsearch [label = "Hibernate Search", pos = "0,-2!"];
	elasticsearch [label = "Elasticsearch", pos = "5,-2!"];

	orm -> hsearch:nw [headlabel = "Change event", style = dashed, tailclip = false, class="fragment data-fragment-index_1"];
	orm -> hsearch:ne [headlabel = "Commit event", style = dashed, tailclip = false, class="fragment data-fragment-index_2"];
	hsearch -> elasticsearch [label = "PUT /book/_doc/1/", class="fragment data-fragment-index_3"];
}
</div>

@Notes:

1. User tells ORM to persist changes
1. ORM also notifies HSearch of changes
1. Search stores that information
1. On commit, ORM also notifies HSearch
1. Then HSearch sends the indexing requests to Elasticsearch
1. Indexing on commit means we don't introduce errors in the index on rollbacks

-

### Automatic bulking
<div class="viz">
digraph {
	rankdir = LR;
	node [margin = 0.25];

	change1 [label = "Change 1", shape = record, style = rounded];
	change2 [label = "Change 2", shape = record, style = rounded];
	change3 [label = "Change 3", shape = record, style = rounded];

	hsearch [label = "Hibernate Search"];
	elasticsearch [label = "Elasticsearch"];

	change1 -> hsearch;
	change2 -> hsearch;
	change3 -> hsearch;
	hsearch -> elasticsearch [label = "POST /_bulk/"];
}
</div>

---

<!-- .element: class="grid" -->

## De-normalization
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

<div class="column">
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

1. Little to no join support in Elasticsearch
1. Real-world usage requires de-normalization
1. How do we do that?

-

<!-- .element: class="grid nested-fragments-highlight-current-red" -->

<div class="column">
<pre><code class="lang-java" data-trim data-noescape>
@Entity
@Indexed(index = "book")
public class Book {
	<span class="fragment" data-fragment-index="1">@IndexedEmbedded(
		<span class="fragment"  data-fragment-index="3">includePaths = {"title", "text"}</span><span class="fragment" data-fragment-index="4">,
		storage = ObjectFieldStorage.NESTED</span>
	)</span>
	@OneToMany(mappedBy = "book")
	private List&lt;Chapter&gt; chapters;
	
	// ...
}
</code></pre>
<pre><code class="lang-java" data-trim data-noescape>
@Entity
public class Chapter {
	<span class="fragment" data-fragment-index="2">@FullTextField(analyzer = "cleaned_text")</span>
	private String title;
	<span class="fragment" data-fragment-index="2">@FullTextField(analyzer = "cleaned_text")</span>
	private String text;
	<span class="fragment" data-fragment-index="2">@GenericField</span>
	private Integer pageCount;
	
	// ...
}
</code></pre>
</div>

<div class="column">
<pre><code class="lang-json" data-trim data-noescape>
{
  "dynamic": "strict",
  "properties": {
    <span class="fragment" data-fragment-index="1">"chapters": {
      "type": <span class="fragment strike" data-fragment-index="4">"object"</span><span class="fragment" data-fragment-index="4">"nested"</span>,
      "properties" : {<span class="fragment" data-fragment-index="2">
         "title": ...,
         "text": ...,
         <span class="fragment strike" data-fragment-index="3">"pageCount": ...</span>
      </span>}
    }</span>
  }
}
</span></code></pre>
</div>

@Notes:

1. Same model as before, except...
1. We now have an association: list of chapters
1. First add @IndexedEmbedded
1. Empty embedded?
1. Also @Field on relevant properties
1. Several settings
1. For example restrict embedded paths
1. Or change the storage
1. Essentially nested means we keep the structure

-

### Automatic reindexing

<pre><code class="lang-java" data-trim data-noescape>
EntityManager entityManager = ...;
EntityTransaction tx = entityManager.getTransaction();
tx.begin();
Chapter chapter1 = entityManager.find(Chapter.class, 1);
chapter1.setTitle("A modified title");
tx.commit();<span class="fragment"> // Reindexes the *Book*</span>
</code></pre>

@Notes:

1. Let's update an embedded object
1. Chapter title is embedded in the book
1. But... No change event for the Book?
1. No problem, HSearch knows what to do (thanks to mapping + ORM metadata)
1. Book gets reindexed as expected

---

## Searching

<pre><code class="lang-java" data-trim data-noescape>
String userInput = /*...*/;
EntityManager entityManager = /*...*/;
<span class="fragment">FullTextEntityManager fullTextEM =
		Search.getFullTextEntityManager(entityManager);</span>

<span class="fragment">FullTextQuery&lt;Book&gt; query =
		fullTextEM.search(Book.class).query()</span>
		<span class="fragment">.asEntity()</span>
		<span class="fragment">.predicate(f ->
		 	f.match().onField("title").matching(userInput).toPredicate()
		)</span>
		<span class="fragment">.build();</span>

<span class="fragment">List&lt;Book&gt; results = query.getResultList();</span>
</code></pre>

@Notes:

1. Searching could use Elasticsearch APIs directly
1. But a Java API is nice: type-safety, auto-completion, no string parsing
1. Ordinary setup: user input + entity manager (session)
1. Need to access HSearch APIs
1. From there, start a search query on Book class (Book.class, not "book")
1. Gets interesting: we request entities as results (not documents)
1. We define a predicate (f is a "predicate factory")
1. Build the query
1. Get the results: they are managed entities! (i.e. lazy loading, etc.)

-

### Automatic retrieval of entities

<div class="viz" data-viz-engine="neato">
digraph {
	splines = polyline;

	node [margin = 0.2];

	app [label = "Application", pos = "-4,-2!"];
	orm [label = "ORM", labelloc="t", pos = "0,0!"];
	db [label = "DB", pos = "4,0!"];

	hsearch [label = "Hibernate Search", labelloc="b", pos = "0,-2!"];
	elasticsearch [label = "Elasticsearch", pos = "4,-2!"];

	orm -> hsearch [label = "Managed entities", tailclip = false, headclip = false, class="fragment data-fragment-index_2"];
	db -> orm [headclip = false, arrowhead = none, class="fragment data-fragment-index_2"];
	elasticsearch -> hsearch [taillabel = "Hits", headclip = false, class="fragment data-fragment-index_1"];
	hsearch -> app [label = "Search results", tailclip = false, class="fragment data-fragment-index_3"];
}
</div>

@Notes:

1. How does it work?
1. First, HSearch retrieves hits from Elasticsearch
1. Then, from the document IDs, it retrieves the entities
1. Finally it returns the results
1. Obviously requires access to the DB
1. If you don't want that...

-

<!-- .element: class="grid" -->

### Projection and sort

<pre><code class="lang-java nested-fragments-highlight-current-red" data-trim data-noescape>
@KeywordField(
	normalizer = "cleaned_text"<span class="fragment" data-fragment-index="1">,
	projectable = Projectable.YES,
	sortable = Sortable.YES</span>
)
private String title;
</code></pre>

<pre><code class="lang-java" data-trim data-noescape>
<span class="fragment">FullTextQuery&lt;String&gt; query =
		fullTextEM.search(Book.class).query()
		<span class="fragment">.asProjection(f ->
			f.field("title", String.class)
			.toProjection()
		)</span>
		<span class="fragment">.predicate(f ->
			f.match().onField("title")
			.matching(userInput)
			.toPredicate()
		)</span>
		<span class="fragment">.sort(f ->
			f.byField("category")
			.then().byScore()
		)
		.build();</span>

<span class="fragment">List&lt;String&gt;&gt; results = query.getResultList();</span></span>
</code></pre>

@Notes:

1. Must mark the field as sortable in mapping
1. Start building the query as usual
1. For a projection: instead of asEntity, asProjection
1. Here we project on the field directly
1. Then after the predicate add a sort
1. Here we sort on the field directly
1. Then build the query as usual
1. Result type according to the projection

-

<!-- .element: class="grid" -->

### And more...

```java
.predicate(f ->
	f.bool()
	.must(f.match()
			.onField("title")
			.matching("ring"))
	.must(f.range()
			.onField("pageCount")
			.from(200).to(500))
	.toPredicate()
)
```
```java
.predicate(f ->
	f.spatial().within()
	.onField("location")
	.circle(
			45.7515926, 4.8514779,
			1.5, DistanceUnit.KILOMETERS
	)
	.toPredicate()
)
```
```java
FullTextQuery<Pair<String, Float>> query =
		fullTextEM.search(Book.class).query()
		.asProjection(f ->
				f.composite(
					Pair::new,
					f.field("title", String.class),
					f.score()
				)
		)
		...
```

@Notes:

1. Boolean junctions
1. Spatial predicates
1. Composite, type-safe projections

---

## Still got time?

-

### Index lifecycle

<pre><code data-trim data-noescape>
hibernate.search.backends.index_defaults.lifecycle.strategy = create
</code></pre>

* `none`
* `create`
* `validate`
* `update`
* `drop-and-create`
* `drop-and-create-and-drop` (tests)

@Notes:

* Explain each strategy

-

### Mass indexing

<pre><code class="lang-java" data-trim data-noescape>
FullTextEntityManager fullTextEM = Search.getFullTextEntityManager(em);
fullTextEM.createIndexer(Book.class)
		<span class="fragment">.purgeAllOnStart(true)
		.typesToIndexInParallel(2)
		.batchSizeToLoadObjects(25)
		.idFetchSize(150)
		.threadsToLoadObjects(30)
		.cacheMode(CacheMode.IGNORE)</span>
		.startAndWait();
</code></pre>

@Notes:

1. Will reindex every Book (may take some time)
1. Many options to tune it

---

## To give it a try...

* Still in Alpha
* Reports and contributions welcome
* Demo at <https://github.com/hibernate/hibernate-demos/tree/master/hibernate-search/hsearch-elasticsearch-wikipedia>
* For production, see Search 5 (embedded Lucene mode)

@Notes:

1. Alpha:
   * Serious limitations (not all field types, missing features)
   * APIs unstable
1. Search 5:
   * Different APIs
   * Elasticsearch support is experimental
