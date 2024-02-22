<!-- .slide: data-state="focus" -->
# Rechercher

TODO problem statement

-

## Recherche textuelle

```sql
SELECT * FROM entity
WHERE entity.textcontent ILIKE '%car%';
```

* <!-- .element: class="fragment" -->
  Faux positifs: "thé" => "kinési***thé***rapie"
* <!-- .element: class="fragment" -->
  Faux négatifs: "thés" &nrArr; "thé"
* <!-- .element: class="fragment" -->
  Fonctionnalité limitée: tri par pertinence ?
* <!-- .element: class="fragment" -->
  Performances limitées

@Notes:

* Feature-poor: no relevance sort, ...
* Limited performance: can't put an index on the column for wildcards before AND after the term

-

## Recherche sémantique

TODO

-

## Recherche par similarité

TODO nom à revoir

TODO image, son, ... fingerprints?
