## What's next?

* Vector search!
* Hibernate Search standalone!
* Debezium integration?
  
  <div class="grid">
  <div class="column">
  <img data-src="../image/logo/debezium_black.svg" class="logo" />
  </div>
  <div class="column">
  <img data-src="../image/logo/kafka.svg" class="logo" />
  </div>
  </div>

@Notes:

* Vector search
  * Obviously, requires integration with AI (sold separately!)
  * Non-text content/queries: audio, picture, video
  * Fingerprinting: "what's this song"
  * Semantic search: "find pictures of dogs", "find text about car repairs"
  * Generative AI... ?
* Hibernate Search Standalone
  * Allows using Elasticsearch/OpenSearch as a primary datastore.
    (not recommended...)
  * Allows indexing another datasource.
    E.g. quarkus.io?
  * Potentially, could allow similar integration to the Hibernate ORM one,
    but for another datastore (MongoDB, ...).
* Debezium
  * Lower pressure on DB (no more polling)
  * But more importantly: detecting changes happening outside of Hibernate ORM (native SQL, ...)
