## Partitionnement dynamique

-

<https://en.wikipedia.org/wiki/MurmurHash>

```sql
INSERT INTO hsearch_outboxevent (entity_name, entity_id, entity_id_hash)
    VALUES ('MyEntity', 42, <murmur3_hash_of_42>);
```

```sql
SELECT * FROM hsearch_outboxevent
    WHERE entity_id_hash
        BETWEEN <shard_start> AND <shard_end>
    ORDER BY <...>;
```

Exemple : shard 0 = `0 -> 999`, shard 1 = `1000 -> 1999`, etc.

@Notes:

* Murmur3: domaine public, rapide
* N'est pas cryptographiquement sécurisée, mais pas important
* Distribution uniforme => peut découper l'ensemble des hash facilement
* Ici, BETWEEN; permet d'appliquer des index si besoin
* Point important : on découpe l'ensemble des hash dynamiquement, à la lecture !
* Permet de redéfinir les partitions

-

## Agents

| id | état      | index de partition assignée | nombre de partitions supposé | expiration          | ... |
|----|-----------|-----------------------------|------------------------------|---------------------|-----|
| 1  | `RUNNING` | 0                           | 2                            | `...T14:12:30.000Z` |     |
| 2  | `RUNNING` | 1                           | 2                            | `...T14:12:32.000Z` |     |

État: `SUSPENDED`, `WAITING`, `RUNNING`

@Notes:

* table en BDD où chaque "agent" (processeur d'événement ou autre) s'enregistre
* sert de base à la coordination

-

<!-- .element: class="grid" -->

<div class="column">

### Boucle principale

```python
while true {
    if now > (last_pulse + <pulse_interval>)
        pulse()
    if events_to_process() != null
        process(50 events)
    else
        wait(<polling_interval>)
}
```

</div>
<div class="column fragment" data-fragment-index="2">

### Pouls

```python
function pulse() {
    update_self_expiration()
    eject_expired_others()
    while !topology_matches_expectations()
        wait(<polling_interval>)
        update_self_expiration()
        eject_expired_others()
    last_pulse = now
}
```

</div>

@Notes:

* Expliquer le code pas à pas
* Simple dans le principe
* Plus compliqué dans l'implémentation
  * Polling implique transactions concurrentes
  * Doit fonctionner avec niveaux d'isolation élevés (MS SQL Server, CockroachDB)
  * Transactions doivent être les plus courtes et simples possibles
  * Certaines transactions/requêtes adaptées pour minimiser les deadlocks (par ex. locks acquis dans des ordres différents)
