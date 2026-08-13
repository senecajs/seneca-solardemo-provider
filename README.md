![Seneca Solardemo-Provider](http://senecajs.org/files/assets/seneca-logo.png)

> _Seneca Solardemo-Provider_ is a plugin for [Seneca](http://senecajs.org)

Provides access to the Solar System API using the Seneca _provider_
convention. Solar System entities are represented as Seneca entities so that
they can be accessed using the Seneca entity API and messages.

Requests are handled by the [Solar System SDK](https://github.com/voxgig-sdk/voxgig-solardemo-sdk),
which is generated from the API's OpenAPI specification. This plugin is
generated from the same specification by
[@voxgig/sdkgen](https://github.com/voxgig/sdkgen) — do not edit it by hand,
change the model and regenerate.

See [seneca-entity](https://github.com/senecajs/seneca-entity) and the [Seneca Data
Entities
Tutorial](https://senecajs.org/docs/tutorials/understanding-data-entities.html)
for more details on the Seneca entity API.

[![build](https://github.com/senecajs/seneca-solardemo-provider/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca-solardemo-provider/actions/workflows/build.yml)

| This open source module is sponsored and supported by [Voxgig](https://voxgig.com). |
| --- |


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
const Seneca = require('seneca')

const seneca = Seneca()
  .use('promisify')
  .use('entity')
  .use('env', { var: { $SOLARDEMO_APIKEY: '' } })
  .use('provider', {
    provider: {
      solardemo: {
        keys: { apikey: { value: '$SOLARDEMO_APIKEY' } },
      },
    },
  })
  .use('@seneca/solardemo-provider')

await seneca.ready()

const planets = await seneca
  .entity('provider/solardemo/planet').list$()
const planet = await seneca
  .entity('provider/solardemo/planet').load$('some-id')
```


## Install

```sh
npm install @seneca/solardemo-provider
```

This plugin expects the Seneca host framework to be present:

```sh
npm install seneca seneca-entity seneca-promisify @seneca/provider @seneca/env
```


## Options

| Option | Type | Description |
| --- | --- | --- |
| `sdk` | object | Passed straight to the `SolardemoSDK` constructor. Most usefully `base`, to point at a server. |
| `test` | boolean | Run the SDK in offline test mode (in-memory mock transport). |
| `testopts` | object | Seed and options for the mock, used only when `test` is true. |


## Entities

Each API entity is exposed as a Seneca entity under
`provider/solardemo/<entity>`.

| Seneca entity | Commands | Fields |
| --- | --- | --- |
| `provider/solardemo/moon` | `list$`, `load$`, `save$`, `remove$` | `diameter`, `id`, `kind`, `name`, `planet_id` |
| `provider/solardemo/planet` | `list$`, `load$`, `save$`, `remove$` | `diameter`, `id`, `kind`, `name` |

### Nested entities

Some entities live under a parent in the API path, so every command needs the
parent's id in the query. Leaving it out throws with a message naming the
missing key, rather than failing as an opaque 404 from a half-built URL.

- `moon` requires `planet_id`


## Action Patterns

Every message pattern this plugin registers. The entity actions are the ones
`seneca-entity` dispatches to when you call `list$` / `load$` / `save$` /
`remove$` on a canon below — you rarely post them by hand, but they are what
appears in a Seneca log, and a plugin that documents one of nine is a plugin
whose logs cannot be read.

| Pattern | Description |
| --- | --- |
| `sys:provider,provider:solardemo,get:info` | Plugin and SDK version information. |
| `sys:entity,cmd:list,zone:provider,base:solardemo,name:moon` | List records. |
| `sys:entity,cmd:load,zone:provider,base:solardemo,name:moon` | Load one record. |
| `sys:entity,cmd:save,zone:provider,base:solardemo,name:moon` | Create or update a record. |
| `sys:entity,cmd:remove,zone:provider,base:solardemo,name:moon` | Remove a record. |
| `sys:entity,cmd:list,zone:provider,base:solardemo,name:planet` | List records. |
| `sys:entity,cmd:load,zone:provider,base:solardemo,name:planet` | Load one record. |
| `sys:entity,cmd:save,zone:provider,base:solardemo,name:planet` | Create or update a record. |
| `sys:entity,cmd:remove,zone:provider,base:solardemo,name:planet` | Remove a record. |



## More Examples

### Offline testing

The SDK ships an in-memory mock transport, so this plugin can be exercised
with no server:

```js
.use('@seneca/solardemo-provider', { test: true, testopts: { entity: { ... } } })
```

`testopts` is passed straight to the SDK's test constructor; `entity`
seeds the mock store. See `test/seed.js` for the shape.

### Running against a server

```js
.use('@seneca/solardemo-provider', { sdk: { base: 'http://localhost:8901' } })
```

The companion test server is distributed in the SDK's source repository
only. From a checkout beside this one:

```sh
cd ../../voxgig-sdk/voxgig-solardemo-sdk/app && npm start
```

Then `node test/live.js` reads from it, and `node test/quick.js` runs a
full create/update/load/remove cycle.


## Motivation

Applications rarely talk to one external service, and each service usually
arrives with its own client library, authentication style and error
conventions. That variety leaks into application code and makes it harder to
test.

The Seneca provider convention removes the variety: every external service
becomes a Seneca entity reached with `list$`, `load$`, `save$` and
`remove$`, so application code has one shape regardless of what it talks to.

The SDK underneath arrives at a similar conclusion from the other side — it
deliberately exposes entities rather than HTTP routes. This plugin is the
short bridge between the two.


## Support

- Issues and bugs: [GitHub issues](https://github.com/senecajs/seneca-solardemo-provider/issues)
- Seneca community: [senecajs.org](http://senecajs.org)


## API

### Plugin export: `SolardemoProvider/sdk`

Returns the configured `SolardemoSDK` instance, for the operations
the entity API does not cover:

```js
const sdk = seneca.export('SolardemoProvider/sdk')()
```


## Contributing

This plugin is GENERATED. Changes belong in the SDK project's model and
components, not here — anything edited in this repository is overwritten by
the next generation run.

The [Senecajs org](http://senecajs.org) encourages open participation. If you
feel you can help in any way, be it with bug reporting, documentation,
examples, extra testing, or new features, please get in touch.


## Background

Generated by [@voxgig/sdkgen](https://github.com/voxgig/sdkgen) from the
Solar System API definition, against the
[@voxgig-sdk/voxgig-solardemo](https://www.npmjs.com/package/@voxgig-sdk/voxgig-solardemo) SDK.
