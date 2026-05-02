---
description: A description of your rule
---

1. Routing and Filenames

Controllers must be placed in `src/controller/`, using file-based routing.

Filename format is fixed as `{route}.{method}.ts`, with HTTP methods always lowercase.

`index.{method}.ts` represents the root directory route; `[id]` represents dynamic parameters.

2. Request Validation and Response

All inputs (body/query/params) must undergo schema validation.

Currently, Joi is used uniformly (unless a formal project migration announcement is issued).

The response format is uniformly `res.send({ statusCode, message, data|details })`.

Status code conventions: 200/400/401/402/403/404.

3. Basic Controller Structure

Business logic must be wrapped in `try-catch` blocks.

Only `req.log()` is used to log requests and errors; `console.log` is prohibited (except for job classes).

Parameter errors return 403, unauthorized returns 401/402, business/system errors return 400.

4. Database Operations
Preferably use `.lean()` with `find/findOne/findById`.

Use `updateOne` / `findOneAndUpdate` for updates; use `create` for additions.

Avoid the document write-back mode of `document.save()`.

ObjectId conditions must be explicitly cast to `new mongoose.Types.ObjectId(...)`.

5. Transaction and Amount Security
All amount calculations must be performed using Decimal.js.

For deductions/sales/settlements, negative balances and overselling must be prevented.

Prioritize atomic condition updates + post-event validation + compensation strategies.

All transaction logs must be traceable (including related fields such as `orderId`).

6. Multi-tenancy and Permissions
All business queries and writes must be isolated with `siteId`.

Role permissions (Admin / SiteOwner / Agent / Player) must be filtered at the query layer.

Cross-site read/write is prohibited (except for super administrators).

7. Current Conflict Handling Principles (Hard): In case of document conflicts, the specification that can be stably executed by the current program code shall prevail.

Joi vs Zod: Joi takes precedence over the current version.

Transaction Prohibition: Considered a rule under implementation; new developments should avoid it as much as possible, and old code should be gradually cleaned up.