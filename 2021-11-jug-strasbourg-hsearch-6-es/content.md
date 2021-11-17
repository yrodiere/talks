## Contexte

* Java 8+
* Hibernate Object/Relational Mapper
* Base de données relationnelle
* Framework indifférent: Quarkus, Spring Boot, Jakarta EE, ...
* <!-- .element: class="fragment" -->
  Recherche dans des données textuelles ?

@Notes:

Application avec...

---

### Solution naïve : `LIKE`/`ILIKE`

```sql
SELECT * FROM entity
WHERE entity.textcontent ILIKE '%car%';
```

```sql
SELECT * FROM entity
WHERE lower(entity.textcontent) LIKE lower('%car%');
```

-

### Démo

Recherche full-text naïve avec `LIKE`

@Notes:

* projet "base"
* Montrer TShirt
* Montrer TShirtService
* `curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/search?q=car&brief=true' | jq`
* "Picard"? => Faux positif...
* "Cars! Cars! Cars" devrait probablement être en première position

-

### Bilan

* <!-- .element: class="fragment" -->
  Faux positifs
* <!-- .element: class="fragment" -->
  Pas de tri par pertinence
* <!-- .element: class="fragment" -->
  Performances limitées

En bref: solution qui atteint très vite ses limites
<!-- .element: class="fragment" -->

---

## Le full-text dans la base de données ?

* <!-- .element: class="fragment" -->
  Avantages :
  * Mise à jour des index immédiate, transactionnelle
  * Combinaison de full-text et de SQL traditionel (`JOIN`, ...)
* <!-- .element: class="fragment" -->
  Mais...
   * <!-- .element: class="fragment" -->
     Couplage fort avec un SGBD précis
   * <!-- .element: class="fragment" -->
     Recherche : requêtes SQL natives (ou ajouts à la syntaxe HQL/JPQL)
   * <!-- .element: class="fragment" -->
     Mapping **table** &rarr; document : admin. BDD
   * <!-- .element: class="fragment" -->
     Technologies parfois moins matures que Lucene

@Notes:

Manque de maturité: recherche de phrase dans PostgreSQL 9.6, en septembre 2016...

---

## La recherche full-text dans le monde Lucene

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
		query [label = "Requête\n(texte)"];
		documents [label = "Documents\n(texte)"];
		analyzedQuery [label = "Requête\nanalysée\n(structurée)"];
		results [label = "Résultats"];
		index [label = "Index inversé"];
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

### Index inversé

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

## Le full-text déporté

<div class="viz" data-viz-engine="neato">
digraph {
	rankdir = LR;
	splines = curves;

	node [margin = 0.2];

	subgraph {
		app [label = "Application", pos = "0,2!"];
		orm [label = "ORM", pos = "3,2!"];
		db [label = "BDD", pos = "6,2!"];

		app -> orm [headlabel = "Persist/Update/Remove", labeldistance="6"];
		orm -> app [headlabel = "Load", labeldistance="5"];
		orm -> db [headlabel = "Select/Insert\n/Update/Delete", labeldistance="6" , dir = both]
	}
	subgraph {
		node [class="fragment data-fragment-index_1"];
		edge [class="fragment data-fragment-index_1"];
		
		elasticsearch [label = "Elasticsearch", pos = "6,-1!", style = dashed];
	}
	subgraph {
		node [class="fragment data-fragment-index_2"];
		edge [class="fragment data-fragment-index_2"];
		
		ftSync [label = "Sync ? Mapping ?", pos = "6,0.5!", style = dashed];
	
		orm -> ftSync [headlabel = "Load", labeldistance="4", style = dashed];
		ftSync -> elasticsearch [headlabel = "Put", labeldistance="4", style = dashed];
	}
	subgraph {
		node [class="fragment data-fragment-index_3"];
		edge [class="fragment data-fragment-index_3"];
	
		ftQuery [label = "API Java ?", pos = "3,-1!", style = dashed];
	
		ftQuery -> app [headlabel = "Requêtes full-text", labeldistance="7", style = dashed];
		orm -> ftQuery [headlabel = "Load", labeldistance="7", style = dashed];
		elasticsearch -> ftQuery [headlabel = "Requêtes\nfull-text", labeldistance="5", style = dashed]
	}
}
</div>

@Notes:

Flux d'information

1. Initialement: BDD => requêtes SQL, transactions
1. Add Elasticsearch

Notre approche:

1. ES: riche en fonctionnalités, ne réinventons pas la roue
2. Synchronisation
   1.Deux datastores... deux vérités?
   2. Deux écritures => source d'erreurs
   3. Synchronisation automatique?
   4. Comment déclencher la synchronisation? Réindexation complète toutes les 60s => impossible
   5. Comment spécifier la correspondance entre les données relationelles et des documents?
3. Requêtage

---

## Hibernate Search

@Notes:

1. Bibliothèque Java
1. S'intègre à Hibernate ORM
1. Résout les problèmes mentionnés à l'instant

-

### `pom.xml`

```xml
<dependency>
   <groupId>org.hibernate.search</groupId>
   <artifactId>hibernate-search-mapper-orm</artifactId>
   <version>6.0.7.Final</version>
</dependency>
<dependency>
   <groupId>org.hibernate.search</groupId>
   <artifactId>hibernate-search-backend-elasticsearch</artifactId>
   <version>6.0.7.Final</version>
</dependency>
```

@Notes:

1. Dépendances pour Apache Maven
2. Mapper se charge de faire la correspondance entre entités et documents
   (à l'indexation comme lors des recherches)
4. Backend se charge d'indexer et de requêter l'index

-

### Configuration minimale

`persistence.xml`, `hibernate.properties`, ...

<pre><code data-trim data-noescape>
<span class="fragment">hibernate.search.backend.hosts = elasticsearch.mycompany.com</span>
<span class="fragment">hibernate.search.backend.protocol = https
hibernate.search.backend.username = ironman
hibernate.search.backend.password = j@rV1s</span>
</code></pre>

<div class="fragment">

Spring Boot: `spring.jpa.properties.*`

</div>

<div class="fragment">

Quarkus: `application.yaml`

```
quarkus.hibernate-search-orm:
  elasticsearch:
    hosts: elasticsearch.mycompany.com
    version: 7 
```

</div>

@Notes:

1. Adresse d'Elasticsearch
2. Si besoin, authentification
3. Intégration plus poussée dans Quarkus, préfixes différents
4. Même préfixe que JPA pour Spring Boot

-

<!-- .element: class="grid nested-fragments-highlight-current-red" -->

### Mapping

<div class="column">
Entité Java

<pre><code class="lang-java" data-trim data-noescape>
<span class="fragment" data-fragment-index="1">@Indexed</span>
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
Mapping Elasticsearch
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

1. Entité annotée ordinaire pour Hibernate ORM
1. Active l'indexation Hibernate Search
1. Super! Un document vide.
1. Ajoute un champs full-text, avec sa config
1. On peut ajouter plusieurs champs avec une config différente (utile pour tri, par exemple)
1. Entité => Document, c'est bon. Et ensuite?

-

### Analyse

<pre class="fragment" data-fragment-index="1"><code data-trim data-noescape>
hibernate.search.backend.analysis.configurer = myAnalysisConfigurer
</code></pre>

<pre><code class="lang-java" data-trim data-noescape>
<span class="fragment" data-fragment-index="1">@Dependent
@Named("myAnalysisConfigurer")</span>
public class MyAnalysisConfigurer
        implements ElasticsearchAnalysisConfigurer {
	@Override
	public void configure(ElasticsearchAnalysisConfigurationContext context) {<span class="fragment" data-fragment-index="2">
		context.analyzer( "cleaned_text" ).custom()
				.tokenizer( "whitespace" )
				.charFilters( "html_strip" )
				.tokenFilters( "asciifolding", "lowercase",
                        "stop", "porter_stem" );
		</span><span class="fragment" data-fragment-index="3">
		context.normalizer( "cleaned_keyword" ).custom()
				.tokenFilters( "asciifolding", "lowercase" );</span>
	}
}
</code></pre>

@Notes:

1. Les analyzers referencés dans le mapping doivent être définis
1. Dans HSearch, définition via un bean
1. Le bean doit être referencé dans la configuration
1. Supporté: Spring DI, CDI, et reflection (`class.getConstructor().newInstance()`)
1. On ajoute quelques définitions...
1. Et HSearch poussera les définitions lorsqu'il créera l'index!

---

## Initialisation d'Elasticsearch

-

### Gestion du schéma

Au démarrage :

<pre><code data-trim data-noescape>
hibernate.search.schema_management.strategy = create-or-validate
</code></pre>

* `none`
* `create`
* `validate`
* `create-or-validate` (par défaut)
* `update`
* `drop-and-create`
* `drop-and-create-and-drop` (tests)

<span class="fragment">Aussi possible via API à n'importe quel moment.</span>

@Notes:

* Expliquer chaque stratégie

-

### `MassIndexer`

<pre><code class="lang-java" data-trim data-noescape>
EntityManagerFactory emf = /* ... */;
Search.mapping(emf).scope(Object.class).massIndexer()
		<span class="fragment">.purgeAllOnStart(true)
		.typesToIndexInParallel(2)
		.batchSizeToLoadObjects(25)
		.idFetchSize(150)
		.threadsToLoadObjects(30)</span>
		.startAndWait();
</code></pre>

@Notes:

1. Réindexe toutes les entités; peut prendre un certain temps
1. Plein d'options pour tuner les performances

---

## Persister *et* indexer

<pre><code class="lang-java" data-trim data-noescape>
EntityManager entityManager = ...;
EntityTransaction tx = entityManager.getTransaction();
tx.begin();
Book book1 = new Book();
book1.setTitle("The Hobbit");
entityManager.persist(book1);
tx.commit();<span class="fragment" data-fragment-index="1"> // Déclenche aussi l'indexation</span>
</code></pre>

<span class="fragment" data-fragment-index="2">Fonctionne aussi pour les mises à jour (`update`), suppressions (`delete`).</span>

@Notes:

1. Voici comment persister une entité dans Hibernate ORM, classiquement
1. Voici comment persister une entité dans Hibernate ORM *et* l'indexer dans Elasticsearch

-

### Indexation automatique

<div class="viz" data-viz-engine="neato">
digraph {
	node [margin = 0.2];

	app [label = "Application", pos = "-3,0!"];
	orm [label = "ORM", labelloc="t", pos = "0,0!"];
	db [label = "DB", pos = "5,0!"];

	app -> orm [label = "Modif. d'entité", headclip = false, arrowhead = none];
	orm -> db [label = "INSERT/UPDATE", tailclip = false];

	hsearch [label = "Hibernate Search", pos = "0,-2!"];
	elasticsearch [label = "Elasticsearch", pos = "5,-2!"];

	orm -> hsearch:nw [headlabel = "Evénement\nde modif.", style = dashed, tailclip = false, class="fragment data-fragment-index_1"];
	orm -> hsearch:ne [headlabel = "Evénement\nde commit", style = dashed, tailclip = false, class="fragment data-fragment-index_2"];
	hsearch -> elasticsearch [label = "PUT /book/_doc/1/", class="fragment data-fragment-index_3"];
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

<div class="column">
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

<!-- .element: class="grid nested-fragments-highlight-current-red" -->

<div class="column">
<pre><code class="lang-java" data-trim data-noescape>
@Entity
@Indexed
public class Book {
	<span class="fragment" data-fragment-index="1">@IndexedEmbedded(
		<span class="fragment"  data-fragment-index="3">includePaths = {"title", "text"}</span><span class="fragment" data-fragment-index="4">,
		structure = ObjectStructure.NESTED</span>
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

1. Même modèle que précédemment, sauf que...
2. On a maintenant une an association: liste de chapitres
3. Déjà, on ajoute un `@IndexedEmbedded`
4. Initialement vide ! Pourquoi ?
5. On ajoute de @*Field sur les propriétés de la classe Chapter
6. Plusieurs options de config
7. Par exemple un filtre pour n'include que certains champs de la classe Chapter
8. Ou des options plus avancées comme la conservation de la structure dans l'index (ne pas expliquer plus que ça)

-

### Ré-indexation automatique

<pre><code class="lang-java" data-trim data-noescape>
EntityManager entityManager = ...;
EntityTransaction tx = entityManager.getTransaction();
tx.begin();
Chapter chapter1 = entityManager.find(Chapter.class, 1);
chapter1.setTitle("A modified title");
tx.commit();<span class="fragment"> // Réindexe le *Book*</span>
</code></pre>

@Notes:

1. On modifie un objet inclus dans un autre
1. Le titre du chapitre est inclus dans la version indexée du livre
1. Mais... aucun événement de modification pour le livre?
1. Pas de souci, HSearch sait ce qu'il faut faire (grâce au mapping + métadonnées d'ORM)
1. Le livre est réindexé comme attendu

---

## Recherche

<pre><code class="lang-java" data-trim data-noescape>
String userInput = /*...*/;
EntityManager entityManager = /*...*/;
<span class="fragment" data-fragment-index="1">SearchSession searchSession = Search.session(entityManager);</span>

<span class="fragment" data-fragment-index="2"><span class="fragment" data-fragment-index="4">List&lt;Book&gt; hits =</span> searchSession.search(Book.class)</span>
        <span class="fragment" data-fragment-index="3">.where(f -> f.match().field("title").matching(userInput))</span>
        <span class="fragment" data-fragment-index="4">.fetchHits(20);</span>
</code></pre>

@Notes:

1. On peut utiliser les API d'Elasticsearch directement, si on le désire
1. Mais une API Java peut aider: type-safe dans une certaine mesure, auto-complétion, pas de parsing
1. Configuration classique: terme fourni par l'utilisateur + entity manager (session)
1. Accès à l'API HSearch via `Search.session`
1. De là, on démarre une recherche sur la classe `Book` (cible implicitement l'index "book")
1. On définit un prédicat (`f` est une "factory" de prédicats)
1. On récupère les hits: ce sont des entités managées! (i.e. lazy loading, etc.)

-

### Récupération automatique des entités

<div class="viz" data-viz-engine="neato">
digraph {
	splines = polyline;

	node [margin = 0.2];

	app [label = "Application", pos = "-4,-2!"];
	orm [label = "ORM", labelloc="t", pos = "0,0!"];
	db [label = "DB", pos = "4,0!"];

	hsearch [label = "Hibernate Search", labelloc="b", pos = "0,-2!"];
	elasticsearch [label = "Elasticsearch", pos = "4,-2!"];

	orm -> hsearch [label = "Entités managées", tailclip = false, headclip = false, class="fragment data-fragment-index_2"];
	db -> orm [headclip = false, arrowhead = none, class="fragment data-fragment-index_2"];
	elasticsearch -> hsearch [taillabel = "Hits", headclip = false, class="fragment data-fragment-index_1"];
	hsearch -> app [label = "Entités managées", tailclip = false, class="fragment data-fragment-index_3"];
}
</div>

@Notes:

1. Comment ça marche?
1. En premier lieu, HSearch récupères les hits d'Elasticsearch
1. Puis, à partir des identifiants de documents, HSearch récupère les entités
1. Et les transmet à l'application
1. Évidemment, ça implique un accès à la BDD
1. Si vous ne voulez pas ça...

-

<!-- .element: class="grid" -->

### Projection et tri

<pre><code class="lang-java nested-fragments-highlight-current-red" data-trim data-noescape>
@FullTextField(
	analyzer = "cleaned_text"<span class="fragment" data-fragment-index="2">,
	projectable = Projectable.YES</span>
)
private String title;

@KeywordField(
	normalizer = "cleaned_keyword"<span class="fragment" data-fragment-index="4">,
	sortable = Sortable.YES</span>
)
private String category;
</code></pre>

<pre><code class="lang-java" data-trim data-noescape>
<span class="fragment" data-fragment-index="1"><span class="fragment" data-fragment-index="2">List&lt;String&gt; hits =</span>
		searchSession.search(Book.class)
		<span class="fragment" data-fragment-index="2">.select(f ->
                f.field("title", String.class))</span>
		<span class="fragment" data-fragment-index="3">.where(f ->
			f.match().field("title")
			.matching(userInput))</span>
		<span class="fragment" data-fragment-index="4">.sort(f ->
			f.field("category")
			.then().score())</span>
		<span class="fragment" data-fragment-index="5">.fetchHits(20);</span></span>
</code></pre>

@Notes:

1. On doit marquer un champ comme projectable/triable dans le mapping
1. On commence la recherche comme d'habitude
1. Pour une projection, on ajoute un `.select()`
1. Ici, on projete directement sur un seul champ de type `String`, et le résultat a donc ce type
1. Puis on ajoute un tri
1. Ici, on trie sur un seul champ, puis par score (pertinence) en cas d'égalité
1. On finit par un `fetchHits` comme d'habitude

-

<!-- .element: class="grid" -->

### Et encore plus...

```java
.where(f ->
	f.bool()
	.must(f.match()
			.field("title")
			.matching("ring"))
	.must(f.range()
			.field("pageCount")
			.from(200).to(500)))
```
```java
.where(f ->
	f.spatial().within()
	.field("location")
	.circle(45.7515926, 4.8514779,
			1.5, DistanceUnit.KILOMETERS))
```
```java
List<Pair<String, Float>> hits =
		searchSession.search(Book.class)
		.select(f -> f.composite(
            Pair::new,
            f.field("title", String.class),
            f.score()
        ))
		...
```

@Notes:

1. Jonctions booléenne, permettent l'équivalent d'un ET/OU
2. Prédicats spatiaux, pour rechercher par distance à un point
3. Projections composites

-

### Aggrégations

```java
AggregationKey<Map<Genre, Long>> countsByGenreKey =
        AggregationKey.of( "countsByGenre" ); 

List<Book> result = searchSession.search( Book.class ) 
        .where( f -> f.match().field( "title" ) 
                .matching( "robot" ) )
        .aggregation( countsByGenreKey, f -> f.terms() 
                .field( "genre", Genre.class ) )
        .fetchHits( 20 ); 

Map<Genre, Long> countsByGenre = result.aggregation( countsByGenreKey ); 
```

<div class="fragment">

```java
        // ...
        .aggregation( countsByPriceKey, f -> f.range()
                .field( "price", Double.class ) 
                .range( 0.0, 10.0 ) 
                .range( 10.0, 20.0 )
                .range( 20.0, null ) )
        // ...
Map<Range<Double>, Long> countsByPrice = result.aggregation( countsByPriceKey );
```

</div>

-

### Intégration de JSON natif

```java
        // ...
        .aggregation( priceStatsKey, f -> f.fromJson( "{\n" +
                "  \"stats\": {\n" +
                "    \"field\": \"variants.price\"\n" +
                "  }\n" +
                "}" ) )
        // ...
JsonObject priceStats = result.aggregation( priceStatsKey ); 
```

Fonctionne également pour prédicats, tris, et même requête complète.

---

### Démo

Mapping et recherche avec Hibernate Search

@Notes:

* projet "search"
* Montrer TShirtService
* `curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/search?q=car&brief=true' | jq`
* "Picard" n'apparaît plus
* "Cars! Cars! Cars" est en première position
* Indexation automatique
  ```shell script
  # Search before (no result):
  curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/search?brief=true&q=bicycle' | jq
  # Show collection:
  curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/collection/2' | jq
  # Update collection:
  curl -s -XPOST -H 'Content-Type: application/json' 'localhost:8080/collection/2' -d'{"year": 2019, "season": "SPRING_SUMMER", "keywords": "bike, sport, bicycle"}}' | jq
  # Wait for Elasticsearch to refresh (~1 second), the see the reindexed data:
  curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/search?brief=true&q=bicycle' | jq
  ```
* projet "search-advanced"
* `TShirtService.autocomplete`, `TShirt`, `AnalysisConfigurer`
* ```shell script
  while read TEXT; do curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/autocomplete' -G --data-urlencode "terms=$TEXT" | jq ; done
  ```
* ```shell script
  # Then type whatever you want, followed by <ENTER>
  ju
  ju sk
  ```
* La même chose sans taper dans la BDD
  ```shell script
  while read TEXT; do curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/autocomplete_nodb' -G --data-urlencode "terms=$TEXT" | jq ; done
  ```
* `TShirtService.searchWithFacets`, `TShirt`
  ```shell script
  curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/search_facets?brief=true' | jq -C | less
  curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/search_facets?brief=true&size=XL' | jq -C | less
  curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/search_facets?brief=false&color=grey' | jq -C | less
  curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/search_facets?brief=true&size=XL&color=grey' | jq -C | less
  ```
* `TShirtService.suggest`
  ```shell script
  while read TEXT; do curl -s -XGET -H 'Content-Type: application/json' 'localhost:8080/tshirt/suggest' -G --data-urlencode "terms=$TEXT" | jq ; done
  ```
  ```shell script
  # Then type whatever you want, followed by <ENTER>
  montain
  juml into
  operture scienwe
  ```
