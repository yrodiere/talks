## Contexte

* Java
* Hibernate Object/Relational Mapper (ORM)
* Base de données relationnelle
* <!-- .element: class="fragment" -->
  Recherche dans des données textuelles ?

@Notes:

Application avec...

-

### Solution naïve : `LIKE`/`ILIKE`

```sql
SELECT * FROM entity
WHERE entity.textcontent ILIKE '%Thé%';
```

```sql
SELECT * FROM entity
WHERE lower(entity.textcontent) LIKE lower('%Thé%');
```

-

### `LIKE`/`ILIKE`: bilan

* <!-- .element: class="fragment" -->
  Faux positifs: "thé" => "kinési***thé***rapie"
* <!-- .element: class="fragment" -->
  Faux négatifs: "thés" &nrArr; "thé"
* <!-- .element: class="fragment" -->
  Pas de tri par pertinence
* <!-- .element: class="fragment" -->
  Performances limitées

En bref : solution qui atteint très vite ses limites.
<!-- .element: class="fragment" -->

-

## Le full-text dans la base de données ?

* <!-- .element: class="fragment" -->
  Couplage fort avec SGBD
* <!-- .element: class="fragment" -->
  Pas de bindings JPA pré-existants (JPQL, ...)
* <!-- .element: class="fragment" -->
  Périmètre d'indexation strict (table)
* <!-- .element: class="fragment" -->
  Fonctionnalités limitées

@Notes:

* Chaque BDD a sa propre syntaxe SQL
* Configuration du mapping : pas d'annotation JPA;
  requêtes SQL : pas de bindings Criteria fournis par JPA,
  pas de fonctions JPQL dédiées.
* Si langage et données sont dans tables différentes,
  difficile de choisir l'index en fonction du langage.
* Recherche de phrase dans PostgreSQL 9.6, en septembre 2016...

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