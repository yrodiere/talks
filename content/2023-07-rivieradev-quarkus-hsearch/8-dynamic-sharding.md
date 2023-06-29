## Agents

| id | expiration        | state   | total shard count | assigned shard index | ... |
|----|-------------------|---------|-------------------|----------------------|-----|
| 1  | ...T14:12:30.000Z | RUNNING | 2                 | 0                    |     |
| 2  | ...T14:12:32.000Z | RUNNING | 2                 | 1                    |     |

@Notes:

* table en BDD où chaque "agent" (processeur d'événement ou autre) s'enregistre
* sert de base à la coordination

-

## Partitionnement dynamique

```sql
INSERT INTO hsearch_outboxevent (entity_name, entity_id, entity_id_hash)
    VALUES ('MyEntity', 42, <murmur3_hash_of_42>);
```

```sql
SELECT * FROM hsearch_outboxevent
    WHERE entity_id_hash BETWEEN <shard_start> AND <shard_end>
    ORDER BY <...>;
```

<https://en.wikipedia.org/wiki/MurmurHash>

@Notes:

* Murmur3: domaine public, rapide
* N'est pas cryptographiquement sécurisée, mais pas important
* Distribution uniforme => peut découper l'ensemble des hash facilement
* Ici, BETWEEN; permet d'appliquer des index si besoin
* Point important : on découpe l'ensemble des hash dynamiquement, à la lecture !
* Permet de redéfinir les partitions

-

<!-- .element: class="grid" -->

<div class="column">

### Processing loop

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

### Pulse

```python
function pulse() {
    update_self_registration()
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
