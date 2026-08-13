# Tutorial: your first Solardemo query

This tutorial takes you from an empty folder to a script that
reads and writes Solar System data through
Seneca entities. It should take about fifteen minutes.

You will build one script and add to it as you go. Everything runs
locally against a test server you start yourself, so nothing here can
affect anything outside your machine.

You need [Node.js](https://nodejs.org) 24 or later.

You also need a server to talk to. The SDK itself installs from npm,
but its test server does not — it ships only in the SDK's source
repository, so clone that:

```sh
$ git clone https://github.com/voxgig-sdk/voxgig-solardemo-sdk.git
```

If you already have that checkout beside this plugin, it is at
`../../voxgig-sdk/voxgig-solardemo-sdk`, and you can skip the clone.

## Step 1: Start the test server

That server implements the Solar System API. Build and start it:

```sh
$ cd voxgig-solardemo-sdk/app
$ npm install
$ npm run build
$ npm start
```

It listens on `http://localhost:8901`. Check it from another terminal:

```sh
$ curl http://localhost:8901/api/planet
```

You should see a JSON array of planet records.
Leave the server running.

## Step 2: Create the project

In a new terminal:

```sh
$ mkdir solardemo-demo
$ cd solardemo-demo
$ npm init -y
$ npm install seneca seneca-entity seneca-promisify @seneca/provider @seneca/solardemo-provider
```

The first four are the Seneca host: the framework itself, the entity
API, the promise wrapper that makes calls awaitable, and the shared
machinery every Seneca provider is built on. The last is this plugin,
which brings the Solar System SDK with it.

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
  version: '0.1.3',
  sdk: { name: '@voxgig-sdk/voxgig-solardemo', version: '0.1.0' },
}
```

Two details of that configuration are worth a moment. The `apikey` is
declared even though nothing here asks for credentials — an empty
value simply means no `authorization` header is sent. Every Seneca
provider is configured the same way, so an application that later moves
to an authenticated service changes one value rather than its shape.
And `get:info` is answered by the plugin itself, without calling the
API, so a reply tells you the plugin loaded and initialised before any
request goes anywhere.

## Step 4: List the planet records

Replace the `console.log(info)` line with:

```js
  const planets = await seneca
    .entity('provider/solardemo/planet')
    .list$()

  console.log('Found ' + planets.length + ' planet record(s):')
  planets.forEach((r) => {
    console.log('  ' + r.id + '  ' + r.diameter + '  ' + r.kind)
  })
```

Run it again and you will see every planet
record the server holds.

No URL, no HTTP verb, no JSON parsing. You asked a Seneca entity for
a list, the provider turned that into an SDK call, and the SDK turned
it into a request. These are ordinary Seneca entities, so everything
you already know about the entity API applies to them.

## Step 5: Load one planet

Add:

```js
  const one = await seneca
    .entity('provider/solardemo/planet')
    .load$(planets[0].id)

  console.log('loaded', one.id, one.diameter)
```

`list$` gives you many, `load$` gives you one. Now ask for
something that is not there:

```js
  const missing = await seneca
    .entity('provider/solardemo/planet')
    .load$('nosuchplanet')

  console.log('missing =', missing)   // null
```

You get `null`, not an exception. "There is no such
planet" is an ordinary answer to a lookup, so it does not
interrupt your code.

## Step 6: Create, change and remove

Everything so far has been reading. This entity accepts writes too,
so add:

```js
  // Create: make$ builds an entity, save$ persists it.
  let planet = await seneca
    .entity('provider/solardemo/planet')
    .make$({ diameter: 1234, kind: 'tutorial-kind', name: 'tutorial-name' })
    .save$()

  console.log('created with id', planet.id)
```

Run it, and note the id printed. It is **not** one you chose — the
server assigns ids itself and ignores any you send. That is worth
knowing before you write code that assumes otherwise.

Now change it. An entity that already carries an id is an update
rather than a create, and `save$` decides between the two on exactly
that:

```js
  planet.diameter = 4321
  planet = await planet.save$()

  console.log('updated:', planet.diameter)
```

And remove it, leaving the server as you found it:

```js
  await seneca
    .entity('provider/solardemo/planet')
    .remove$(planet.id)
```

Load it once more and, as before, you get `null`:

```js
  console.log(
    'after remove:',
    await seneca
      .entity('provider/solardemo/planet')
      .load$(planet.id)
  )   // null
```

Those are the only methods there are:

`list$`, `load$`, `save$`, `remove$`

They behave the same way on every entity this plugin exposes.

## Step 7: Reach the moon records

Moon records live inside planet records, and the API route
says so:

`/api/planet/{planet_id}/moon`

The parent id in that path is not optional, so every moon
call needs a `planet_id` in its query:

```js
  const moons = await seneca
    .entity('provider/solardemo/moon')
    .list$({ planet_id: planets[0].id })

  console.log('found ' + moons.length + ' moon record(s)')
```

Leave the `planet_id` out and the call throws at once, naming the key it
needed, rather than letting a half-built URL come back as a puzzling
404:

```js
  // throws: @seneca/solardemo-provider: moon list: planet_id is required
  await seneca
    .entity('provider/solardemo/moon')
    .list$()
```

## What you have learned

You built a script that reads and writes
Solar System data through Seneca entities,
against a real server. Along
the way you saw:

- Provider configuration has the same shape even when no credentials
  are needed.
- API resources are Seneca entities under `provider/solardemo/`,
  reached with the entity API you already know.
- A resource nested under another in the API needs its parent's id in
  every query, and says which key is missing when you forget.
- `load$` answers `null` for something that is not there, rather
  than throwing.
- `save$` creates without an id and updates with one, and the
  server chooses the id.

## Where to go next

- To do a specific job — run without a server, reach the raw SDK,
  test your own code — see the [how-to guides](how-to.md).
- To look up an exact pattern, field or option, see the
  [reference](reference.md).
- To understand why the plugin is built this way — why entities rather
  than one message per route, and what it does with the SDK's answers
  — see the [explanation](explanation.md).
- For what each of these documents is for, see the
  [documentation index](README.md).
