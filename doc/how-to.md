# How-to guides

Each guide here solves one problem. They assume you already have a
working Seneca instance with the plugin loaded — if you do not, work
through the [tutorial](tutorial.md) first.

- [Develop against a local SDK checkout](#develop-against-a-local-sdk-checkout)
- [Point the provider at a different server](#point-the-provider-at-a-different-server)
- [Run without a server, using the SDK mock](#run-without-a-server-using-the-sdk-mock)
- [Send an API key](#send-an-api-key)
- [Work with moons](#work-with-moons)
- [Create, update and remove records](#create-update-and-remove-records)
- [Call an endpoint the entity API does not cover](#call-an-endpoint-the-entity-api-does-not-cover)
- [Run the test suite](#run-the-test-suite)
- [Run the live tests against the test server](#run-the-live-tests-against-the-test-server)
- [Build and release the plugin](#build-and-release-the-plugin)

## Develop against a local SDK checkout

The SDK is a published dependency, so ordinary use needs nothing
special:

```sh
$ npm install
```

If you are changing the SDK and this plugin together, point npm at a
local checkout instead. Clone and build the SDK — it does not commit
its build output:

```sh
$ git clone https://github.com/voxgig-sdk/voxgig-solardemo-sdk.git \
    ~/Projects/voxgig-sdk/voxgig-solardemo-sdk
$ cd ~/Projects/voxgig-sdk/voxgig-solardemo-sdk/ts
$ npm install && npm run build
```

Then link it in, without committing the change to `package.json`:

```sh
$ cd ~/Projects/seneca/seneca-solardemo-provider
$ npm install --no-save ~/Projects/voxgig-sdk/voxgig-solardemo-sdk/ts
```

npm creates a symlink, so rebuilding the SDK is picked up here with no
reinstall:

```sh
$ ls -l node_modules/@voxgig-sdk/
# voxgig-solardemo -> ../../../../voxgig-sdk/voxgig-solardemo-sdk/ts
```

To go back to the published SDK:

```sh
$ rm -rf node_modules/@voxgig-sdk package-lock.json && npm install
```

Removing the lockfile matters. npm will happily keep resolving to the
link if the lockfile still records it and the local version satisfies
the range.

## Point the provider at a different server

Pass a `base` through the `sdk` option:

```js
.use('@seneca/solardemo-provider', {
  sdk: { base: 'https://solardemo.example.com' },
})
```

The SDK's own default is `http://localhost:8901`, which is where the
companion test server listens, so local development usually needs no
`base` at all.

## Run without a server, using the SDK mock

The SDK ships an in-memory mock transport. Turn it on with `test`, and
seed it with `testopts`:

```js
.use('@seneca/solardemo-provider', {
  test: true,
  testopts: {
    entity: {
      planet: {
        earth: { id: 'earth', name: 'Earth', kind: 'rock', diameter: 12756 },
        mars: { id: 'mars', name: 'Mars', kind: 'rock', diameter: 6792 },
      },
      moon: {
        luna: {
          id: 'luna', planet_id: 'earth',
          name: 'Luna', kind: 'rock', diameter: 3475,
        },
      },
    },
  },
})
```

Mock entities are keyed by id under their entity name. Every entity
operation then works offline, including not-found behaviour for ids you
did not seed. This is how this plugin's own tests run without a server,
and it is the recommended way to test application code that uses the
provider.

## Send an API key

The Solardemo API needs no credentials, so this is only relevant if you
point the provider at something that does. Configure an `apikey` key
and the plugin sends it as a bearer token:

```js
  .use('env', {
    var: { $SOLARDEMO_APIKEY: String },
  })
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

Every request then carries `authorization: Bearer <apikey>`. An absent
or empty key adds no header at all, which is why the demo API works
with no key configured.

For a different auth scheme, set the header yourself instead:

```js
.use('@seneca/solardemo-provider', {
  sdk: { headers: { 'x-api-key': process.env.SOLARDEMO_APIKEY } },
})
```

## Work with moons

Moons are nested under planets in the API, so `planet_id` is required
on every moon operation:

```js
const moons = await seneca
  .entity('provider/solardemo/moon')
  .list$({ planet_id: 'earth' })

const luna = await seneca
  .entity('provider/solardemo/moon')
  .load$({ planet_id: 'earth', id: 'luna' })
```

Note `load$` needs an object, not a bare id string — a moon is
identified by the pair. Omitting `planet_id` throws immediately:

```
solardemo-provider: moon load: planet_id is required
```

## Create, update and remove records

`save$` creates when the entity has no id and updates when it has one:

```js
// Create
let planet = await seneca
  .entity('provider/solardemo/planet')
  .make$({ name: 'Pluto', kind: 'rock', diameter: 2377 })
  .save$()

// Update
planet.diameter = 2400
planet = await planet.save$()

// Remove
await seneca.entity('provider/solardemo/planet').remove$(planet.id)
```

**The server assigns ids and ignores any id you send on create.** Do
not write code that predicts the id of a record it is about to create —
read it from the returned entity instead.

Partial updates work: send only the fields you want changed, along with
the id.

Moons follow the same pattern, with `planet_id` in the data:

```js
const moon = await seneca
  .entity('provider/solardemo/moon')
  .make$({ planet_id: 'earth', name: 'Nova', kind: 'rock', diameter: 10 })
  .save$()

await seneca
  .entity('provider/solardemo/moon')
  .remove$({ planet_id: 'earth', id: moon.id })
```

## Call an endpoint the entity API does not cover

Take the configured SDK client out of the plugin exports:

```js
const sdk = seneca.export('SolardemoProvider/sdk')()

// The SDK's own entity interface
const planets = await sdk.Planet().list()

// Or a raw request, for anything outside the entity model
const res = await sdk.direct({
  path: '/api/planet/{id}',
  method: 'GET',
  params: { id: 'earth' },
})
if (res instanceof Error) throw res
console.log(res.data)
```

`prepare()` builds the same request without sending it. The export is a
function — call it — and it is only available after `seneca.ready()`.

To turn raw SDK data into a Seneca entity:

```js
const ent = seneca.entity('provider/solardemo/planet').data$(res.data)
```

## Run the test suite

```sh
$ npm run build
$ npm test
```

The offline tests use the SDK mock and always run. The live tests
detect the test server and skip cleanly when it is absent:

```
﹣ planet-list # no solardemo server at http://localhost:8901
```

Coverage, and running a single test:

```sh
$ npm run test-coverage
$ TEST_PATTERN=planet-load npm run test-some
```

## Run the live tests against the test server

Start the companion server from the SDK repository:

```sh
$ cd ~/Projects/voxgig-sdk/voxgig-solardemo-sdk/app
$ npm install && npm run build && npm start
```

Then run the suite as usual — the six live tests activate automatically:

```sh
$ npm test
```

To target a server elsewhere:

```sh
$ SOLARDEMO_TEST_BASE=http://localhost:9000 npm test
```

The live tests create records and remove them in a `finally` block, so
a passing run leaves the server exactly as it found it. The server
holds its data in memory, so restarting it also resets it.

Two manual scripts are available for poking at a running server:

```sh
$ node test/live.js     # read planets and moons
$ node test/quick.js    # full CRUD cycle, cleans up after itself
```

## Build and release the plugin

```sh
$ npm run build      # tsc --build src test
$ npm run watch      # the same, in watch mode
$ npm run reset      # clean, install, build, test
```

`dist` and `dist-test` are committed; only `dist` is published.

Before publishing, check that `package.json` still depends on the
published SDK by version range and not on a local path — a `file:`
dependency left behind from local development cannot be resolved by
anyone installing from the registry.
