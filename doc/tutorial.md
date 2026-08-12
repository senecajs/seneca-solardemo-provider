# Tutorial: your first Solardemo query

This tutorial takes you from an empty folder to a script that reads and
writes solar system data through Seneca entities. It should take about
fifteen minutes.

You will build one script and add to it as you go. Everything runs
locally against a test server you start yourself, so nothing here can
affect anything outside your machine.

You need [Node.js](https://nodejs.org) 24 or later.

You also need a server to talk to. The SDK itself installs from npm,
but its test server does not — it ships only in the SDK's source
repository, so clone that:

```sh
$ git clone https://github.com/voxgig-sdk/voxgig-solardemo-sdk.git \
    ~/Projects/voxgig-sdk/voxgig-solardemo-sdk
```

## Step 1: Start the test server

The SDK repository ships a small server that implements the Solardemo
API. Build and start it:

```sh
$ cd ~/Projects/voxgig-sdk/voxgig-solardemo-sdk/app
$ npm install
$ npm run build
$ npm start
```

It listens on `http://localhost:8901`. Check it in another terminal:

```sh
$ curl http://localhost:8901/api/planet
```

You should see a JSON array of eight planets. Leave the server running.

## Step 2: Create the project

In a new terminal:

```sh
$ mkdir solardemo-demo
$ cd solardemo-demo
$ npm init -y
$ npm install seneca seneca-entity seneca-promisify @seneca/provider
```

The provider plugin itself is not published yet, so install it from
your local checkout:

```sh
$ npm install ~/Projects/seneca/seneca-solardemo-provider
```

## Step 3: Connect

Create `demo.js`:

```js
const Seneca = require('seneca')

async function main() {
  const seneca = await Seneca({ legacy: false })
    .use('promisify')
    .use('entity')
    .use('provider', {
      provider: {
        solardemo: {
          keys: {
            apikey: { value: '' },
          },
        },
      },
    })
    .use('@seneca/solardemo-provider', {
      sdk: { base: 'http://localhost:8901' },
    })
    .ready()

  const info = await seneca.post('sys:provider,provider:solardemo,get:info')
  console.log(info)
}

main()
```

Run it:

```sh
$ node demo.js
```

You should see:

```js
{
  ok: true,
  name: 'solardemo',
  version: '0.3.0',
  sdk: { name: 'voxgig-solardemo', version: '0.1.0' },
}
```

The API needs no credentials, but the `apikey` is declared anyway
because that is how every Seneca provider is configured — the empty
value simply means no `authorization` header is sent. Being consistent
here means an application that later moves to an authenticated service
changes one value, not its shape.

## Step 4: List the planets

Replace the `console.log(info)` line with:

```js
  const planets = await seneca.entity('provider/solardemo/planet').list$()

  console.log('Found ' + planets.length + ' planets:')
  planets.forEach((p) => {
    console.log('  ' + p.id + '  ' + p.name + '  ' + p.diameter + 'km')
  })
```

Run it again and you will see all eight planets.

No URL, no HTTP verb, no JSON parsing. You asked a Seneca entity for a
list and the provider turned that into an SDK call, which turned it
into an HTTP request. These are ordinary Seneca entities, so everything
you know about the entity API applies.

## Step 5: Load one planet

Add:

```js
  const earth = await seneca
    .entity('provider/solardemo/planet')
    .load$('earth')

  console.log('Earth is ' + earth.diameter + 'km across')
```

`list$` gives you many, `load$` gives you one. Try a planet that does
not exist:

```js
  const nope = await seneca
    .entity('provider/solardemo/planet')
    .load$('vulcan')

  console.log('vulcan =', nope)   // null
```

You get `null`, not an exception. "There is no such planet" is an
ordinary answer to a lookup, so it does not interrupt your code.

## Step 6: Reach the moons

Moons live inside planets, and the API reflects that: a moon's URL
contains its planet. So every moon operation needs a `planet_id`:

```js
  const moons = await seneca
    .entity('provider/solardemo/moon')
    .list$({ planet_id: 'earth' })

  console.log('Earth has ' + moons.length + ' moon(s):', moons.map((m) => m.name))
```

Leave out the `planet_id` and the provider tells you so directly,
rather than letting a half-built request fail confusingly:

```js
  // throws: solardemo-provider: moon list: planet_id is required
  await seneca.entity('provider/solardemo/moon').list$()
```

## Step 7: Create, change and remove

Everything so far has been reading. The provider supports the full set
of store commands, so you can write too. Add:

```js
  // Create: make$ builds an entity, save$ persists it.
  let pluto = await seneca
    .entity('provider/solardemo/planet')
    .make$({ name: 'Pluto', kind: 'rock', diameter: 2377 })
    .save$()

  console.log('created with id', pluto.id)
```

Run it, and note the id printed. It is **not** one you chose — the API
assigns ids itself and ignores any you send. That is worth knowing
before you write code that assumes otherwise.

Now change it. An entity that already has an id is an update:

```js
  pluto.diameter = 2400
  pluto = await pluto.save$()

  console.log('updated:', pluto.diameter)
```

And remove it, leaving the server as you found it:

```js
  await seneca.entity('provider/solardemo/planet').remove$(pluto.id)

  console.log(
    'after remove:',
    await seneca.entity('provider/solardemo/planet').load$(pluto.id)
  )   // null
```

The same four methods — `list$`, `load$`, `save$`, `remove$` — work on
moons, remembering that moons always need their `planet_id`.

## What you have learned

You built a script that reads and writes solar system data through
Seneca entities, against a real server. Along the way you saw:

- Provider configuration is uniform even when no credentials are needed.
- API resources are Seneca entities under `provider/solardemo/`.
- Nested resources need their parent id.
- `load$` answers `null` for things that do not exist.
- `save$` creates without an id and updates with one, and the server
  chooses ids.

## Where to go next

- To do a specific job — run without a server, reach the raw SDK, test
  your own code — see the [how-to guides](how-to.md).
- To look up an exact pattern, field or option, see the
  [reference](reference.md).
- To understand why the plugin is built this way, see the
  [explanation](explanation.md).
