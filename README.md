![Seneca Solardemo-Provider](http://senecajs.org/files/assets/seneca-logo.png)

> _Seneca Solardemo-Provider_ is a plugin for [Seneca](http://senecajs.org)

Provides access to the Voxgig Solardemo API using the Seneca _provider_
convention. Solardemo API entities are represented as Seneca entities so
that they can be accessed using the Seneca entity API and messages.

Requests are handled by the [Voxgig Solardemo
SDK](https://github.com/voxgig-sdk/voxgig-solardemo-sdk), which is
generated from the API's OpenAPI specification.

See [seneca-entity](https://github.com/senecajs/seneca-entity) and the [Seneca Data
Entities
Tutorial](https://senecajs.org/docs/tutorials/understanding-data-entities.html) for more details on the Seneca entity API.

[![build](https://github.com/senecajs/seneca-solardemo-provider/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca-solardemo-provider/actions/workflows/build.yml)

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |


<!--START:SECTION:intro-->
<!--END:SECTION:intro-->


## Documentation

Full documentation lives in [`doc/`](doc/README.md) and follows the
[Diátaxis](https://diataxis.fr) framework:

| Document | Purpose |
| -------- | ------- |
| [Tutorial](doc/tutorial.md) | Start here. Build a working script from an empty folder. |
| [How-to guides](doc/how-to.md) | Recipes for specific tasks. |
| [Reference](doc/reference.md) | Every pattern, entity, option and export. |
| [Explanation](doc/explanation.md) | Why the plugin is designed this way. |


## Quick Example

```js
const seneca = await Seneca({ legacy: false })
  .use('promisify')
  .use('entity')
  .use('provider', {
    provider: {
      solardemo: {
        keys: {
          // The Solardemo API needs no credentials; an apikey is sent as a
          // bearer token when one is configured.
          apikey: { value: '' },
        },
      },
    },
  })
  .use('@seneca/solardemo-provider', {
    sdk: { base: 'http://localhost:8901' },
  })
  .ready()

// List all planets.
const planets = await seneca.entity('provider/solardemo/planet').list$()

console.log('PLANETS', planets)

// Moons are nested under a planet, so they need a planet_id.
const moons = await seneca
  .entity('provider/solardemo/moon')
  .list$({ planet_id: 'earth' })

console.log('MOONS', moons)

// Create, update and remove are supported too. The server assigns the id.
let pluto = await seneca
  .entity('provider/solardemo/planet')
  .make$({ name: 'Pluto', kind: 'rock', diameter: 2377 })
  .save$()

pluto.diameter = 2400
pluto = await pluto.save$()

await seneca.entity('provider/solardemo/planet').remove$(pluto.id)
```

## Install

```sh
$ npm install @seneca/solardemo-provider
```

The plugin also needs these peer dependencies in your application:

```sh
$ npm install seneca seneca-entity seneca-promisify @seneca/provider
```

The [Solardemo
SDK](https://www.npmjs.com/package/@voxgig-sdk/voxgig-solardemo) comes
along as a normal dependency. Node.js 24 or later is required.

If you are working on the SDK and this plugin together, see
[Develop against a local SDK
checkout](doc/how-to.md#develop-against-a-local-sdk-checkout).

## How to get access

The Solardemo API is a demonstration API and needs **no credentials**.

For local development, run the companion test server that ships in the
SDK repository:

```sh
$ cd ~/Projects/voxgig-sdk/voxgig-solardemo-sdk/app
$ npm install && npm run build && npm start
```

It serves `http://localhost:8901`, which is also the SDK's default
`base`.

If you point the provider at a deployment that does require a key,
configure an `apikey` and it is sent as `authorization: Bearer <key>` —
see [Send an API key](doc/how-to.md#send-an-api-key).

## Options

| Option | Type | Default | Effect |
| ------ | ---- | ------- | ------ |
| `sdk` | object | `{}` | Passed to the `SolardemoSDK` constructor. Most usefully `base`. |
| `test` | boolean | `false` | Use the SDK's in-memory mock transport instead of HTTP. |
| `testopts` | object | `{}` | Test-feature options; `{entity: {...}}` seeds the mock. Used only when `test` is true. |

See [Run without a server](doc/how-to.md#run-without-a-server-using-the-sdk-mock)
for testing application code offline.

## Entities

Two entity canons are registered, both supporting the full set of store
commands.

| Entity | `list$` | `load$` | `save$` | `remove$` |
| ------ | ------- | ------- | ------- | --------- |
| `provider/solardemo/planet` | optional match | `id` | ✓ | `id` |
| `provider/solardemo/moon` | `planet_id` (required) | `{planet_id, id}` | ✓ (needs `planet_id`) | `{planet_id, id}` |

Planet fields: `id`, `name`, `kind`, `diameter`.
Moon fields: `id`, `name`, `planet_id`, `kind`, `diameter`.

Full field descriptions are in the
[reference](doc/reference.md#entities).

## Action Patterns

| Pattern |
| ------- |
| `sys:provider,provider:solardemo,get:info` |
| `sys:entity,zone:provider,base:solardemo,name:planet,cmd:list` |
| `sys:entity,zone:provider,base:solardemo,name:planet,cmd:load` |
| `sys:entity,zone:provider,base:solardemo,name:planet,cmd:save` |
| `sys:entity,zone:provider,base:solardemo,name:planet,cmd:remove` |
| `sys:entity,zone:provider,base:solardemo,name:moon,cmd:list` |
| `sys:entity,zone:provider,base:solardemo,name:moon,cmd:load` |
| `sys:entity,zone:provider,base:solardemo,name:moon,cmd:save` |
| `sys:entity,zone:provider,base:solardemo,name:moon,cmd:remove` |

The `sys:entity` patterns are registered by `@seneca/provider` and are
normally reached through the entity API rather than called directly.

## Action Descriptions

### `sys:provider,provider:solardemo,get:info`

Get information about the plugin and the SDK it wraps. Answered
locally — this makes no API call.

```js
await seneca.post('sys:provider,provider:solardemo,get:info')

// {
//   ok: true,
//   name: 'solardemo',
//   version: '0.3.0',
//   sdk: { name: 'voxgig-solardemo', version: '0.1.0' },
// }
```

### Entity actions

| Action | Description |
| ------ | ----------- |
| `cmd:list, name:planet` | List planets. |
| `cmd:load, name:planet` | Load one planet by `id`. `null` if not found. |
| `cmd:save, name:planet` | Create (no id) or update (id present). |
| `cmd:remove, name:planet` | Remove one planet by `id`. |
| `cmd:list, name:moon` | List moons of the planet given by `planet_id`. |
| `cmd:load, name:moon` | Load one moon by `planet_id` and `id`. `null` if not found. |
| `cmd:save, name:moon` | Create or update a moon; data must include `planet_id`. |
| `cmd:remove, name:moon` | Remove one moon by `planet_id` and `id`. |

Every moon action requires `planet_id` and throws without it. The API
assigns ids on create and ignores any id sent.

## More Examples

Walk from a planet down to its moons:

```js
const planets = await seneca.entity('provider/solardemo/planet').list$()

const moons = await seneca
  .entity('provider/solardemo/moon')
  .list$({ planet_id: planets[0].id })

console.log(planets[0].name + ' has ' + moons.length + ' moon(s)')
```

A missing record resolves to `null` rather than throwing:

```js
await seneca.entity('provider/solardemo/planet').load$('vulcan')
// null
```

Run entirely offline against the SDK's mock:

```js
.use('@seneca/solardemo-provider', {
  test: true,
  testopts: {
    entity: {
      planet: { earth: { id: 'earth', name: 'Earth', kind: 'rock', diameter: 12756 } },
    },
  },
})
```

Reach the SDK directly for anything the entity API does not cover:

```js
const sdk = seneca.export('SolardemoProvider/sdk')()
const res = await sdk.direct({ path: '/api/planet', method: 'GET' })
```

More recipes are in the [how-to guides](doc/how-to.md).

## Motivation

Applications rarely talk to one external service, and each service
usually arrives with its own client library, authentication style and
error conventions. That variety leaks into application code and makes
it harder to test.

The Seneca provider convention removes the variety: every external
service becomes a Seneca entity reached with `list$`, `load$`, `save$`
and `remove$`, so application code has one shape regardless of what it
talks to.

The Voxgig SDK arrives at a similar conclusion from the other side — it
deliberately exposes entities rather than HTTP routes. This plugin is
the short bridge between the two, and the places where they disagree
are discussed in [Explanation](doc/explanation.md).

## Support

- Issues and bugs: [GitHub issues](https://github.com/senecajs/seneca-solardemo-provider/issues)
- Seneca community: [senecajs.org](http://senecajs.org)

This module is sponsored and supported by
[Voxgig](https://www.voxgig.com).

## API

### Plugin export: `SolardemoProvider/sdk`

Returns the configured `SolardemoSDK` instance.

```js
const sdk = seneca.export('SolardemoProvider/sdk')()

// SDK operations resolve to SDK entities; `.data()` gives plain data.
const planets = (await sdk.Planet().list()).map((p) => p.data())

await sdk.direct({ path: '/api/planet/{id}', method: 'GET', params: { id: 'earth' } })
```

Available only after `seneca.ready()` resolves, because the client is
constructed during plugin startup. Use it for `direct()` and
`prepare()`, and anything else outside the entity model.

The complete interface — patterns, entity fields, options, errors — is
documented in the [reference](doc/reference.md).

## Contributing

The [Senecajs org](https://github.com/senecajs/) encourages open
participation. If you feel you can help in any way, be it with
documentation, examples, extra testing, or new features, please get in
touch.

To work on this plugin:

```sh
$ npm install
$ npm run build      # tsc --build src test
$ npm test           # node:test
```

The offline tests use the SDK's mock transport and always run. The live
tests need the companion server and skip cleanly without it — see
[Run the live tests](doc/how-to.md#run-the-live-tests-against-the-test-server).

Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before
contributing.

## Background

The Solardemo API is a demonstration REST API describing a solar
system: planets, and the moons nested beneath them. It exists to
exercise the [Voxgig SDK generator](https://github.com/voxgig/sdkgen),
which produces TypeScript and Go clients from a single OpenAPI model.

The SDK repository holds the generated clients under `ts/` and `go/`,
the generator model under `.sdk/`, and a standalone Fastify server
under `app/` that implements the API for local development. This plugin
uses the TypeScript client, and its live tests run against that server.

Because the API nests moons under planets while Seneca entities are
flat, this plugin takes the parent id as a query field — which is why
moon operations require a `planet_id`. That design, and the other
places the two entity models disagree, are covered in
[Explanation](doc/explanation.md).

This module is part of the Seneca provider family. Other providers
follow the same conventions, so what you learn here transfers.
