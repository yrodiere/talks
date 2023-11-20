## Context

* Java
* Hibernate Object/Relational Mapper (ORM)
* Relational database
* <!-- .element: class="fragment" -->
  How to do text search?

@Notes:

Application with...

-

### `LIKE`/`ILIKE` for "full-text" search

```sql
SELECT * FROM entity
WHERE entity.textcontent ILIKE '%car%';
```

```sql
SELECT * FROM entity
WHERE lower(entity.textcontent) LIKE lower('%car%');
```

@Notes:

1. Switch to `hsearch-feature-examples/search-advanced`
2. ```shell script
   while read TEXT; do curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/search?brief=true' -G --data-urlencode "q=$TEXT" | jq ; done
   # Then type whatever you want, followed by <ENTER>
   car
   bike
   biking
   ```

-

### `LIKE`/`ILIKE`: downsides

* <!-- .element: class="fragment" -->
  False positives: "car" &rArr; "pi***car***d"
* <!-- .element: class="fragment" -->
  False negatives: "biking" &nrArr; "bike"
* <!-- .element: class="fragment" -->
  Feature-poor
* <!-- .element: class="fragment" -->
  Limited performance

@Notes:

* Feature-poor: no relevance sort, ...
* Limited performance: can't put an index on the column for wildcards before AND after the term

-

## Full-text inside the database ?

* <!-- .element: class="fragment" -->
  DB vendor coupling
* <!-- .element: class="fragment" -->
  Limited JPA integration
* <!-- .element: class="fragment" -->
  Features

@Notes:

* DB vendor coupling
  Each DB has its own SQL syntax for full-text search
* JPA integration
  Entity mapping: no JPA annotations;
  SQL queries: no Criteria bindings in JPA, no dedicated JPQL functions.
  (though Hibernate ORM is better in that area)
* Features
  Some are really powerful, like Postgres.
  But most are generic solutions,
  and even for the most advanced, compared to Elasticsearch,
  features are limited or have little flexibility.
  
  Examples of limitation:
  * Elasticsearch can "suggest" relevant words to add to a query. Can Postgresql?
  * list of "stop-words" (ignored words) is global or per session in MariaDB,
    not per index/column.

---

## Full-text search in the Lucene world

<img data-src="../image/logo/lucene.svg" class="logo" />
<p>
<img data-src="../image/logo/elasticsearch-color-horizontal.svg" class="logo" />
<img data-src="../image/logo/opensearch-monochrome.svg" class="logo" />

@Notes:
* Full-text: identifying text documents that match words provided by a user
* Lucene: Apache Foundation
* Elasticsearch implemented on top of Lucene, so concepts are similar
* Other full-text engines exist, concepts and word may differ

-

### Inverted index

Token | IDs
:---|:---
... | ...
car | Doc. 1 (pos. : 1, 42), Doc. 10 (pos. : 3, 5, 24)
careless | Doc. 5 (pos. : 2)
carl | Doc. 23 (pos. : 55, 57), Doc. 45 (pos. : 15)
... | ...

(doc. = document, pos. = position)

@Notes:
* Goal: being able, from a given token, to quickly determine all matching documents
* "inverted" index because token => IDs (value => key) instead of ID => tokens (key => value)
* Very simplified view. More complex in practice:
  * Optimizations (trees, segments, ...) (cf. <https://emmanuelbernard.com/presentations/inverted-index/>)
  * Additional data (scoring, "stored fields", ...)

-

### Analysis
<div class="viz">
digraph {
	rankdir = LR;

    # Note the "cluster" prefix is necessary to have the subgraph taken into account in the layout.
	subgraph clusterData1 {
        style = invis;
		node [shape = record, style = rounded, margin = 0.3];
        input [label = "driving a CAR"];
		stemmed [label = "{ driv | car }"];
	}

    # Note the "cluster" prefix is necessary to have the subgraph taken into account in the layout.
	subgraph clusterProcess {
      style = invis;
      tokenizer [label = "Tokenizer"];
      lowercase [label = "Lower case filter"];
      stemming [label = "Stemmer"]
      stopWords [label = "Stop-words filter"];
	}

    # Note the "cluster" prefix is necessary to have the subgraph taken into account in the layout.
	subgraph clusterData {
        style = invis;
		node [shape = record, style = rounded, margin = 0.3];
		tokenized [label = "{ driving | a | CAR }"];
		lowercased [label = "{ driving | a | car }"];
		stopped [label = "{ driving | car }"];
	}

	input -> tokenizer;
    tokenizer -> tokenized;
    tokenized -> lowercase;
    lowercase -> lowercased;
    lowercased -> stopWords;
    stopWords -> stopped;
    stopped -> stemming;
    stemming -> stemmed;
}
</div>

<div class="viz fragment">
digraph {
	rankdir = LR;
    node [shape = record, style = rounded, margin = 0.3];
    input [label = "They drive cars"];
    processing [shape = record, style = rounded, margin = 0.3, label = "..."];
    output [label = "{ driv | car }"];
	input -> processing;
	processing   -> output;
}
</div>

@Notes:
* Tokenization
  * The goal is to build an index allowing exact matches on tokens, because that's fast
  * Tokenization is the first step
  * Problem: "CAR" won't exactly match "cars"
* => Filtering
  * Makes search more approximate, so that slightly different tokens will still match
  * ... but also makes search more precise, avoiding nonsensical matches (e.g. stop-words)
  * Bilan: c'est mieux !

-

### Putting it all together
<div class="viz">
digraph {
	rankdir = LR;
	splines = ortho;

	subgraph {
		node [shape = record, style = rounded, margin = 0.2];
		query [label = "Raw text query"];
		analyzedQuery [label = "Tokens"];

		document [label = "Document ID\n+ raw text"];
		analyzedDocument [label = "Document ID\n+ tokens"];

		results [label = "Matching\ndocument IDs"];
	}

    index [label = "Inverted index\n(token &rArr; IDs)", shape = cylinder, margin = 0.2];

	subgraph {
		queryAnalysis [label = "Analysis"];
		documentAnalysis [label = "Analysis"];
		search [label = "Search"];
    }

	subgraph {
		rank = same;
		query;
		document;
	}

	subgraph {
		rank = same;
		queryAnalysis;
		documentAnalysis;
	}

	subgraph {
		rank = same;
		analyzedQuery;
		analyzedDocument;
	}

	subgraph {
		rank = same;
        index;
		search;
	}

	query -> queryAnalysis;
	queryAnalysis -> analyzedQuery;
	document -> documentAnalysis;
	documentAnalysis -> analyzedDocument;
	analyzedDocument -> index;
	index -> search;
	analyzedQuery -> search;
	search -> results;
}
</div>

@Notes:
* Text is analyzed, it's not "just" a stream of characters
* Analysis = extraction and "cleaning" of tokens
* Storing tokens in an inverted index gives fast read access
* Queries are analyzed just as indexed text => we can do exact matches