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

### `LIKE`/`ILIKE`: inconvénients

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

## Le plein-texte dans la base de données ?

* <!-- .element: class="fragment" -->
  Couplage fort avec SGBD
* <!-- .element: class="fragment" -->
  Intégration inexistante dans JPA (annotations, JPQL, ...),
  limitée dans Hibernate ORM.
* <!-- .element: class="fragment" -->
  Solutions généralistes,
  fonctionnalités parfois limitées ou peu flexibles.

@Notes:

* Chaque BDD a sa propre syntaxe SQL
* Configuration du mapping : pas d'annotation JPA;
  requêtes SQL : pas de bindings Criteria fournis par JPA,
  pas de fonctions JPQL dédiées.
  (Mais Hibernate ORM fait mieux dans ce domaine)
* Exemple de limite: list de "stop-words" (mots ignorés) est globale ou par session dans MariaDB,
  pas par index.
* Même PostgreSQL, pourtant relativement en avance,
  n'a introduit la recherche de phrase qu'en 9.6 (septembre 2016)...

---

## La recherche plein-texte dans le monde Lucene

<img data-src="../image/logo/lucene.svg" class="logo lucene" />
<img data-src="../image/logo/elasticsearch_large_default.png" class="logo elasticsearch" />

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
		document [label = "Document \n(texte)"];
		analyzedDocument [label = "Document \n(texte structuré)"];
		analyzedQuery [label = "Requête\nanalysée\n(texte structuré)"];
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
	document -> documentAnalysis;
	documentAnalysis -> analyzedDocument;
	analyzedDocument -> index;
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

### Analyse
<div class="viz">
digraph {
	rankdir = LR;

    # Note the "cluster" prefix is necessary to have the subgraph taken into account in the layout.
	subgraph clusterData1 {
        style = invis;
		node [shape = record, style = rounded, margin = 0.3];
        input [label = "manger des POMMMES"];
		stemmed [label = "{ mang | pomm }"];
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
		tokenized [label = "{ manger | des | POMMES }"];
		lowercased [label = "{ manger | des | pommes }"];
		stopped [label = "{ manger | pommes }"];
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

@Notes:
* Tokenization
  * Plus précis que '%thé%'
  * ... donc permet moins d'approximations ('CAR', 'cars', ...)
* => Filtering
  * Permet de rendre la recherche plus "floue", faire correspondre entre eux des mots différents
  * ... mais aussi de rendre la recherche plus précise, en évitant des correspondances qui n'ont pas lieu d'être (ex. : stop-words)
  * Bilan: c'est mieux !

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