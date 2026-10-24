---
name: api-design
description: RESTful web API design best practices (Microsoft Azure Architecture Center) — resource URIs, HTTP methods and status codes, media types, async operations, pagination/filtering/sorting, partial responses, HATEOAS, versioning, multitenancy, tracing, OpenAPI. Use when designing, adding, renaming, or reviewing routes under server/api, choosing status codes or response shapes, or adding list endpoints, long-running jobs, or org-scoped APIs.
metadata:
  version: '2026.10.17'
  source: https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design
---

# Web API Design

A RESTful API is stateless and loosely coupled: clients use standard HTTP against **resources**, and client and server evolve independently. Two goals drive every decision:

- **Platform independence** — standard HTTP, clear docs, familiar format (JSON).
- **Loose coupling** — clients never depend on internal implementation (DB tables, service internals).

Core concepts: every resource has a **URI**; the server returns a **representation** (JSON); a **uniform interface** (GET/POST/PUT/PATCH/DELETE); **stateless** requests (each request is atomic, no server-side session affinity between calls); optional **hypermedia links**.

## In this repo (Nuxt / Nitro)

Routes are files: `server/api/<collection>/index.get.ts`, `index.post.ts`, `[id].get.ts`, `[id].patch.ts`, `[id].delete.ts`, sub-actions like `[eventId]/register.post.ts`. Existing idioms: `getRouterParam`, `readValidatedBody`, `createError({ statusCode, statusMessage })`, `setResponseHeader`. Use `setResponseStatus(event, 201)` for creates and `204` for empty deletes. Follow `AGENTS.md` logging rules (`enrichLog`) on every new or changed route. Match neighbouring handlers before introducing a new convention — consistency within the API beats theoretical purity.

## 1. Resource URIs

- **Nouns, not verbs.** `/orders` ✅ — `/create-order` ❌. The HTTP method is the verb.
- **Plural collections**, items beneath: `/customers`, `/customers/5`, route as `/customers/{id}`.
- A collection is its own resource with its own URI, separate from its items.
- **Relationships**: `/customers/5/orders` is fine. Don't go deeper than **collection/item/collection**. Instead of `/customers/1/orders/99/products`, use `/customers/1/orders` then `/orders/99/products`.
- **Avoid chatty APIs** (many tiny resources needing many round-trips). Denormalize related data into bigger resources — but balance against over-fetching (latency, bandwidth).
- **Don't mirror the database.** Model business entities, not tables. Exposing tables widens attack surface and leaks data; add a mapping layer so schema changes don't break clients.
- **Non-resource operations** (calculations, actions) may be exposed as pseudo-resources, e.g. `GET /add?operand1=99&operand2=1` → `100`, or `POST /events/{id}/check-in`. Use sparingly.

## 2. HTTP methods

Semantics depend on whether the target is a collection or an item (an API need not implement all):

| Resource              | POST                        | GET                       | PUT                            | DELETE            |
| --------------------- | --------------------------- | ------------------------- | ------------------------------ | ----------------- |
| `/customers`          | Create customer             | List customers            | Bulk update                    | Remove all        |
| `/customers/1`        | Error                       | Get customer 1            | Replace customer 1 (if exists) | Remove customer 1 |
| `/customers/1/orders` | Create order for customer 1 | List orders of customer 1 | Bulk update orders             | Remove all orders |

### GET — retrieve

| Code | When                                  |
| ---- | ------------------------------------- |
| 200  | Resource returned                     |
| 204  | No body (e.g. search with no matches) |
| 404  | Resource not found                    |

### POST — create (server assigns URI) or submit data for processing

Clients POST to the **collection** URI; they must not choose the new resource's URI (POST to a specific item URI → 400/405).

| Code | When                                                                     |
| ---- | ------------------------------------------------------------------------ |
| 200  | Processing done, no new resource; result may be in body                  |
| 201  | Created. **`Location` header = new resource URI**; body = representation |
| 204  | Done, no body                                                            |
| 400  | Invalid data; body explains (or links to details)                        |
| 405  | URI doesn't support POST                                                 |

### PUT — full replace (or create if client can reliably own the URI)

Body is the **complete** representation. Applies to items, not collections (except deliberate bulk PUT to a collection to cut chattiness). If clients can't meaningfully assign URIs, create with POST, update with PUT/PATCH.

**PUT must be idempotent** — repeating it yields the same state. POST and PATCH are not guaranteed idempotent.

| Code | When                                  |
| ---- | ------------------------------------- |
| 200  | Updated                               |
| 201  | Created                               |
| 204  | Updated, no body                      |
| 409  | Conflicts with current resource state |

### PATCH — partial update

Body is a patch document; format comes from `Content-Type`:

- **JSON Merge Patch** (RFC 7396, `application/merge-patch+json`): same shape as the resource, only changed fields; `null` deletes a field. Unsuitable when the resource legitimately stores `null`, and has no ordering.
  ```json
  // original {"name":"gizmo","category":"widgets","color":"blue","price":10}
  { "price": 12, "color": null, "size": "small" } // update price, delete color, add size
  ```
- **JSON Patch** (RFC 6902, `application/json-patch+json`): ordered operations — `add`, `remove`, `replace`, `copy`, `move`, `test`.

| Code | When                                          |
| ---- | --------------------------------------------- |
| 200  | Updated                                       |
| 400  | Malformed patch document                      |
| 409  | Valid patch, but can't apply to current state |
| 415  | Patch format not supported                    |

### DELETE

| Code | When                   |
| ---- | ---------------------- |
| 204  | Deleted, no body       |
| 404  | Resource doesn't exist |

## 3. Media types & content negotiation

- `Content-Type` declares the body format on requests and responses: `application/json; charset=utf-8`.
- Unsupported request media type → **415 Unsupported Media Type**.
- Client lists acceptable response formats in `Accept`; if none can be satisfied → **406 Not Acceptable** (or fall back to a default type, if documented).

## 4. Asynchronous (long-running) operations

When POST/PUT/PATCH/DELETE would take too long to complete inline:

1. Return **202 Accepted** with `Location: /api/status/{id}`.
2. `GET` the status endpoint → `200` with current state, optionally ETA and a cancel link:
   ```json
   {
     "status": "In progress",
     "link": {
       "rel": "cancel",
       "method": "delete",
       "href": "/api/status/12345"
     }
   }
   ```
3. If the job created a resource, once complete the status endpoint returns **303 See Other** with `Location: /api/orders/12345`.

## 5. Pagination, filtering, sorting, field selection

- **Pagination**: `GET /orders?limit=25&offset=50`. Always give sensible defaults (`limit=25`, `offset=0`) and **enforce a max limit** (DoS protection) — either clamp to the max or return 400, as documented.
- **Filtering** via query string: `GET /orders?minCost=100&status=shipped`.
- **Sorting**: `sort=price`. Note query params are part of cache keys, so many sort variants fragment caches.
- **Field selection**: `fields=id,name`. **Validate requested fields** — never let projection expose fields the client isn't allowed to see.

## 6. Partial responses (large binaries)

- Advertise `Accept-Ranges: bytes` on GET for large resources (files, images).
- Support `HEAD` so clients can read `Content-Length`/`Content-Type` without the body.
- Client sends `Range: bytes=0-2499` → server returns **206 Partial Content** with `Content-Range: bytes 0-2499/4580` and `Content-Length` = bytes actually returned.

## 7. HATEOAS (hypermedia)

Responses include links to related resources and the operations available on them, so clients navigate without hard-coding URIs. No universal standard; one shape:

```json
{
  "orderID": 3,
  "quantity": 4,
  "orderValue": 16.6,
  "links": [
    {
      "rel": "customer",
      "href": "/customers/3",
      "action": "GET",
      "types": ["application/json"]
    },
    {
      "rel": "self",
      "href": "/orders/3",
      "action": "PUT",
      "types": ["application/json"]
    },
    { "rel": "self", "href": "/orders/3", "action": "DELETE", "types": [] }
  ]
}
```

The set of links can change with resource state (the "engine of application state"). Optional for internal APIs consumed only by our own frontend.

## 8. Versioning

Additive changes (new fields) are usually non-breaking if clients ignore unknown fields. Removing/renaming fields or restructuring relationships is breaking. Options:

| Strategy     | Example                                       | Trade-offs                                                                                                             |
| ------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| None         | —                                             | Simplest; fine for internal APIs. Represent big changes as new resources/links                                         |
| URI          | `/v2/customers/3`                             | Simple, cache-friendly. Many versions get unwieldy; links must carry version; same resource ≠ same URI                 |
| Query string | `/customers/3?version=2` (default to 1)       | Same URI per resource, cache-friendly; some old proxies skip caching query URLs                                        |
| Header       | `Custom-Header: api-version=2` (default to 1) | Clean URIs; links must carry header; caches must vary on header                                                        |
| Media type   | `Accept: application/vnd.contoso.v1+json`     | Best fit for HATEOAS; server echoes via `Content-Type`; 406 or default for unknown types; caches must vary on `Accept` |

Old versions keep returning their original schema.

## 9. Multitenancy

Decide up front how a tenant (organization) is identified — retrofitting isolation is expensive:

- **Subdomain/domain**: `https://adventureworks.api.contoso.com/orders/3`. Preserve host name through proxies.
- **Header/token**: `X-Tenant-ID`, `X-Organization-ID`, `Host`/`X-Forwarded-Host`, or a JWT/session claim. Keeps URIs clean and centralizes auth. **Caching risk**: if a cache keys only on URI, it can serve one tenant's data to another — vary on the header or don't cache.
- **Path**: `/tenants/adventureworks/orders/3`. Works but less RESTful and complicates routing.

Whatever the transport, **authorize every request against the tenant** — never trust a client-supplied tenant id without checking membership.

## 10. Distributed tracing

Propagate a correlation id (`Correlation-ID`, `X-Request-ID`, `X-Trace-ID`, or W3C `traceparent`) from client through services and **echo it on the response**. In this repo the wide-event middleware already assigns `request_id`; reuse it rather than inventing another id.

## 11. Maturity & contracts

Richardson Maturity Model: **L0** one URI, all POST (SOAP-style) → **L1** separate resource URIs → **L2** proper HTTP methods + status codes (target for most APIs) → **L3** hypermedia (fully RESTful per Fielding).

OpenAPI (formerly Swagger) standardizes API descriptions; it favours **contract-first** design and enables generated docs and clients.

## Review checklist

- [ ] URIs are plural nouns, ≤ collection/item/collection, no verbs (except deliberate action sub-resources)
- [ ] Method semantics correct; PUT idempotent; POST targets collections
- [ ] Status codes: 201 + `Location` on create, 204 on empty delete/update, 400 validation (name the fields), 404 missing, 409 state conflict, 415/406 media type
- [ ] Response is a business representation, not raw DB rows; no leaked internal/private fields
- [ ] List endpoints have default + max `limit`, documented filters/sort; `fields` projection validated
- [ ] Long jobs return 202 + status URI
- [ ] Tenant/org scoping enforced server-side; caches can't cross tenants
- [ ] Breaking changes versioned or avoided; additive changes preferred
- [ ] Request id / correlation id traceable (wide-event `enrichLog` fields set)
