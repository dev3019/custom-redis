# Redis‑Like Engine — Master Context (Locked)

## 1. What We Are Building

We are building a **production‑grade Redis‑like in‑memory data store engine** in:

* **Language:** TypeScript
* **Runtime:** Bun
* **Architecture Goal:** Match real industry standards from day one (NOT an MVP mindset)

This is NOT a toy project and NOT a simplified learning exercise.
All design decisions must align with how real database engines are built.

---

# 2. Core Design Philosophy (Locked)

## 2.1 Absolute Rules

1. **Correctness over speed of development**
2. **Redis semantics must be respected**
3. No shortcuts that would break future features
4. Clear separation of concerns
5. Deterministic behavior only
6. No implicit data mutation
7. All components must be future‑safe

---

## 2.2 System Principles

### Single‑Threaded Deterministic Engine

The engine runs on a single event loop to:

* Avoid race conditions
* Eliminate locking
* Ensure atomic command execution

Concurrency is handled by:

* Serialized command execution
* Immutable value replacement

---

### Command Lifecycle (Strict)

Commands MUST follow:

```
Client → Dispatcher → Parse → Execute → Engine → Database
```

#### Separation Rules

Parse phase:

* Pure function
* No state access
* No side effects
* Only validation + normalization

Execute phase:

* Uses already parsed args
* Performs state mutations
* Enforces semantics

---

## 2.3 Redis Semantic Requirements

### Strings

* Binary‑safe
* Empty strings allowed
* No automatic serialization
* Server never interprets client objects

---

### TTL Behavior

Must match Redis:

* Lazy expiration
* Expired keys removed on access
* SET does NOT remove TTL
* Only EXPIRE changes TTL

---

### Data Ownership

* ValueEntry objects are immutable
* Updates create new instances
* No in‑place mutation of stored values

---

# 3. Current Scope (Phase 1 Locked)

## Supported Data Types

* Strings
* Lists
* Sets
* Hashes
* Streams (basic placeholder)

Only **strings + TTL** are implemented first.

---

## Supported Commands (Phase 1)

### Must Implement

* SET
* GET
* EXPIRE

Later commands will follow same architecture.

---

# 4. Deferred Features (Must Be Architecturally Supported)

These are NOT implemented yet but architecture MUST support them.

## Persistence

Deferred:

* Snapshot (RDB‑style)

Future requirements:

* Copy‑on‑write safe
* Write command tracking

---

## Pub/Sub

Deferred:

* Channel system
* Subscriber tracking

Architecture must allow:

* Event notification hooks

---

## Protocol Layer

Deferred:

* RESP parser
* TCP server

Engine must remain protocol‑agnostic.

---

## Streams Advanced Features

Deferred:

* Consumer groups
* Pending entries list

---

# 5. Locked Architecture Structure

```
src/
├── engine/
│   ├── engine.ts
│   ├── database.ts
│   └── valueEntry.ts
│
├── commands/
│   ├── command.ts
│   ├── context.ts
│   ├── dispatcher.ts
│   ├── registry.ts
│   ├── errors.ts
│   └── handlers/
│       ├── string.ts
│       └── ttl.ts
│
├── datatypes/
│   ├── base.ts
│   ├── string.ts
│   ├── list.ts
│   ├── set.ts
│   ├── hash.ts
│   └── stream.ts
│
├── persistence/
│   └── snapshot.ts
│
├── pubsub/
│   └── hub.ts
│
├── config/
│   └── defaults.ts
│
└── index.ts
```

This structure is LOCKED unless there is a strong architectural reason.

---

# 6. Engine Responsibilities

## Engine

* Owns multiple databases (0‑15)
* Provides database lookup
* Coordinates global features

---

## Database

Responsibilities:

* Store keyspace
* Manage expirations
* Enforce lazy TTL

Must NEVER:

* Know about commands
* Perform business logic

---

## ValueEntry

Represents a stored value.

Invariants:

* Immutable
* Contains type metadata
* Tracks timestamps
* Updated via cloning only

---

# 7. Command System Responsibilities

## Dispatcher

Only responsible for:

* Looking up command
* Validating arity
* Calling parse + execute

Must NOT:

* Understand arguments
* Contain business logic

---

## Command

Defines:

* Name
* Arity
* Parse logic
* Execution logic
* Read/write classification

---

# 8. Hard Constraints (Non‑Negotiable)

## Parsing Constraints

* No JSON serialization
* No silent coercion
* Fail fast
* Empty strings allowed

---

## Execution Constraints

* Atomic operations
* No async
* No IO
* No hidden mutations

---

## TTL Constraints

* TTL stored separately
* SET must preserve TTL
* Expiry enforced lazily

---

## Error Constraints

* Errors must be deterministic
* No heavy payloads
* No mutable error state

---

# 9. Current Development Status

Completed:

* Engine skeleton
* Database layer
* Command framework
* Dispatcher
* Registry
* Context model

In Progress:

* Correct implementation of SET
* Implementation of GET
* Implementation of EXPIRE

---

# 10. Development Workflow Rules

All future work follows:

1. Define invariants
2. Implement parse logic
3. Implement execution logic
4. Verify Redis semantic compatibility
5. Review for architectural safety

No skipping steps.

---

# 11. Review Mode (Locked Behavior)

Feedback mode is permanently set to:

* Ruthless
* Industry‑standard enforcement
* No MVP compromises
* Immediate correction of incorrect assumptions

Praise is given ONLY when:

* Solution is ≥95% correct
* Design shows strong systems thinking

---

# 12. Immediate Next Steps

1. Fix SET parse implementation
2. Implement GET command
3. Implement EXPIRE command
4. Validate TTL preservation logic

No new features until these are correct.

---

# END OF CONTEXT DOCUMENT
