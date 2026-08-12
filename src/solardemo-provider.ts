/* Copyright © 2026 Seneca Project Contributors, MIT License. */

const Pkg = require('../package.json')

const { VoxgigSolardemoSDK } = require('@voxgig-sdk/voxgig-solardemo')

const SdkPkg = require('@voxgig-sdk/voxgig-solardemo/package.json')


type SolardemoProviderOptions = {
  // Options passed straight to the VoxgigSolardemoSDK constructor,
  // most usefully `base` to point at a server.
  sdk?: Record<string, any>

  // Run the SDK in offline test mode (in-memory mock transport).
  test?: boolean

  // Test feature options, e.g. {entity: {planet: {earth: {...}}}} to seed
  // the mock with data. Only used when `test` is true.
  testopts?: Record<string, any>
}


function SolardemoProvider(this: any, options: SolardemoProviderOptions) {
  const seneca: any = this

  const entityBuilder = this.export('provider/entityBuilder')

  seneca.message('sys:provider,provider:solardemo,get:info', get_info)

  async function get_info(this: any, _msg: any) {
    return {
      ok: true,
      name: 'solardemo',
      version: Pkg.version,
      sdk: {
        name: 'voxgig-solardemo',
        version: SdkPkg.version,
      },
    }
  }


  // The SDK returns entity instances from list(), carrying an `entity$`
  // marker of their own, but plain objects from load/create/update. Seneca's
  // entize inspects `entity$` to decide what it has been handed, so hand it
  // plain data either way rather than letting the SDK marker through.
  function plain(res: any) {
    return (null != res && 'function' === typeof res.data) ? res.data() : res
  }


  // Seneca query directives (sort$, limit$, ...) are for the store, not the
  // API, so they must not reach the SDK as match fields.
  function cleanq(q: any) {
    const out: any = {}
    for (const k in (q || {})) {
      if (!k.endsWith('$')) {
        out[k] = q[k]
      }
    }
    return out
  }


  // The SDK throws on any non-2xx. A 404 from a single-item read is an
  // ordinary "not found" answer rather than a failure, so return null and
  // let everything else propagate.
  async function ornull(action: () => Promise<any>) {
    try {
      return await action()
    }
    catch (e: any) {
      if (404 === e?.result?.status) {
        return null
      }
      throw e
    }
  }


  // Moon is nested under Planet in the API, so its path cannot be built
  // without a planet_id. Fail with a message that says so, rather than
  // letting the SDK report an opaque 404 on a half-built URL.
  function needPlanetId(value: any, cmd: string) {
    if (null == value || '' === value) {
      throw new Error(
        'seneca-solardemo-provider: moon ' + cmd + ': planet_id is required'
      )
    }
    return value
  }


  const entity: any = {
    planet: {
      cmd: {
        list: { action: (undefined as any) },
        load: { action: (undefined as any) },
        save: { action: (undefined as any) },
        remove: { action: (undefined as any) },
      },
    },

    moon: {
      cmd: {
        list: { action: (undefined as any) },
        load: { action: (undefined as any) },
        save: { action: (undefined as any) },
        remove: { action: (undefined as any) },
      },
    },
  }


  entity.planet.cmd.list.action =
    async function list_planet(this: any, entize: any, msg: any) {
      const q = cleanq(msg.q)
      const list = await this.shared.sdk.Planet().list(q)
      return list.map((data: any) => entize(plain(data)))
    }


  entity.planet.cmd.load.action =
    async function load_planet(this: any, entize: any, msg: any) {
      const q = cleanq(msg.q)
      const res = await ornull(() => this.shared.sdk.Planet().load({ id: q.id }))
      return null == res ? null : entize(plain(res))
    }


  entity.planet.cmd.save.action =
    async function save_planet(this: any, entize: any, msg: any) {
      const data = msg.ent.data$(false)
      const sdk = this.shared.sdk

      // Seneca's convention: an entity with an id is an update, without is
      // a create. Note the API assigns ids itself and ignores any sent.
      const res = null == data.id
        ? await sdk.Planet().create(data)
        : await sdk.Planet().update(data)

      return entize(plain(res))
    }


  entity.planet.cmd.remove.action =
    async function remove_planet(this: any, _entize: any, msg: any) {
      const q = cleanq(msg.q)
      await ornull(() => this.shared.sdk.Planet().remove({ id: q.id }))
      return null
    }


  entity.moon.cmd.list.action =
    async function list_moon(this: any, entize: any, msg: any) {
      const q = cleanq(msg.q)
      needPlanetId(q.planet_id, 'list')
      const list = await this.shared.sdk.Moon().list(q)
      return list.map((data: any) => entize(plain(data)))
    }


  entity.moon.cmd.load.action =
    async function load_moon(this: any, entize: any, msg: any) {
      const q = cleanq(msg.q)
      needPlanetId(q.planet_id, 'load')

      const res = await ornull(() => this.shared.sdk.Moon().load({
        planet_id: q.planet_id,
        id: q.id,
      }))

      return null == res ? null : entize(plain(res))
    }


  entity.moon.cmd.save.action =
    async function save_moon(this: any, entize: any, msg: any) {
      const data = msg.ent.data$(false)
      needPlanetId(data.planet_id, 'save')
      const sdk = this.shared.sdk

      const res = null == data.id
        ? await sdk.Moon().create(data)
        : await sdk.Moon().update(data)

      return entize(plain(res))
    }


  entity.moon.cmd.remove.action =
    async function remove_moon(this: any, _entize: any, msg: any) {
      const q = cleanq(msg.q)
      needPlanetId(q.planet_id, 'remove')

      await ornull(() => this.shared.sdk.Moon().remove({
        planet_id: q.planet_id,
        id: q.id,
      }))

      return null
    }


  entityBuilder(this, {
    provider: {
      name: 'solardemo',
    },
    entity
  })


  seneca.prepare(async function(this: any) {
    const sdkopts: any = Object.assign({}, options.sdk)

    // The Solardemo API is unauthenticated, but the provider convention
    // carries credentials, so honour an `apikey` when one is configured and
    // stay quiet when it is not.
    const res = await this.post('sys:provider,get:keymap,provider:solardemo')
    const apikey = res?.keymap?.apikey?.value

    if (null != apikey && '' !== apikey) {
      sdkopts.headers = Object.assign(
        { authorization: 'Bearer ' + apikey },
        sdkopts.headers
      )
    }

    this.shared.sdk = options.test
      ? VoxgigSolardemoSDK.test(options.testopts || {}, sdkopts)
      : new VoxgigSolardemoSDK(sdkopts)
  })


  return {
    exports: {
      sdk: () => this.shared.sdk,
    },
  }
}


// Default options.
const defaults: SolardemoProviderOptions = {
  sdk: {},
  test: false,
  testopts: {},
}

Object.assign(SolardemoProvider, { defaults })

export default SolardemoProvider

if ('undefined' !== typeof module) {
  module.exports = SolardemoProvider
}
