## La recherche plein-texte<br><small>(dans le monde Lucene)</small>

<img data-src="../image/logo/lucene.svg" class="logo" />
<p>
<img data-src="../image/logo/elasticsearch-color-horizontal.svg" class="logo" />
<img data-src="../image/logo/opensearch-monochrome.svg" class="logo" />

@Notes:
* Full-text: « consiste pour le moteur de recherche à examiner tous les mots de chaque document enregistré et à essayer de les faire correspondre à ceux fournis par l'utilisateur »
* Lucene: Fondation Apache
* Elasticsearch utilise Lucene en interne, donc même combat
* D'autres implémentations de moteurs full-text existent, vocabulaire différent

-

### Index inversé et *postings*

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

### Analyse
<div class="viz">
digraph {
	rankdir = LR;

    # Note the "cluster" prefix is necessary to have the subgraph taken into account in the layout.
	subgraph clusterData1 {
        style = invis;
		node [shape = record, style = rounded, margin = 0.3];
        input [label = "mangez des POMMES"];
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
		tokenized [label = "{ mangez | des | POMMES }"];
		lowercased [label = "{ mangez | des | pommes }"];
		stopped [label = "{ mangez | pommes }"];
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
    input [label = "mangeons une pomme"];
    processing [shape = record, style = rounded, margin = 0.3, label = "..."];
    output [label = "{ mang | pomm }"];
	input -> processing;
	processing   -> output;
}
</div>

@Notes:
* Tokenization
  * Le but est de construire un index permettant la correspondance exacte sur les tokens, parce que c'est rapide
  * La _tokenization_ est la première étape
  * Problème: "POMMES" n'aura pas de correspondance exacte avec "pomme"
* => normalisation à l'aide de filtres
  * Permet de rendre la recherche plus "floue", faire correspondre entre eux des mots différents
  * ... mais aussi de rendre la recherche plus précise, en évitant des correspondances qui n'ont pas lieu d'être (ex. : stop-words)
  * Bilan: c'est mieux !

-

### Vue d'ensemble
<div class="viz">
digraph {
	rankdir = LR;
	splines = ortho;

	subgraph {
		node [shape = record, style = rounded, margin = 0.3];
		query [label = "Requête: texte brut"];
		analyzedQuery [label = "Tokens"];

		document [label = "Document: ID\n+ texte brut"];
		analyzedDocument [label = "ID\n+ tokens"];

		results [label = "IDs des\ncorrespondances"];
	}

    index [label = "Index inversé\n(token &rArr; IDs)", shape = cylinder, margin = 0.2];

	subgraph {
		queryAnalysis [label = "Analyse"];
		documentAnalysis [label = "Analyse"];
		search [label = "Recherche"];
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
* On analyse les données texte, on ne les considère plus comme « juste » une suite de caractères
* Analyse = extraction et « nettoyage » de tokens.
* Stocke les tokens dans l'index inversé nous donne un accès rapide, surtout en lecture
* On analyse les requêtes de la même manière => tokens correspondants exactement
