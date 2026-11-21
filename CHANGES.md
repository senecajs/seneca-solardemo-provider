# Changes

## 0.2.0 2026-11-21

First entry of this change log. Earlier versions are on npm and in the git history.

* Seneca 4: the peer dependency is `seneca` `^4.0.0`. Seneca 3 users stay on `@seneca/solardemo-provider@0.1`.
* The entity peer is `@seneca/entity` `^29.0.0`, replacing `seneca-entity`. The `seneca-promisify` peer is removed, because Seneca 4 has it built in.
* Peers `@seneca/provider` `^5.0.0` and `@seneca/env` `^0.6.0`, the Seneca 4 releases. They are also development dependencies, so the build workflows no longer install an unversioned Seneca 3 host with `npm i --no-save`.
* `@seneca/maintain` moves from `dependencies` to `devDependencies`: only the tests use it, so applications no longer install it.
* Node.js 24 or later (`engines.node` `>=24`).
* The tests, scripts and examples load `@seneca/entity`, `@seneca/env` and `@seneca/provider` by full name and no longer load `promisify`.
