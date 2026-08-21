![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js](http://senecajs.org) plugin

# @seneca/solardemo-provider

[![npm version](https://img.shields.io/npm/v/@seneca/solardemo-provider.svg)](https://npmjs.com/package/@seneca/solardemo-provider)
[![build](https://github.com/senecajs/seneca-solardemo-provider/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca-solardemo-provider/actions/workflows/build.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/senecajs/seneca-solardemo-provider/badge.svg)](https://snyk.io/test/github/senecajs/seneca-solardemo-provider)

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

Provides access to the Solar System API using the Seneca provider convention. Solar System entities are represented as Seneca entities so that they can be accessed using the Seneca entity API and messages.

Requests are handled by the [Solar System SDK](https://github.com/voxgig-sdk/voxgig-solardemo-sdk), which is generated from the API's OpenAPI specification. This plugin is generated from the same specification by [@voxgig/sdkgen](https://github.com/voxgig/sdkgen) — do not edit it by hand, change the model and regenerate.

See [seneca-entity](https://github.com/senecajs/seneca-entity) and the [Seneca Data Entities Tutorial](https://senecajs.org/docs/tutorials/understanding-data-entities.html) for more details on the Seneca entity API.

## Install

```sh
npm install @seneca/solardemo-provider
```

This plugin expects the Seneca host framework to be present:

```sh
npm install seneca seneca-entity seneca-promisify @seneca/provider @seneca/env
```

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

## More Examples

See [test/](test/) for more usage examples.

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

If you're using this module and need help, you can:

- Post a [github issue](https://github.com/senecajs/seneca-solardemo-provider/issues)
- Tweet to [@senecajs](http://twitter.com/senecajs)
- Ask on the [Gitter](https://gitter.im/senecajs/seneca)

## API

### Options

| Option | Type | Description |
| --- | --- | --- |
| `sdk` | object | Passed straight to the `SolardemoSDK` constructor. Most usefully `base`, to point at a server. |
| `test` | boolean | Run the SDK in offline test mode (in-memory mock transport). |
| `testopts` | object | Seed and options for the mock, used only when `test` is true. |

### Action Patterns

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

## Contributing

The [Senecajs org](https://github.com/senecajs/) encourages open participation. If you feel you can help in any way, be it with documentation, examples, extra testing, or new features please get in touch.

## Background

Generated by [@voxgig/sdkgen](https://github.com/voxgig/sdkgen) from the
Solar System API definition, against the
[@voxgig-sdk/voxgig-solardemo](https://www.npmjs.com/package/@voxgig-sdk/voxgig-solardemo) SDK.
