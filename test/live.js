/* Manual script: read from a running Solar System server.
 *
 * Start the companion test server from the SDK repo first:
 *   cd ../../voxgig-sdk/voxgig-solardemo-sdk/app && npm start
 *
 * Then:  node test/live.js
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

  const planets = await seneca
    .entity('provider/solardemo/planet')
    .list$()

  if (0 < planets.length) {
    console.log('MOON', await seneca
      .entity('provider/solardemo/moon')
      .list$({ planet_id: planets[0].id }))
  }

  console.log('PLANET', await seneca
    .entity('provider/solardemo/planet')
    .list$())

}
