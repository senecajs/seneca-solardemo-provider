# Reference

Complete description of the interface exposed by
`@seneca/solardemo-provider` version 0.3.0.

- [Requirements](#requirements)
- [Registration](#registration)
- [Options](#options)
- [Entities](#entities)
- [Action patterns](#action-patterns)
- [Plugin exports](#plugin-exports)
- [Errors](#errors)
- [Authentication keys](#authentication-keys)
- [Package scripts](#package-scripts)

## Requirements

| Item | Value |
| ---- | ----- |
| Node.js | `>=24` |
| Module format | CommonJS |
| SDK | [`@voxgig-sdk/voxgig-solardemo`](https://www.npmjs.com/package/@voxgig-sdk/voxgig-solardemo) `^0.0.2` |

The SDK is an ordinary published dependency, installed by `npm install`
like any other.

The companion **test server** used by the live tests is a separate
matter: it ships only in the SDK's [source
repository](https://github.com/voxgig-sdk/voxgig-solardemo-sdk) under
`app/`, and is not published. It is needed only to run the live tests —
see [Run the live
tests](how-to.md#run-the-live-tests-against-the-test-server).

### Peer dependencies

All must be present in the host application:

| Package | Range |
| ------- | ----- |
| `seneca` | `>=3 \|\| >=4.0.0-rc2` |
| `seneca-entity` | `>=26` |
| `seneca-promisify` | `>=3` |
| `@seneca/provider` | `>=4` |
| `@seneca/env` | `>=0.4` |

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
| `sdk` | object | `{}` | Passed straight to the `VoxgigSolardemoSDK` constructor. Most usefully `base`. |
| `test` | boolean | `false` | Run the SDK against its in-memory mock transport instead of HTTP. |
| `testopts` | object | `{}` | Test-feature options, used only when `test` is true. `{entity: {...}}` seeds the mock. |

### `sdk`

Any option the SDK constructor accepts:

| Key | Effect |
| --- | ------ |
| `base` | Base URL for API requests. SDK default is `http://localhost:8901`. |
| `prefix` / `suffix` | URL fragments around the path. |
| `headers` | Headers sent on every request. |
| `system` | System overrides, e.g. a custom `fetch`. |

### `test` and `testopts`

```js
.use('@seneca/solardemo-provider', {
  test: true,
  testopts: {
    entity: {
      planet: { earth: { id: 'earth', name: 'Earth', kind: 'rock', diameter: 12756 } },
      moon: { luna: { id: 'luna', planet_id: 'earth', name: 'Luna', kind: 'rock', diameter: 3475 } },
    },
  },
})
```

Mock entities are keyed by id under their entity name. In this mode no
network calls are made, and unseeded ids produce the same not-found
behaviour as a live server.

## Entities

Two entity canons are registered, both supporting the **full** set of
Seneca store commands: `list$`, `load$`, `save$` and `remove$`.

### `provider/solardemo/planet`

| Command | Query / data | Returns |
| ------- | ------------ | ------- |
| `list$(q)` | optional match fields | Array of planet entities. |
| `load$(id)` | `id` | One planet, or `null` if not found. |
| `save$()` | entity data | Created or updated planet. |
| `remove$(id)` | `id` | `null`. |

Fields: `id`, `name`, `kind`, `diameter`. The API also defines the
optional `forbid`, `ok`, `start`, `state`, `stop` and `why` fields.

```js
const planets = await seneca.entity('provider/solardemo/planet').list$()
const earth = await seneca.entity('provider/solardemo/planet').load$('earth')
```

### `provider/solardemo/moon`

Moons are nested under a planet in the API, so **every** moon operation
requires `planet_id`. Omitting it throws
`solardemo-provider: moon <cmd>: planet_id is required` rather than
issuing a request that would 404.

| Command | Query / data | Returns |
| ------- | ------------ | ------- |
| `list$({planet_id})` | `planet_id` **required** | Array of moon entities. |
| `load$({planet_id, id})` | both **required** | One moon, or `null` if not found. |
| `save$()` | data including `planet_id` | Created or updated moon. |
| `remove$({planet_id, id})` | both **required** | `null`. |

Fields: `id`, `name`, `planet_id`, `kind`, `diameter`.

```js
const moons = await seneca
  .entity('provider/solardemo/moon')
  .list$({ planet_id: 'earth' })
```

### Create versus update

`save$` follows the Seneca convention: an entity **without** an `id` is
created, an entity **with** one is updated.

```js
// Create — no id.
const planet = await seneca
  .entity('provider/solardemo/planet')
  .make$({ name: 'Pluto', kind: 'rock', diameter: 2377 })
  .save$()

// Update — id present.
planet.diameter = 2400
await planet.save$()
```

**The API assigns ids itself and ignores any id sent on create.** A
created entity therefore comes back with a server-generated id, which
will not be one you chose.

### Query fields

Seneca query directives — any key ending in `$`, such as `sort$` or
`limit$` — are stripped before the query reaches the SDK. They are
instructions to a store, not match fields for the API, and are not
otherwise supported.

## Action patterns

### `sys:provider,provider:solardemo,get:info`

Returns metadata about the plugin and SDK. Answered locally; makes no
API call.

```js
await seneca.post('sys:provider,provider:solardemo,get:info')
```

```js
{
  ok: true,
  name: 'solardemo',
  version: '0.3.0',      // this plugin's version
  sdk: {
    name: 'voxgig-solardemo',
    version: '0.0.1',    // the installed SDK's version
  },
}
```

### Entity patterns

Registered by `@seneca/provider`. Normally reached through the entity
API rather than called directly.

| Pattern |
| ------- |
| `sys:entity,zone:provider,base:solardemo,name:planet,cmd:list` |
| `sys:entity,zone:provider,base:solardemo,name:planet,cmd:load` |
| `sys:entity,zone:provider,base:solardemo,name:planet,cmd:save` |
| `sys:entity,zone:provider,base:solardemo,name:planet,cmd:remove` |
| `sys:entity,zone:provider,base:solardemo,name:moon,cmd:list` |
| `sys:entity,zone:provider,base:solardemo,name:moon,cmd:load` |
| `sys:entity,zone:provider,base:solardemo,name:moon,cmd:save` |
| `sys:entity,zone:provider,base:solardemo,name:moon,cmd:remove` |

### Inherited from `@seneca/provider`

| Pattern | Purpose |
| ------- | ------- |
| `sys:provider,get:key` | Fetch one named key for a provider. |
| `sys:provider,get:keymap` | Fetch all keys for a provider. |
| `sys:provider,list:provider` | List registered providers and their key names. |

## Plugin exports

### `SolardemoProvider/sdk`

A function returning the configured `VoxgigSolardemoSDK` instance.

```js
const sdk = seneca.export('SolardemoProvider/sdk')()

const planets = await sdk.Planet().list()
const res = await sdk.direct({ path: '/api/planet', method: 'GET' })
```

Available only after `seneca.ready()`. Use it for SDK features the
entity API does not surface — notably `direct()` and `prepare()` for
endpoints outside the entity model.

## Errors

| Situation | Behaviour |
| --------- | --------- |
| `load$` for a non-existent id | Resolves to `null`. |
| `remove$` for a non-existent id | Resolves to `null`; not an error. |
| Moon operation without `planet_id` | Throws before any request is made. |
| Any other non-2xx response | Thrown as raised by the SDK. |

SDK errors are `VoxgigSolardemoError` instances carrying
`isVoxgigSolardemoError: true`, a `code` (e.g. `request_status`), and a
`result` object holding the HTTP `status`, `statusText`, `headers` and
`body`. The `null`-on-missing behaviour is triggered by
`result.status === 404`.

```js
try {
  await seneca.entity('provider/solardemo/planet').list$()
}
catch (err) {
  console.error(err.code, err.result && err.result.status)
}
```

## Authentication keys

The Solardemo API is **unauthenticated**, so no key is required. The
plugin still follows the provider convention: if an `apikey` key is
configured and non-empty, it is sent as
`authorization: Bearer <apikey>` on every request. If the provider is
not registered, or the key is absent or empty, no header is added and
startup proceeds normally.

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

### Repository layout

| Path | Contents |
| ---- | -------- |
| `src/` | TypeScript source, with its own `tsconfig.json`. |
| `test/` | Test suite (`.js`, run by `node:test`) and TypeScript fixtures. |
| `dist/` | Compiled source. Committed; published. |
| `dist-test/` | Compiled test fixtures. Committed; **not** published. |
| `.tsbuildinfo/` | Incremental build cache. Not committed. |
| `doc/` | This documentation. |

### Manual scripts

| Script | Purpose |
| ------ | ------- |
| `node test/live.js` | Read planets and moons from a running server. |
| `node test/quick.js` | Exercise the full CRUD cycle, cleaning up after itself. |

Both target `$SOLARDEMO_TEST_BASE`, defaulting to
`http://localhost:8901`.
