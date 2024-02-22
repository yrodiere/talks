On one side, Elasticsearch. It scales, has great support for full-text search, and many features you like.
On the other side, a relational database. It has transactions, relational capabilities, implements standards, and lots of developers are familiar with it.
Each is a great datastore targeting specific needs. What if you have many needs? What if you want both? Transactions, relations *and* scale; full-text search *and* SQL. Preferably without headaches.
 
Enters Hibernate Search. This Java library allows to define a mapping from Hibernate ORM entities to Elasticsearch documents, to transparently index entities as they are persisted in the ORM, and to conveniently query the index through APIs that make the most of a mixed entity/document model.
Doing so, it solves the problems that arise when synchronizing data from a relational database to Elasticsearch:

* Entities are generally too small to be mapped directly to a useful Elasticsearch document: you need to map *trees* of entities to a single document. How to handle complex mappings, i.e. how to infer that when entity A is written to, then entity D, three relations away, needs to be reindexed?
* The database cannot be fully reindexed every minute: synchronization needs to be smart. How to accurately detect database changes without adding boilerplate everywhere in database writing code?
* The database may be transactional, but Elasticsearch is not. How to correctly handle transactions, generating documents and sending indexing commands at just the right time?

In this talk, I will demonstrate how Hibernate Search 6, the new major version of Hibernate Search currently in development, can be used in an application based on Hibernate ORM.
