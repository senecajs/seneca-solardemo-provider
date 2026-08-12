/* Manual end-to-end script: read from a running Solardemo server.
 *
 * Start the companion test server from the SDK repo first:
 *   cd ~/Projects/voxgig-sdk/voxgig-solardemo-sdk/app && npm start
 *
 * Then:  node test/live.js
 */

const Seneca = require('seneca')

const BASE = process.env.SOLARDEMO_TEST_BASE || 'http://localhost:8901'

Seneca({ legacy: false })
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
  .use('../', { sdk: { base: BASE } })
  .ready(async function () {
    const seneca = this

    console.log(await seneca.post('sys:provider,provider:solardemo,get:info'))

    const planets = await seneca.entity('provider/solardemo/planet').list$()
    console.log('PLANETS', planets.length)
    console.log(planets.slice(0, 3))

    const earth = await seneca
      .entity('provider/solardemo/planet')
      .load$('earth')
    console.log('EARTH', earth)

    const moons = await seneca
      .entity('provider/solardemo/moon')
      .list$({ planet_id: 'earth' })
    console.log('EARTH MOONS', moons)
  })
