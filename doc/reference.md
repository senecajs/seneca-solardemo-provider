# Reference

Complete description of the interface exposed by
`@seneca/solardemo-provider` version 0.3.0.

This document describes the machinery and assumes you know what you are
looking for. To learn the plugin, start with the [tutorial](tutorial.md);
for recipes, see the [how-to guides](how-to.md); for the reasoning behind
the design, see the [explanation](explanation.md). The package overview is
the [README](../README.md), and the document index is [here](README.md).

- [Requirements](#requirements)
- [Registration](#registration)
- [Options](#options)
- [Entities](#entities)
- [Action patterns](#action-patterns)
- [Plugin exports](#plugin-exports)
- [Errors](#errors)
- [Authentication keys](#authentication-keys)
- [Environment variables](#environment-variables)
- [Package scripts](#package-scripts)

## Requirements

| Item | Value |
| ---- | ----- |
| Node.js | `>=24` |
| Module format | CommonJS |
| SDK | [`@voxgig-sdk/voxgig-solardemo`](https://www.npmjs.com/package/@voxgig-sdk/voxgig-solardemo) `^0.1.0` |

The SDK is an ordinary published dependency, installed by `npm install`
like any other.

The companion **test server** used by the live tests is a separate matter:
it ships only in the SDK's [source repository](https://github.com/voxgig-sdk/voxgig-solardemo-sdk) under
`app/`, and is not published. It is needed only to run the live tests —
see the [how-to guides](how-to.md).

### Peer dependencies

All must be present in the host application. The accepted version ranges are
declared in this package's `package.json`.

| Package | Purpose |
| ------- | ------- |
| `seneca` | The host framework. The plugin runs inside the host's instance, never its own. |
| `seneca-entity` | The entity API the canons below are served through. |
| `seneca-promisify` | The promise-returning message API. |
| `@seneca/provider` | The provider convention, including `provider/entityBuilder`. |
| `@seneca/env` | Resolves `$`-prefixed key values from the environment. |

## Registration

The plugin name is `SolardemoProvider`. It must be registered after
`entity`, `promisify` and `provider`:

```js
Seneca({ legacy: false })
  .use('promisify')
  .use('entity')
  .use('provider', { ... })
  .use('@seneca/solardemo-provider', { sdk: { base: 'http://localhost:8901' } })
```

The SDK client is constructed during plugin startup and is not available
until `seneca.ready()` resolves.

## Options

| Option | Type | Default | Effect |
| ------ | ---- | ------- | ------ |
| `sdk` | object | `{}` | Passed straight to the `SolardemoSDK` constructor. Most usefully `base`. |
| `test` | boolean | `false` | Run the SDK against its in-memory mock transport instead of HTTP. |
| `testopts` | object | `{}` | Test-feature options, used only when `test` is true. `{entity: {...}}` seeds the mock. |

### `sdk`

Any option the `SolardemoSDK` constructor accepts:

| Key | Effect |
| --- | ------ |
| `base` | Base URL for API requests. The SDK's own default is `http://localhost:8901`. |
| `prefix` / `suffix` | URL fragments placed around the path. |
| `headers` | Headers sent on every request. These win over the `authorization` header the provider adds from a configured key. |
| `system` | System overrides, e.g. a custom `fetch`. |

### `test` and `testopts`

```js
.use('@seneca/solardemo-provider', {
  test: true,
  testopts: {
    entity: {
      moon: { moon0: {"diameter":100,"id":"moon0","kind":"kind0","name":"name0","planet_id":"planet0"} },
      planet: { planet0: {"diameter":100,"id":"planet0","kind":"kind0","name":"name0"} },
    },
  },
})
```

Mock records are keyed by id under their entity name. In this mode no
network calls are made, and an unseeded id produces the same not-found
behaviour as a live server. This package's own `test/seed.js` is generated
in exactly this shape.

A nested record's parent key must name a record the parent entity also
seeds: the mock resolves the path literally, so an unmatched parent id
yields nothing rather than an error.

## Entities

The plugin registers 2 entity canons.
A canon carries only the commands its API operations support — an entity the
API offers no delete for has no `remove$` — so the tables below are the
whole of what each one answers.

| Seneca canon | SDK accessor | Route | Id field | Parent keys | Commands |
| ------------ | ------------ | ----- | -------- | ----------- | -------- |
| `provider/solardemo/moon` | `sdk.Moon()` | `/api/planet/{planet_id}/moon` | `id` | `planet_id` | `list$`, `load$`, `save$`, `remove$` |
| `provider/solardemo/planet` | `sdk.Planet()` | `/api/planet` | `id` | — | `list$`, `load$`, `save$`, `remove$` |

### `provider/solardemo/moon`

Backed by `sdk.Moon()`, whose results are `MoonEntity` instances; the
provider hands Seneca the plain record from `.data()`.

`moon` is nested under `/api/planet/{planet_id}/moon` in the API, so **every**
`moon` command requires `planet_id`. Omitting one throws —
`@seneca/solardemo-provider: moon <cmd>: planet_id is required` —
before any request is made, rather than issuing one that would 404.

| Command | Query / data | Returns |
| ------- | ------------ | ------- |
| `list$(q)` | `planet_id` **required**, plus optional match fields | Array of `moon` entities. |
| `load$(q)` | `planet_id` and `id`, both **required** | One `moon`, or `null` if not found. |
| `save$()` | entity data, including `planet_id` | Created or updated `moon`. |
| `remove$(q)` | `planet_id` and `id`, both **required** | `null`. |

Required fields, as declared by the API definition. Optional fields the API
also defines are passed through unchanged in both directions.

| Field | Type | Notes |
| ----- | ---- | ----- |
| `diameter` | number |  |
| `id` | string | Id field. |
| `kind` | string |  |
| `name` | string |  |
| `planet_id` | string | Parent key: the id of a `planet`. Required by every command. |

```js
const moons = await seneca
  .entity('provider/solardemo/moon')
  .list$({ planet_id: '...' })
const moon = await seneca
  .entity('provider/solardemo/moon')
  .load$({ planet_id: '...', id: '...' })
```

### `provider/solardemo/planet`

Backed by `sdk.Planet()`, whose results are `PlanetEntity` instances; the
provider hands Seneca the plain record from `.data()`.

| Command | Query / data | Returns |
| ------- | ------------ | ------- |
| `list$(q)` | optional match fields | Array of `planet` entities. |
| `load$(q)` | `id` **required** | One `planet`, or `null` if not found. |
| `save$()` | entity data | Created or updated `planet`. |
| `remove$(q)` | `id` **required** | `null`. |

Required fields, as declared by the API definition. Optional fields the API
also defines are passed through unchanged in both directions.

| Field | Type | Notes |
| ----- | ---- | ----- |
| `diameter` | number |  |
| `id` | string | Id field. |
| `kind` | string |  |
| `name` | string |  |

```js
const planets = await seneca
  .entity('provider/solardemo/planet')
  .list$()
const planet = await seneca
  .entity('provider/solardemo/planet')
  .load$('...')
```

### Create versus update

`save$` follows the Seneca convention: an entity **without** an id is
created, an entity **with** one is updated. The provider dispatches on the
id field, so the same call does both.

```js
// Create — no id.
const planet = await seneca
  .entity('provider/solardemo/planet')
  .make$({ diameter: 1234, kind: 'kind-value', name: 'name-value' })
  .save$()

// Update — id present.
planet.diameter = 4321
await planet.save$()
```

Whether a client-supplied id survives a create is a property of the API, not
of this plugin: many assign the id themselves and ignore the one sent. Read
the id back off the returned entity rather than assuming the one you set.

### Command to SDK operation

| Seneca command | SDK call | Notes |
| -------------- | -------- | ----- |
| `list$(q)` | `.list(q)` | Query keys are passed through as match fields. |
| `load$(q)` | `.load({ ...keys })` | Only the keys the route needs are sent. |
| `save$()` on an entity with no id | `.create(data)` | Data is the entity's own fields, without Seneca metadata. |
| `save$()` on an entity with an id | `.update(data)` | |
| `remove$(q)` | `.remove({ ...keys })` | Resolves to `null` whatever the API returns. |

Every SDK operation resolves to an SDK entity instance, or a list of them,
rather than raw data. The provider calls `.data()` on each and hands the
plain record to `entize`, so what comes back is an ordinary Seneca entity
under this plugin's canon, carrying none of the SDK's own markers.

### Query fields

Seneca query directives — any key ending in `$`, such as `sort$` or
`limit$` — are stripped before the query reaches the SDK. They are
instructions to a store, not match fields for the API, and are not
otherwise supported.

## Action patterns

### `sys:provider,provider:solardemo,get:info`

Returns metadata about the plugin and SDK. Answered locally; makes no API
call.

```js
await seneca.post('sys:provider,provider:solardemo,get:info')
```

```js
{
  ok: true,
  name: 'solardemo',
  version: '0.3.0',
  sdk: {
    name: '@voxgig-sdk/voxgig-solardemo',
    version: '0.1.0',
  },
}
```

Both versions are read at runtime from the respective `package.json`, so
they describe what is installed rather than what was generated.

### Entity patterns

Registered by `@seneca/provider`. Normally reached through the entity API
rather than posted directly.

| Pattern |
| ------- |
| `sys:entity,zone:provider,base:solardemo,name:moon,cmd:list` |
| `sys:entity,zone:provider,base:solardemo,name:moon,cmd:load` |
| `sys:entity,zone:provider,base:solardemo,name:moon,cmd:save` |
| `sys:entity,zone:provider,base:solardemo,name:moon,cmd:remove` |
| `sys:entity,zone:provider,base:solardemo,name:planet,cmd:list` |
| `sys:entity,zone:provider,base:solardemo,name:planet,cmd:load` |
| `sys:entity,zone:provider,base:solardemo,name:planet,cmd:save` |
| `sys:entity,zone:provider,base:solardemo,name:planet,cmd:remove` |

### Inherited from `@seneca/provider`

| Pattern | Purpose |
| ------- | ------- |
| `sys:provider,get:key` | Fetch one named key for a provider. |
| `sys:provider,get:keymap` | Fetch all keys for a provider. |
| `sys:provider,list:provider` | List registered providers and their key names. |

## Plugin exports

### `SolardemoProvider/sdk`

A function returning the configured `SolardemoSDK` instance.

```js
const sdk = seneca.export('SolardemoProvider/sdk')()

// Every SDK operation resolves to an SDK entity (or a list of them),
// not raw data; `.data()` gives the plain record.
const planets = (await sdk.Planet().list()).map((e) => e.data())

// `direct` reaches endpoints outside the entity model.
const res = await sdk.direct({ path: '/api/planet', method: 'GET' })
```

Available only after `seneca.ready()`. Use it for SDK features the entity
API does not surface — notably `direct()` and `prepare()` for endpoints
the entity model does not cover.

## Errors

| Situation | Behaviour |
| --------- | --------- |
| `load$` for a non-existent id | Resolves to `null`. |
| `remove$` for a non-existent id | Resolves to `null`; not an error. |
| A nested entity command missing a parent key | Throws before any request is made. |
| A 404 from `list$` or `save$` | Thrown. Only single-record reads and removes map a 404 to `null`. |
| Any other non-2xx response | Thrown as raised by the SDK. |
| A request that never got a response | Thrown, with `status` `-1`. |

SDK errors are `SolardemoError` instances carrying
`isSolardemoError: true`, a `code` (e.g. `request_status`), the
HTTP `status` at the top level (`-1` when the request never got a
response), a `notFound` flag, and a `ctx` holding the request context and
its `result` — `status`, `statusText`, `headers` and `body`. The
`null`-on-missing behaviour is triggered by `err.notFound`, not by
inspecting the status at the call site.

```js
try {
  await seneca.entity('provider/solardemo/planet').list$()
}
catch (err) {
  console.error(err.code, err.status, err.notFound)
}
```

The missing-parent-key guard is this plugin's own, thrown before the SDK is
called at all. Its message names the entity, the command and the key:

| Entity | Message |
| ------ | ------- |
| `moon` | `@seneca/solardemo-provider: moon <cmd>: planet_id is required` |

where `<cmd>` is the command that was called. A key counts as missing if
it is absent, `null` or the empty string.

## Authentication keys

The plugin follows the provider convention: if an `apikey` key is
configured and non-empty, it is sent as `authorization: Bearer <apikey>`
on every request. If the provider is not registered, or the key is absent or
empty, no header is added and startup proceeds normally — an API that needs
no credential exercises the same path.

```js
  .use('provider', {
    provider: {
      solardemo: {
        keys: {
          apikey: { value: '$SOLARDEMO_APIKEY' },
        },
      },
    },
  })
```

The key is read once, during `seneca.prepare()`, by posting
`sys:provider,get:keymap,provider:solardemo`. An `authorization`
header supplied through the `sdk.headers` option takes precedence over it.

## Environment variables

The plugin never reads the environment itself. These are the variables the
surrounding convention and tooling resolve:

| Variable | Read by | Purpose |
| -------- | ------- | ------- |
| `$SOLARDEMO_APIKEY` | `@seneca/env` | Supplies the `apikey` value when the key is declared as `'$SOLARDEMO_APIKEY'`, as above. |
| `$SOLARDEMO_TEST_BASE` | The test suite and the manual scripts | Base URL for the live tests. Defaults to `http://localhost:8901`. |

## Package scripts

| Script | Action |
| ------ | ------ |
| `npm run build` | `tsc --build src test` — compiles to `dist` and `dist-test`. |
| `npm run watch` | The same, in watch mode. |
| `npm test` | Runs the `node:test` suite. |
| `npm run test-some` | Runs tests matching `$TEST_PATTERN`. |
| `npm run test-watch` | Test suite in watch mode. |
| `npm run test-coverage` | Test suite with Node's built-in coverage. |
| `npm run clean` | Removes `node_modules`, `dist`, `dist-test`, `.tsbuildinfo`, lockfiles. |
| `npm run reset` | `clean`, then install, build and test. |
| `npm run repo-tag` | Commits, tags and pushes `v<version>` taken from `package.json`. |
| `npm run repo-publish` | Clean install, then `repo-publish-quick`. |
| `npm run repo-publish-quick` | Build, test, tag, and publish to npm. |

### Repository layout

| Path | Contents |
| ---- | -------- |
| `src/` | TypeScript source, with its own `tsconfig.json`. |
| `test/` | Test suite (`.js`, run by `node:test`) and TypeScript fixtures. |
| `dist/` | Compiled source. Committed; published. |
| `dist-test/` | Compiled test fixtures. Committed; **not** published. |
| `.tsbuildinfo/` | Incremental build cache. Not committed. |
| `doc/` | This documentation. |

This repository is generated by
[@voxgig/sdkgen](https://github.com/voxgig/sdkgen) from the Solar System
API definition. Anything edited here is overwritten by the next generation
run; changes belong in the model.

### Manual scripts

Not part of `npm test`: they need the companion test server, which is
distributed only in the SDK's source repository.

| Script | Purpose |
| ------ | ------ |
| `node test/live.js` | Read moon, planet from a running server. |
| `node test/quick.js` | Exercise the full write cycle on `planet`, cleaning up after itself. |

Both scripts target `$SOLARDEMO_TEST_BASE`, defaulting to
`http://localhost:8901`.
