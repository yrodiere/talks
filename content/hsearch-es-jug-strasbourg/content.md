## Le problème à résoudre

* Application Hibernate ORM
* Recherche dans des données textuelles

-

### Solution naïve: ILIKE

```sql
SELECT * FROM entity
WHERE entity.textcontent ILIKE '%car%';
```

-

### Démo

Recherche full-text naïve

@Notes:
* http://localhost:8080/page/search?q=car
* Plusieurs secondes !
* http//localhost:8080/page/12 (Anarchism)
   "Carl", "careless" => Faux positif...

-

### Bilan

* Faux positifs
* Pas de tri par pertinence
* En fait, ça manque de finesse

---

## La recherche full-text

<img data-src="../image/logo/lucene.svg" class="logo lucene" />
<img data-src="../image/logo/elasticsearch_large_reverse.png" class="logo elasticsearch" />

@Notes:
* Full-text: « consiste pour le moteur de recherche à examiner tous les mots de chaque document enregistré et à essayer de les faire correspondre à ceux fournis par l'utilisateur »
* Lucene: Fondation Apache
* Elasticsearch utilise Lucene en interne, donc même combat
* D'autres implémentations de moteurs full-text existent, vocabulaire différent

-

### Principe
<div class="viz">
digraph {
	rankdir = LR;
	splines = ortho;

	subgraph {
		node [shape = record, style = rounded, margin = 0.2];
		query [label = "Requête"];
		documents [label = "Documents"];
		analyzedQuery [label = "Requête\nanalysée"];
		results [label = "Résultats"];
		index [label = "Index"];
	}

	subgraph {
		rank = same;
		queryAnalysis [label = "Analyse"];
		documentAnalysis [label = "Analyse"];
	}

	subgraph {
		rank = same;
		queryExecution [label = "Exécution"];
		index;
	}

	query -> queryAnalysis;
	queryAnalysis -> analyzedQuery;
	documents -> documentAnalysis;
	documentAnalysis -> index;
	index -> queryExecution;
	analyzedQuery -> queryExecution;
	queryExecution -> results;
}
</div>

@Notes:
* On analyse les données texte, on ne les considère plus comme « juste » une suite de caractères
* Analyse = extraction et « nettoyage » de tokens.
* On stocke les tokens de manière optimisée (accès rapide, surtout en lecture)
* On analyse les requêtes de la même manière => tokens correspondants

-

### Inverted index

Token | Emplacement
:---|:---
... | ...
car | Doc. 1 (pos. : 1, 42), Doc. 10 (pos. : 3, 5, 24)
careless | Doc. 5 (pos. : 2)
carl | Doc. 23 (pos. : 55, 57), Doc. 45 (pos. : 15)
... | ...

(doc. = document, pos. = position)

@Notes:
* But : pouvoir, à partir d'un token donné, retrouver rapidement l'ensemble des documents qui le contiennent
* « Inversé » parce que contenu => référence (valeur => clé), au lieu de référence => contenu (clé => valeur)
* Vue très simplifiée. En pratique, plus complexe :
 * Optimisations (arbres, segments, ...) (cf. <https://emmanuelbernard.com/presentations/inverted-index/>)
 * Données supplémentaires (scoring, "stored fields", ...)

-

### Analyse, partie 1 : tokenization
<div class="viz">
digraph {
	rankdir = LR;

	tokenizer [label = "Tokenizer"];

	subgraph {
		node [shape = record, style = rounded, margin = 0.2];
		input [label = "a big car"];
		output [label = "{ a | big | car }"];
	}

	input -> tokenizer;
	tokenizer -> output;
}
</div>

@Notes:
* Plus précis que '%car%'
* ... donc permet moins d'approximations ('CAR', 'cars', ...)
* => Filtering

-

### Analyse, partie 2 : Filtering
<div class="viz fragment">
digraph {
	rankdir = LR;

	lowercase [label = "Lower case filter"];

	subgraph {
		node [shape = record, style = rounded, margin = 0.2];
		input [label = "{ A | BIG | CaR}"];
		output [label = "{ a | big | car }"];
	}

	input -> lowercase;
	lowercase -> output;
}
</div>
<div class="viz fragment">
digraph {
	rankdir = LR;

	asciiFolding [label = "ASCII folding filter"];

	subgraph {
		node [shape = record, style = rounded, margin = 0.2];
		input [label = "{ bon | appétit }"];
		output [label = "{ bon | appetit }"];
	}

	input -> asciiFolding;
	asciiFolding -> output;
}
</div>
<div class="viz fragment">
digraph {
	rankdir = LR;

	stemming [label = "Stemmer"]

	subgraph {
		node [shape = record, style = rounded, margin = 0.2];
		input [label = "{ two | tuned | cars }"];
		output [label = "{ two | tun | car }"];
	}

	input -> stemming;
	stemming -> output;
}
</div>
<div class="viz fragment">
digraph {
	rankdir = LR;

	stopWords [label = "Stop-words filter"];

	subgraph {
		node [shape = record, style = rounded, margin = 0.2];
		input [label = "{ a | big | car }"];
		output [label = "{ big | car }"];
	}

	input -> stopWords;
	stopWords -> output;
}
</div>

Et caetera, et caetera. <!-- .element: class="fragment" -->

@Notes:
* Permet de rendre la recherche plus "floue", faire correspondre entre eux des mots différents
* ... mais aussi de rendre la recherche plus précise, en évitant des correspondances qui n'ont pas lieu d'être (ex. : stop-words)
* Bilan: c'est mieux ! Mais...

---

## Intégration à un ORM : problématiques

@Notes:
* Full-text via Lucene, mais données gérées par Hibernate ORM !

-

### Synchronisation des index
<div class="viz">
digraph {
	rankdir = LR;
	nodesep = 0.5;
	splines = polyline;

	node [margin = 0.2];

	subgraph {
		app [label = "Application"];
		subgraph {
			rank = same;
			invBalance1 [style = invis];
			invDb [style = invis];
			hsearch [label = "???", style = dashed];
		}
		subgraph {
			rank = same;
			node [shape = record, style = rounded];
			db [label = "BDD"];
			index [label = "Index"];
		}
	}
	
	app -> invBalance1 [style = invis];
	app -> invDb [headclip = false, arrowhead = none, headlabel = "Écriture"];
	app -> hsearch [style = invis];

	invBalance1 -> invDb [style = invis];
	invDb -> hsearch [style = dashed, tailclip = false];

	invDb -> db [tailclip = false];
	hsearch -> index [style = dashed];
}
</div>

@Notes:
* Encore faut-il pouvoir convertir les données...

-

### Mapping Entité &harr; Document
<div class="viz">
digraph {
	rankdir = LR;
	nodesep = 1.5;

	subgraph {
		node [shape = record, style = rounded, margin = 0.2];
		entity [label = "Entité"];
		tuples [label = "Tuple(s)"];
		document [label = "Document"];
	}

	subgraph {
		orm [label = "ORM"];
		hsearch [label = "???", style = dashed];
	}

	entity -> orm [dir = both];
	orm -> tuples [dir = both];
	entity -> hsearch [dir = both, style = dashed];
	hsearch -> document [dir = both, style = dashed];
}
</div>

@Notes:
* Nécessaire car le moteur full-text (Lucene comme ES) ne comprend pas les POJO, il a son propre format de données ("Document")
* Problématiques:
 * Dénormalisation: le contenu d'une entité peut finir dans plusieurs documents
 * Encodage: comment indexer un enum... ?
 * Conversion des résultats de recherches en entités managées

<!--
-

### Réconciliation des résultats
<div class="viz">
digraph {
	rankdir = RL;
	nodesep = 0.5;

	app [label = "Application"];
	hsearch [label = "???"];

	subgraph {
		node [shape = plaintext];
		entity [label = "Entité"];
		document [label = "Document"];
	}

	subgraph {
		rank = same;
		index [label = "Index"];
		db [label = "BDD"];
		inv1 [style = invis];
	}

	index -> document [arrowhead = none];
	document -> hsearch;
	db -> hsearch;
	inv1 -> hsearch [style = invis];
	hsearch -> entity [arrowhead = none, style = dashed];
	entity -> app [style = dashed];
}
</div>
-->

---

## Le full-text dans la base de données ?

* <!-- .element: class="fragment" --> Avantage : synchronisation des index facilitée (triggers)
* <!-- .element: class="fragment" --> Mais...
 * <!-- .element: class="fragment" --> Couplage fort avec un SGBD précis
 * <!-- .element: class="fragment" --> Recherche: requêtes SQL natives  
  (ou ajouts à la syntaxe HQL/JPQL)
 * <!-- .element: class="fragment" --> Mapping **table** &rarr; document : admin. BDD
 * <!-- .element: class="fragment" --> Technologies parfois moins matures que Lucene

@Notes:

 * Manque de maturité: recherche de phrase dans PostgreSQL 9.6, en septembre 2016...

---

## Hibernate Search

<img data-src="../image/logo/hibernate_large.png" class="logo hibernate" />
+
<img data-src="../image/logo/lucene.svg" class="logo lucene" />

* Synchronisation des index transparente (événements Hibernate ORM) <!-- .element: class="fragment" -->
* Mapping entité &harr; document déclaratif (annotations) <!-- .element: class="fragment" -->
* ... et bien plus <!-- .element: class="fragment" -->

@Notes:
* et bien plus: débuté en 2007, en évolution permanente depuis

-

### Activation

Maven :

```xml
<dependency>
	<groupId>org.hibernate</groupId>
	<artifactId>hibernate-search-orm</artifactId>
	<version>5.8.0.Beta1</version> <!-- Hibernate ORM 5.2.3+ seulement ! -->
</dependency>
```

Conf. minimale (`hibernate.properties` ou `persistence.xml`) :

```
# Emplacement des index Lucene
hibernate.search.default.indexBase /path/to/indexes/
```

@Notes:
* Activé automatiquement si présent dans le classpath

-

### Indexation

Automatique, en fin de transaction:

```java
entityManager.persist( page ); // Ajoutera un document à l'index
entityManager.merge( page ); // Mettra à jour le document indexé
entityManager.remove( page ); // Supprimera le document indexé
```

@Notes:
* le cascading est bien entendu géré.
* Automatiquement, mais il faut quand même assigner un index à l'entité ! (cf. suite)

-

<!-- .element: class="grid" -->

### Mapping Entité &harr; Document

<pre><code class="lang-java" data-trim data-noescape>
@Entity
<mark>@Indexed</mark>
public class Page {

	@Id
	private Long id;

	@Basic(optional = false)
	<mark>@Field</mark>
	private String title;

	// ...

}
</code></pre>

```
# Document de l'index "Page"
id: <contenu de "id">
title: <contenu de "title">
...
```

-

<!-- .element: class="grid" -->

### Mapping Entité &rarr; Document : `@Field`

<pre><code class="lang-java" data-trim data-noescape>
@Basic
@Field(<mark>name</mark> = "customCountName")
private Integer count;

<mark>@Field</mark>
@Transient
public String getFoo() {
	// ...
}
</code></pre>

```
# Document
...
customCountName: <contenu de "count">
foo: <résultat tiré de getFoo()>
...
```

@Notes:
* Fonctionne aussi sur les getters (getFoo())
 * même si pas lié à une propriété
 * attention aux performances avec @Transient (désactive les optimisations)

-

<!-- .element: class="grid" -->

### Mapping Entité &rarr; Document : `@IndexedEmbedded`

<pre><code class="lang-java" data-trim data-noescape>
@Entity
@Indexed
public class Page {
	// ...
	@Basic
	@Field
	private String title;

	@OneToMany(mappedBy = "page")
	<mark>@IndexedEmbedded</mark>(prefix = "sctn.")
	private List&lt;Section&gt; sections;
	// ...
}
</code></pre>

<pre><code class="lang-java" data-trim data-noescape>
@Entity
public class Section {
	// ...
	@Basic
	@Field
	private String name;

	@ManyToOne
	<mark>@ContainedIn</mark>
	private Page page;
	// ...
}
</code></pre>

```
# Document de l'index "Page"
...
title: <titre de la page>
sctn.name: <nom section 1>
sctn.name: <nom section 2>
sctn.name: <nom section 3>
```

@Notes:
* Pas besoin de @Indexed sur Section, mais besoin de @Field
* @ContainedIn nécessaire pour mettre à jour le parent lorsque l'enfant est modifié
* Attention, dénormalisation: sctn.name est multivalué

-

### Définition des analyzers

<pre><code class="lang-java" data-trim data-noescape>
@Entity
@Indexed(index = "page")
<mark>@AnalyzerDef</mark>(
	name = "cleaned_text",
	tokenizer = @TokenizerDef(factory = WhitespaceTokenizerFactory.class),
	filters = {
		@TokenFilterDef(factory = ASCIIFoldingFilterFactory.class),
		@TokenFilterDef(factory = LowerCaseFilterFactory.class),
		@TokenFilterDef(factory = StopFilterFactory.class)
	}
)
public class Page {
// ...
</code></pre>

@Notes:
* Analyzers disponibles : <https://docs.jboss.org/hibernate/stable/search/reference/en-US/html_single/#_available_analyzers>

-

### Affectation des analyzers

<pre><code class="lang-java" data-trim data-noescape>
@Entity
@Indexed(index = "page")
public class Page {

	@Id
	private Long id;

	@Basic(optional = false)
	@Field(<mark>analyzer = @Analyzer(definition = "cleaned_text")</mark>)
	private String title;

	// ...

}
</code></pre>

-

### Recherche

<pre><code class="lang-java" data-trim data-noescape>
<div class="fragment">FullTextEntityManager fullTextEm =
		Search.getFullTextEntityManager( entityManager );</div>
<div class="fragment">QueryBuilder queryBuilder = fullTextEm.getSearchFactory()
		.buildQueryBuilder()
		.forEntity( Page.class ).get();</div>
<div class="fragment">org.apache.lucene.search.Query luceneQuery = queryBuilder.keyword()
		.onField( "title" ).boostedTo( 2.0f )
		.andField( "content" )
		.matching( term )
		.createQuery();</div>
<div class="fragment">javax.persistence.Query query =
		fullTextEm.createFullTextQuery( luceneQuery, Page.class )
		.setFirstResult( offset ).setMaxResults( limit );</div>
<div class="fragment">List&lt;Page&gt; results = query.getResultList();</div>
</code></pre>


@Notes:

 * Les résultats sont des instances managées par Hibernate ORM !

-

### Tri

Tri par défaut : par pertinence (score).

Si besoin de tris spécifiques :

```java
// ...

Sort sort = queryBuilder.sort()
		.byField( "lastContributor.username" )
			.onMissingValue().sortLast()
		.andByScore()
		.createSort();

FullTextQuery query =
		fullTextEm.createFullTextQuery( luceneQuery, Page.class )
		.setFirstResult( offset ).setMaxResults( limit )
		.setSort( sort );

return query.getResultList();
```

-

### Démo

Hibernate Search + Lucene

@Notes:

* http://localhost:8080/page/search?q=car
* Beaucoup plus rapide
* Meilleurs résultats (triés !)
* Possible d'utiliser plusieurs termes
  http://localhost:8080/page/search?q=car%20race
* Pas de faux positifs (Anarchisme ne matche pas)

---

## Scalabilité horizontale
<div class="viz">
digraph {
	rankdir = TB;

	node [margin = 0.2];

	subgraph {
		rank = same;
		app1 [label = "Application\nInstance 1"];
		app2 [label = "Application\nInstance 2"];
	}

	subgraph {
		rank = same;
		node [shape = record, style = rounded];
		db1 [label = "BDD\nInstance 1"];
		index1 [label = "Index\nInstance 1"];
		db2 [label = "BDD\nInstance 2"];
		index2 [label = "Index\nInstance 2"];
	}

	app1 -> db1;
	app2 -> db2;

	app1 -> index1;
	app2 -> index2;

}
</div>

@Notes:

* Clustering BDD:
 * PostgreSQL: PgPool, PostgresXL, ... <https://wiki.postgresql.org/wiki/Replication,_Clustering,_and_Connection_Pooling>
 * Oracle RAC <https://www.oracle.com/database/real-application-clusters/index.html> 

-

* L'index Lucene est local, non partagé
* Solutions existent : <!-- .element: class="fragment" -->
 * <!-- .element: class="fragment" --> Master/slave avec [JMS ou JGroups](https://docs.jboss.org/hibernate/stable/search/reference/en-US/html_single/#_back_end)
 * <!-- .element: class="fragment" --> Stockage des index dans [Infinispan](https://docs.jboss.org/hibernate/stable/search/reference/en-US/html_single/#infinispan-directories)
 * <!-- .element: class="fragment" --> ... mais un peu complexe.

---

## Hibernate Search et Elasticsearch

<img data-src="../image/logo/hibernate_large.png" class="logo hibernate" />
+
<img data-src="../image/logo/elasticsearch_large_reverse.png" class="logo elasticsearch" />

-

### Activation

Maven :

```xml
<dependency>
	<groupId>org.hibernate</groupId>
	<artifactId>hibernate-search-orm</artifactId>
	<version>5.8.0.Beta1</version> <!-- Hibernate ORM 5.2.3+ seulement ! -->
</dependency>
<dependency>
	<groupId>org.hibernate</groupId>
	<artifactId>hibernate-search-elasticsearch</artifactId>
	<version>5.8.0.Beta1</version> <!-- Même version -->
</dependency>
```

Configuration Hibernate ORM :

```
# Utiliser Elasticsearch au lieu de Lucene
hibernate.search.default.indexmanager elasticsearch
# Autoriser à travailler sur des clusters sans réplication (1 seul noeud)
hibernate.search.default.required_index_status yellow
# Points d'accès au cluster
hibernate.search.default.elasticsearch.host http://127.0.0.1:9200
```

@Notes:

 * Hôtes: possibilité d'authentification (préférer SSL !)
 * Hôtes: load-balancing (+ bientôt failover)

-

<!-- .element: class="grid" -->

### Mapping Entité &rarr; Document

<pre><code class="lang-java" data-trim data-noescape>
@Entity
@Indexed(index = "page")
public class Page {

	@Id
	private Long id;

	@Basic(optional = false)
	@Field
	private String title;

	@OneToMany(mappedBy = "page")
	@IndexedEmbedded(prefix = "sctn.")
	private List&lt;Section&gt; sections;

	// ...

}
</code></pre>

```json
{
 "id": <contenu de "id">,
 "title": <contenu de "title">,
 "sctn": [
   {
    "name": <nom section 1>
   },
   {
    "name": <nom section 2>
   },
   ...
 ]
}
```

@Notes:
* pas de changement d'annotations!

-

### Schéma Elasticsearch

```
hibernate.search.default.elasticsearch.index_schema_management_strategy
```

* `create` (défaut)
* `validate`
* `none`
* ...

@Notes:
* similaire à hbm2ddl dans Hibernate ORM
* permet de contrôler la création/validation/mise à jour/etc. du schéma au lancement

-

### Définition des analyzers

* Définitions « Lucene » traduites automatiquement
* Mais définitions natives disponibles :

<pre><code class="lang-java" data-trim data-noescape>
@AnalyzerDef(
	name = "my-analyzer",
	tokenizer = @TokenizerDef(
		factory = <mark>ElasticsearchTokenizerFactory.class</mark>,
		params = @Parameter(name = "type", value = "'whitespace'")
	)
	filters = {
		...
		@TokenFilterDef(
			<mark>name</mark> = "my_stop_token_filter", 
			factory = <mark>ElasticsearchTokenFilterFactory.class</mark>,
			params = {
					// Attention, les paramètres sont en JSON !
					@Parameter(name = "type", value = "'stop'"),
					@Parameter(name = "stopwords", value = "['foo', 'bar']")
			}
		)
	}
)
</code></pre>

@Notes:
* Un point d'extension existe pour définir les analyzer programmatiquement (pour l'instant expérimental)

-

### Indexation

* Toujours transparente (au `persist()`, etc.)
* Groupage automatique des appels (Bulk API)
* Forcer le rafraîchissement immédiat (**impacte les perf.**) :
```
hibernate.search.default.elasticsearch.refresh_after_write true
```

-

### Recherche

* <!-- .element: class="fragment" --> Le DSL est aussi compatible avec Elasticsearch !
```
queryBuilder.keyword()
		.onField( "title" ).boostedTo( 2.0f )
		.andField( "content" )
		.matching( term )
		.createQuery();
```
* <!-- .element: class="fragment" --> Mais requêtes natives possibles :
```java
QueryDescriptor esQuery = ElasticsearchQueries.fromJson(
		"{ 'query': { 'match' : { 'title' : 'car' } } }"
		);
FullTextQuery query =
		fullTextEm.createFullTextQuery( esQuery, Page.class )
		.setFirstResult( offset ).setMaxResults( limit )
		.setSort( sort );
List<Page> results = query.getResultList();
```

-

### Découverte automatique

```
hibernate.search.default.elasticsearch.discovery.enabled true
```

-

### Démo

Hibernate Search + Elasticsearch

@Notes:

* Montrer code
* Montrer que les index sont créés auto. (mappings + settings)
* Montrer que les index sont remplis auto.
* Montrer les résultats de recherches
* Lancer une deuxième instance ES et montrer qu'elle est détectée par le client

---

## Aller plus loin

-

### Indexation - gros volume

Le _mass indexer_ :

```java
FullTextEntityManager fullTextEm = Search.getFullTextEntityManager( em );
fullTextEm.createIndexer( Page.class, User.class )
	.purgeAllOnStart( true )
	.typesToIndexInParallel( 2 )
	.batchSizeToLoadObjects( 25 )
	.idFetchSize( 150 )
	.threadsToLoadObjects( 30 )
	.cacheMode( CacheMode.IGNORE )
	.start(); // ou startAndWait() pour appel synchrone
```

-

### Types de requêtes courants

* Intervalle :
```java
queryBuilder.range().onField( "count" ).from( 12 ).to( 15 ).createQuery();
```
* Phrase :
```java
queryBuilder.phrase().withSlop( 1 ).onField( "content" )
	.sentence( "a big car" ).createQuery();
```
* Booléenne :
```java
queryBuilder.bool()
	.should( subquery1 )
	.should( subquery2 )
	.createQuery();
```

-

### Projections

<pre><code class="lang-java" data-trim data-noescape>
@Entity
@Indexed(index = "page")
public class Page {
	@Id
	private Long id;

	@Basic(optional = false)
	@Field(<mark>store = Store.YES</mark>)
	private String title;
	// ...
}
</code></pre>

```java
// ...
javax.persistence.Query query =
		fullTextEm.createFullTextQuery( luceneQuery, Page.class )
		.setProjection( ProjectionConstants.ID, "title" );

List<Object[]> results = query.getResultList();

Object[] firstResult = results.get( 0 );
Long id = (Long) firstResult[0];
String title = (String) firstResult[1];
```

-

### Field bridges personnalisés

```java
@Basic
@Field(bridge = @FieldBridge(impl = MyCustomTypeBridge.class))
private MyCustomType myProperty;
```

```java
public class MyCustomTypeBridge implements StringBridge {

	@Override
	public String objectToString(Object object) {
		MyCustomType value = (MyCustomType) object;
		return value.getSomeString();
	}

}
```

-

### Et bien plus

 * Recherche spatiale
 * Faceting
 * Filtres
 * Multi-tenant
 * Dynamic sharding
 * ...

---

## Hibernate Search, et après ?

* 5.8 (en cours) :
 * Elasticsearch 5
 * Définition programmatique des analyzers
 * Simple Query String : `"foo AND NOT bar*"`
* 6.0 :
 * APIs plus indépendantes de Lucene
 * Hibernate ORM 6
 * Lucene 7
 * ...

Et toujours intégré à Hibernate OGM !
