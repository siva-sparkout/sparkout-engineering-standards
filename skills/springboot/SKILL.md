---
name: springboot-standard
description: Use when writing, reviewing, or modifying Spring Boot code (Java 21, Spring Boot 3.x, PostgreSQL). Enforces the Spring Boot Coding Standard v2.0 — layering, IDOR prevention, transactions, JPA correctness, money handling, async and scheduled work.
---

# Spring Boot Standard

Apply to **new and changed code**. Do not retrofit existing code unless asked.
Java 21 · Spring Boot 3.x · PostgreSQL · Maven. ArchUnit enforces most of the layering rules.

## Never

- `findById(id)` on a user-owned record. Scope the query to the caller — see IDOR below.
- A controller injecting a repository.
- **An entity in a request or response body.** Returning one means Hibernate lazy-loads during JSON serialisation and every column silently becomes public API. No exceptions, including "it is just an internal endpoint".
- **Field `@Autowired`.** Untestable without Spring, and it hides how many dependencies a class has grown.
- **Lombok `@Data` on an entity.** The generated `equals`/`hashCode`/`toString` trigger lazy loads and break the entity inside a `Set`. Use `@Getter`/`@Setter`.
- **`ddl-auto: update` outside local.** The fastest known way to lose a production column.
- **`@Transactional` on a controller, a private method, or a self-invoked method.** The proxy does not apply and it fails silently — the code looks transactional and is not.
- **`@Transactional` around an external API call.** The connection is held hostage for the whole remote timeout and the pool drains.
- `double` or `float` for money.
- `catch (Exception e)` and continue. `e.printStackTrace()`.
- Returning `null` to mean "not found" — throw. Rethrowing as `new RuntimeException(e.getMessage())` — it discards the cause and the type.
- `Map<String, Object>` as a response type. If it has no type, it has no contract.
- HTTP 200 with `{"success": false}`. Verbs in URLs. `System.out.println`. `show-sql` in production.
- Switching an association to `EAGER` to fix N+1. Use `@EntityGraph` or a join fetch.
- An unbounded `findAll()` on a table that grows.
- New `Util` / `Helper` / `Manager` classes. They start as one static method and end as the place nobody wants to open.
- A secret with a default fallback.

## Always

- Packages grouped by feature, not by layer: `com.company.<project>.property.*`.
- Routes → Controller → Service → Repository, one direction only.
- Every URL path is a constant in the feature's `route/` class. A path appears exactly once in the codebase.
- Entity-to-DTO conversion is a static factory on the DTO: `PropertyResponse.from(property)`.
- `@Valid` on the request DTO; business rules in the service. One `@RestControllerAdvice` for the whole app.
- Constructor injection, fields `final`. A nine-argument constructor is the class telling you it does too much — that is the rule working.
- `spring.jpa.open-in-view: false`. Left at its default it hides lazy-loading problems locally and produces N+1 under load.
- `@Transactional` on the public service method, `readOnly = true` on reads.
- Flyway forward-only; `ddl-auto: validate` above local. An applied migration is never edited.
- Correlation id in the MDC and returned in a response header; removed in a `finally` or it leaks to the next request on that thread.
- Interface only when a second implementation exists. DTOs name their direction: `CreatePropertyRequest`, `PropertyResponse`.
- Methods returning `Optional` start with `find`; methods that throw start with `get`.

## Patterns to copy

**IDOR — our most likely real vulnerability.**

```java
var property = repository.findById(id).orElseThrow(...);                  // ❌
var property = repository.findByIdAndOwnerId(id, currentUser.getId())     // ✅
    .orElseThrow(() -> new ResourceNotFoundException("PROPERTY_NOT_FOUND", id));
```

Return 404, not 403 — a 403 confirms the record exists. `@PreAuthorize` is additional, never a substitute.

**Error body — one shape for the whole app.**

```java
public record ApiError(Instant timestamp, int status, String code, String message,
                       String path, String correlationId, Map<String, List<String>> fieldErrors) {}
```

Two kinds of invalid deserve two statuses: 400 malformed, 409 conflicts with current state. Return the correlation id; never the real message on a 500.

**Logging — parameterised, or the message is built even when the level is off.**

```java
log.info("Property {} approved by {}", id, userId);     // ✅
log.info("Property " + id + " approved");               // ❌
```

`ERROR` = someone is woken up. `WARN` = recovered but suspicious. `INFO` = business events only. One INFO line per DB call means nobody reads INFO at all.

**A log line is not an alert.** These must alert: unhandled exception, failed `@Scheduled` or batch job, failed third-party or webhook processing, pool exhaustion or connection loss, auth or payment failures above a threshold.

**Async and scheduled work — three traps.**

- `@Async void` that throws **loses the exception entirely** — nothing logs it, nothing alerts. Return `CompletableFuture`.
- `@Scheduled` without a lock runs on **every instance** simultaneously. Use ShedLock or equivalent, and make the job idempotent.
- `@Async` and `@Transactional` on the same method do not behave as written. The transaction belongs on the method the async task calls.

Every outbound HTTP call sets a connect and read timeout, or it hangs until the pool is exhausted.

## Money

`double` and `float` never touch an amount.

| Kind | Type |
|---|---|
| Fiat | `long` minor units, serialised as `String` |
| Rates | integer basis points |
| Division | `BigDecimal` with an explicit `MathContext` |
| Column | `NUMERIC` / `BIGINT`, never `FLOAT` |

Use `Math.multiplyExact` and `Math.addExact` — silent overflow on a `long` is worse than an exception. **Never `new BigDecimal(double)`** — it captures the float's error; use `BigDecimal.valueOf` or the `String` constructor.

## Testing

Any service method with a branch needs tests covering the failure paths, not just the happy one — that is where production bugs come from. `@DataJpaTest` against Testcontainers PostgreSQL, **not H2**: H2 accepts queries Postgres rejects, so a green H2 test proves nothing. No `Thread.sleep()`. Coverage gate 70% on `service` and `domain`; DTOs excluded — coverage on getters is a vanity number.

## Before you finish

1. Ownership scoped into the query; 404 not 403.
2. Response is a DTO, never an entity.
3. `@Transactional` on a public service method; not around a remote call.
4. No `double`/`float` near an amount; `multiplyExact` used.
5. Any N+1? Check the query count in the test log, not by eye.
6. Migration safe on a populated table, and reversible.
7. Could the newest developer on the team read this without asking the author?

Full reasoning, the ArchUnit test suite and the JaCoCo gate: **Spring Boot Coding Standard v2.0**.
