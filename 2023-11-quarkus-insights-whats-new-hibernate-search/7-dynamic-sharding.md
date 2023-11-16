## Dynamic sharding

-

<https://en.wikipedia.org/wiki/MurmurHash>

```sql
INSERT INTO hsearch_outboxevent (entity_name, entity_id, entity_id_hash)
    VALUES ('MyEntity', '42', <murmur3_hash_of_42>);
```

```sql
SELECT * FROM hsearch_outboxevent
    WHERE entity_id_hash
        BETWEEN <shard_start> AND <shard_end>
    ORDER BY <...>;
```

Exemple : shard 0 = `0 -> 999`, shard 1 = `1000 -> 1999`, etc.

@Notes:

* Murmur3: public domain, fast
* Not cryptographically secure, but irrelevant here
* Uniform distribution
  * => we can assign IDs to shards any way we want
  * Here, we assign them with BETWEEN; allows for in-db indexes if necessary
* Important: we resolve shards dynamically, upon reading events!
  * => allows for rebalancing: as many shards as we need, and no more

-

## Agents

| id           | status    | assigned shard index | expected total shard count | expiration          | ... |
|--------------|-----------|----------------------|----------------------------|---------------------|-----|
| 8cea97f9-... | `RUNNING` | 0                    | 2                          | `...T14:12:30.000Z` |     |
| f49c6ba8-... | `RUNNING` | 1                    | 2                          | `...T14:12:32.000Z` |     |

Statuses: `SUSPENDED`, `WAITING`, `RUNNING`

@Notes:

* DB table where each "agent" (event processor or other) registers itself
* basis for coordination:
  * allows for detection of other nodes (listed in the table)
  * allows for shard assignment (order by ID)
  * allows for detection of disconnected/crashed nodes (expiration)

-

<!-- .element: class="grid" -->

<div class="column">

### Main loop

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

* Walk the audience through the code
* The principles are simple
* Implementation is more complex
  * Polling implies concurrent transactions
  * Must work with high isolation levels (default for MS SQL Server, CockroachDB)
  * Transactions must be as short and simple as possible
  * Some transactions/SQL queries adapted to minimize deadlocks deadlocks
    (e.g. locks acquired in different orders)
