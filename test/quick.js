/* Manual script: exercise the full CRUD cycle against a running server.
 *
 * Start the companion test server from the SDK repo first:
 *   cd ../../voxgig-sdk/voxgig-solardemo-sdk/app && npm start
 *
 * Then:  node test/quick.js
 *
 * Creates and then removes a planet, so the server is left as found.
 */

const Seneca = require('seneca')

const BASE = process.env.SOLARDEMO_TEST_BASE || 'http://localhost:8901'

async function makeSeneca() {
  return Seneca({ legacy: false })
    .test()
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
    .use('..', { sdk: { base: BASE } })
    .ready()
}


run()

async function run() {
  const seneca = await makeSeneca()

  // Create: the API assigns the id, so none is supplied here.
  let planet = await seneca
    .entity('provider/solardemo/planet')
    .make$({ diameter: 12345, kind: 'quick-kind', name: 'quick-name' })
    .save$()
  console.log('CREATED', planet)

  const id = planet.id

  try {
    // Update: an entity carrying an id is an update.
    planet.diameter = 4321
    console.log('UPDATED', await planet.save$())

    console.log(
      'LOADED',
      await seneca.entity('provider/solardemo/planet').load$(id)
    )

    // moon records hang off planet records, so this one
    // goes under the planet just created — and comes back off again.
    const moon = await seneca
      .entity('provider/solardemo/moon')
      .make$({ planet_id: id, diameter: 12345, kind: 'quick-kind', name: 'quick-name' })
      .save$()
    console.log('MOON CREATED', moon)

    await seneca
      .entity('provider/solardemo/moon')
      .remove$({ planet_id: id, id: moon.id })
    console.log('MOON REMOVED')

  }
  finally {
    await seneca.entity('provider/solardemo/planet').remove$(id)
    console.log('REMOVED', id)
  }

  console.log(
    'AFTER REMOVE (expect null)',
    await seneca.entity('provider/solardemo/planet').load$(id)
  )
}
