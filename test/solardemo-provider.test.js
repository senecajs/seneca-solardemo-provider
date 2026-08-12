/* Copyright © 2026 Seneca Project Contributors, MIT License. */
'use strict'

const { describe, it, before } = require('node:test')
const assert = require('node:assert')

const Seneca = require('seneca')
const SenecaMsgTest = require('seneca-msg-test')
const { Maintain } = require('@seneca/maintain')

const SolardemoProvider = require('../dist/solardemo-provider')
const SolardemoProviderDoc = require('../dist/SolardemoProvider-doc')

const BasicMessages = require('../dist-test/basic.messages')

// The live tests run against the companion test server in the SDK repo
// (`app/`), which serves this by default. Start it with:
//   cd ~/Projects/voxgig-sdk/voxgig-solardemo-sdk/app && npm start
const LIVE_BASE = process.env.SOLARDEMO_TEST_BASE || 'http://localhost:8901'

// Seed data for the SDK's offline mock transport, so the entity tests
// exercise real code paths without a server.
const SEED = {
  entity: {
    planet: {
      earth: { id: 'earth', name: 'Earth', kind: 'rock', diameter: 12756 },
      mars: { id: 'mars', name: 'Mars', kind: 'rock', diameter: 6792 },
    },
    moon: {
      luna: {
        id: 'luna',
        name: 'Luna',
        planet_id: 'earth',
        kind: 'rock',
        diameter: 3475,
      },
    },
  },
}

describe('solardemo-provider', () => {
  it('happy', async () => {
    assert.notEqual(SolardemoProvider, undefined)
    assert.notEqual(SolardemoProviderDoc, undefined)

    const seneca = await makeSeneca()

    assert.partialDeepStrictEqual(
      await seneca.post('sys:provider,provider:solardemo,get:info'),
      {
        ok: true,
        name: 'solardemo',
      },
    )
  })

  it('messages', async () => {
    const seneca = await makeSeneca()
    await SenecaMsgTest(seneca, BasicMessages)()
  })

  it('sdk-export', async () => {
    const seneca = await makeSeneca()
    const sdk = seneca.export('SolardemoProvider/sdk')()

    assert.equal(typeof sdk.Planet, 'function')
    assert.equal(typeof sdk.Moon, 'function')
  })

  describe('offline', () => {
    it('planet-list', async () => {
      const seneca = await makeSeneca()
      const list = await seneca.entity('provider/solardemo/planet').list$()

      assert.equal(list.length, 2)
      assert.deepEqual(
        list.map((p) => p.id).sort(),
        ['earth', 'mars'],
      )

      // Entities must come back as Seneca entities under this plugin's
      // canon. The SDK tags its own list results with entity$:'Planet',
      // which must not survive into the Seneca entity.
      const earth = list.find((p) => 'earth' === p.id)
      assert.equal(
        earth.canon$({ string: true }),
        'provider/solardemo/planet',
      )
      assert.equal(earth.name, 'Earth')
      assert.equal(earth.diameter, 12756)
    })

    it('planet-load', async () => {
      const seneca = await makeSeneca()
      const earth = await seneca
        .entity('provider/solardemo/planet')
        .load$('earth')

      assert.equal(earth.id, 'earth')
      assert.equal(earth.name, 'Earth')
      assert.equal(
        earth.canon$({ string: true }),
        'provider/solardemo/planet',
      )
    })

    it('planet-load-missing', async () => {
      const seneca = await makeSeneca()
      const missing = await seneca
        .entity('provider/solardemo/planet')
        .load$('nosuchplanet')

      assert.equal(missing, null)
    })

    it('moon-list', async () => {
      const seneca = await makeSeneca()
      const list = await seneca
        .entity('provider/solardemo/moon')
        .list$({ planet_id: 'earth' })

      assert.equal(list.length, 1)
      assert.equal(list[0].id, 'luna')
      assert.equal(list[0].planet_id, 'earth')
      assert.equal(
        list[0].canon$({ string: true }),
        'provider/solardemo/moon',
      )
    })

    it('moon-load', async () => {
      const seneca = await makeSeneca()
      const luna = await seneca
        .entity('provider/solardemo/moon')
        .load$({ planet_id: 'earth', id: 'luna' })

      assert.equal(luna.id, 'luna')
      assert.equal(luna.name, 'Luna')
      assert.equal(luna.diameter, 3475)
    })

    it('moon-load-missing', async () => {
      const seneca = await makeSeneca()
      const missing = await seneca
        .entity('provider/solardemo/moon')
        .load$({ planet_id: 'earth', id: 'nosuchmoon' })

      assert.equal(missing, null)
    })

    it('moon-needs-planet-id', async () => {
      const seneca = await makeSeneca()

      await assert.rejects(
        () => seneca.entity('provider/solardemo/moon').list$({ kind: 'rock' }),
        /planet_id is required/,
      )
    })
  })

  describe('live', () => {
    let live = false

    before(async () => {
      live = await serverUp(LIVE_BASE)
    })

    it('planet-list', async (t) => {
      if (!live) return t.skip(noServer())
      const seneca = await makeSeneca(liveOpts())

      const list = await seneca.entity('provider/solardemo/planet').list$()

      assert.ok(0 < list.length)
      assert.ok(list.some((p) => 'earth' === p.id))
      assert.equal(
        list[0].canon$({ string: true }),
        'provider/solardemo/planet',
      )
    })

    it('planet-load', async (t) => {
      if (!live) return t.skip(noServer())
      const seneca = await makeSeneca(liveOpts())

      const earth = await seneca
        .entity('provider/solardemo/planet')
        .load$('earth')

      assert.equal(earth.id, 'earth')
      assert.equal(earth.name, 'Earth')
    })

    it('planet-load-missing', async (t) => {
      if (!live) return t.skip(noServer())
      const seneca = await makeSeneca(liveOpts())

      assert.equal(
        await seneca.entity('provider/solardemo/planet').load$('nosuchplanet'),
        null,
      )
    })

    it('moon-list-and-load', async (t) => {
      if (!live) return t.skip(noServer())
      const seneca = await makeSeneca(liveOpts())

      const list = await seneca
        .entity('provider/solardemo/moon')
        .list$({ planet_id: 'earth' })

      assert.ok(0 < list.length)

      const moon = await seneca
        .entity('provider/solardemo/moon')
        .load$({ planet_id: 'earth', id: list[0].id })

      assert.equal(moon.id, list[0].id)
    })

    it('planet-crud', async (t) => {
      if (!live) return t.skip(noServer())
      const seneca = await makeSeneca(liveOpts())

      // Create. The API assigns the id and ignores any id sent, so the
      // saved entity comes back with a server-generated one.
      let planet = await seneca
        .entity('provider/solardemo/planet')
        .make$({ name: 'TestPlanet', kind: 'rock', diameter: 1234 })
        .save$()

      assert.ok(null != planet.id)
      assert.equal(planet.name, 'TestPlanet')

      const id = planet.id

      try {
        // Load it back.
        const loaded = await seneca
          .entity('provider/solardemo/planet')
          .load$(id)
        assert.equal(loaded.name, 'TestPlanet')

        // Update: an entity carrying an id is an update, not a create.
        loaded.name = 'TestPlanet2'
        const updated = await loaded.save$()
        assert.equal(updated.id, id)
        assert.equal(updated.name, 'TestPlanet2')

        const reloaded = await seneca
          .entity('provider/solardemo/planet')
          .load$(id)
        assert.equal(reloaded.name, 'TestPlanet2')
      }
      finally {
        // Always clean up: the server holds data in memory for the
        // process lifetime, so a leaked record affects later runs.
        await seneca.entity('provider/solardemo/planet').remove$(id)
      }

      assert.equal(
        await seneca.entity('provider/solardemo/planet').load$(id),
        null,
      )
    })

    it('moon-crud', async (t) => {
      if (!live) return t.skip(noServer())
      const seneca = await makeSeneca(liveOpts())

      let moon = await seneca
        .entity('provider/solardemo/moon')
        .make$({
          planet_id: 'earth',
          name: 'TestMoon',
          kind: 'rock',
          diameter: 99,
        })
        .save$()

      assert.ok(null != moon.id)
      assert.equal(moon.name, 'TestMoon')

      const id = moon.id

      try {
        const loaded = await seneca
          .entity('provider/solardemo/moon')
          .load$({ planet_id: 'earth', id })
        assert.equal(loaded.name, 'TestMoon')
      }
      finally {
        await seneca
          .entity('provider/solardemo/moon')
          .remove$({ planet_id: 'earth', id })
      }

      assert.equal(
        await seneca
          .entity('provider/solardemo/moon')
          .load$({ planet_id: 'earth', id }),
        null,
      )
    })
  })

  it('maintain', async () => {
    // Two checks report a repository fault that is not there, because of
    // where they are run rather than what they find. Both are excluded only
    // in the environment that breaks them, so each still runs everywhere
    // else.
    const exclude = []

    // `check_default` proves the default branch is main by looking for
    // `[branch "main"]` in .git/config. A pull_request build checks out the
    // merge ref, which records no such section. Still runs locally and on CI
    // builds of main.
    if ('pull_request' === process.env.GITHUB_EVENT_NAME) {
      exclude.push('check_default')
    }

    // `url_pkgjson` reads the repository url out of package.json, which
    // maintain locates by comparing `process.cwd() + '/package.json'` against
    // a path it found with Filehound (maintain.js:175). On Windows those are
    // the same file spelt with different separators, so the url is never
    // read and the check fails whatever package.json says.
    if ('win32' === process.platform) {
      exclude.push('url_pkgjson')
    }

    await Maintain({ exclude })
  })
})


function noServer() {
  return 'no solardemo server at ' + LIVE_BASE
}


function liveOpts() {
  return { sdk: { base: LIVE_BASE } }
}


// Probe the companion test server so live tests skip cleanly when it is
// not running, rather than failing the suite.
async function serverUp(base) {
  try {
    const res = await fetch(base + '/api/planet', {
      signal: AbortSignal.timeout(2000),
    })
    return res.ok
  }
  catch (e) {
    return false
  }
}


// Default to the SDK's offline mock transport, seeded with SEED.
async function makeSeneca(pluginopts) {
  pluginopts = pluginopts || { test: true, testopts: SEED }

  const seneca = Seneca({ legacy: false })
    .test()
    .use('promisify')
    .use('entity')
    .use('env', {
      // The Solardemo API needs no credentials; the key is declared so the
      // provider convention is exercised, and defaulted so the suite runs
      // with nothing configured.
      var: {
        $SOLARDEMO_APIKEY: '',
      },
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
    .use(SolardemoProvider, pluginopts)

  return seneca.ready()
}
