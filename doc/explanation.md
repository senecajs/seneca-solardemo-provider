# Explanation

This document discusses why `@seneca/solardemo-provider` is built the
way it is. It does not tell you how to do anything — for that see the
[tutorial](tutorial.md) and the [how-to guides](how-to.md).

## The provider convention

Seneca applications talk to the outside world through *providers*. A
provider is a plugin that makes a third-party API look like a Seneca
data source, so application code uses the entity API it already knows
instead of learning a client library per service.

The payoff is uniformity. An application reading from Solardemo, a
payment processor and a CRM uses one access pattern for all three:

```js
await seneca.entity('provider/solardemo/planet').list$()
await seneca.entity('provider/stripe/charge').list$()
```

Because these are ordinary Seneca entities, everything built on the
entity API — logging, tracing, message interception, test doubles —
applies to remote calls without any special support for HTTP.

## Two layers of the same idea

This provider is unusual among Seneca providers in that the thing it
wraps is *already* entity-shaped. The Voxgig SDK deliberately exposes
`Moon` and `Planet` with `list`/`load`/`create`/`update`/`remove`
rather than raw HTTP routes, for much the same reason Seneca does: a
small, uniform surface is easier for people and for agents to reason
about than a set of URL templates.

So the provider is mostly a translation between two entity models that
already agree on the important things. That makes it thin, and it is
worth keeping it thin — the SDK is generated from an OpenAPI spec and
will be regenerated as the API changes, so any cleverness added here is
cleverness that has to be maintained against a moving target.

Where the two models *disagree* is where this plugin has to do real
work, and each disagreement is discussed below.

## Where the SDK and Seneca disagree

### Entity instances versus plain data

The SDK's `list()` returns SDK entity instances; its `load()`,
`create()` and `update()` return plain objects. The instances carry
their own `entity$` property naming the SDK entity — `'Planet'`,
`'Moon'`.

Seneca also uses `entity$`, to name the *canon* of an entity. Passing
an SDK instance straight into Seneca's `entize` would therefore feed a
foreign `entity$` into Seneca's own marker, producing entities that
claim to belong to a canon that does not exist.

So the provider normalises everything to plain data — calling `.data()`
when the value has it — before handing anything to `entize`. This is a
small function guarding a subtle bug: the symptom would not be an
error, but entities that look right and behave wrongly.

### Missing things

`load$` for an id that does not exist resolves to `null`. Only a 404 is
translated this way; every other failure propagates.

"This thing does not exist" is an ordinary answer to a lookup, not a
failure of the lookup. It is usually a branch in the caller's logic,
and forcing every call site into a `try`/`catch` to express that branch
makes the common path noisy. A bad request or an unreachable server, by
contrast, means the question could not be asked, and should interrupt.

The SDK does not distinguish these — it throws for any non-2xx — so the
provider inspects `result.status` to decide. That coupling to the SDK's
error shape is a deliberate, narrow one, and it is why the shape is
documented in the [reference](reference.md#errors).

### Nesting

The API nests moons under planets: a moon's URL contains its planet.
Seneca's entity model is flat — a canon has no notion of a parent.

The gap is bridged by putting the parent id in the query, which is why
`planet_id` is required on every moon operation and why moon `load$`
takes an object rather than a bare id string. This is inherited from
the API's URL structure, not chosen.

The provider checks for `planet_id` itself and throws a named error
rather than letting the request go out. Without the check the SDK
builds a URL with a missing segment and the server answers 404 — which
is indistinguishable from "that moon does not exist", and which the
provider would then dutifully translate to `null`. A missing required
argument would silently look like an empty result. Failing early turns
a confusing wrong answer into an obvious mistake.

### Query directives

Seneca store queries can carry directives like `sort$` and `limit$`.
These are instructions to a *store*, and the API has no equivalent, so
the provider strips any key ending in `$` before the query becomes an
API match.

Passing them through would be worse than dropping them: the SDK would
forward them as match fields and the API would either ignore them or
error. Dropping them is also imperfect — a caller who writes
`list$({sort$: 'name'})` gets unsorted results and no complaint — but
it is the behaviour least likely to produce a wrong answer, and the
limitation is documented rather than hidden.

## Why writes are supported here

The read-only question is worth asking of every provider, and the
answer here is different from most.

Writes map cleanly onto entities only when the API's notion of "save"
is unambiguous. For a CMS with draft states, localised fields and a
separate publish step, `save$` would have to pick one interpretation
and would mislead whoever guessed differently. The Solardemo API has no
such ambiguity: a planet is a flat record, `POST` creates it and `PUT`
updates it. `save$` can mean exactly one thing.

So the full store surface — `list$`, `load$`, `save$`, `remove$` — is
implemented, using Seneca's convention that an entity without an id is
a create and one with an id is an update.

One wrinkle does not map cleanly: **the API assigns ids and ignores any
id sent on create.** Seneca's model allows a caller to choose an id.
The provider does not attempt to paper over this — it cannot make the
server honour an id — so it is documented prominently instead. Code
that predicts the id of a record it is about to create will be wrong,
and no amount of provider cleverness would fix that.

## Credentials for an API that has none

The Solardemo API is unauthenticated. The provider still asks
`@seneca/provider` for an `apikey`, and sends it as a bearer token when
one is configured.

This looks like ceremony, and for this API it is. It is worth keeping
because the shape of a Seneca application should not depend on whether
a particular service happens to need a key. An application that moves
from the demo API to an authenticated deployment changes one
configuration value rather than restructuring how the plugin loads.

The key is *optional* — absent, unconfigured or empty all mean "send no
header", and none of them is an error. A provider that demanded a key
for an API that has none would force every user to invent a fake one.

## Depending on a generated SDK

The SDK is an ordinary published dependency. This was not always true —
the plugin was first built against an unpublished SDK, using a `file:`
path that npm resolved to a symlink into a sibling checkout. That
arrangement is still the right one when changing both together, and is
documented as a [local development
option](how-to.md#develop-against-a-local-sdk-checkout), but it is no
longer the default.

The distinction that survives is between the SDK and its **test
server**. The SDK is published; the server is not, and ships only in
the SDK's source repository. So the offline tests need nothing but
`npm install`, while the live tests need a clone. That asymmetry is why
the live tests probe for the server and skip rather than fail — the
common case is a contributor who has the dependency but not the
repository.

One consequence of depending on generated code is worth stating.
The SDK is regenerated as the API model changes, so its surface can
shift in ways a hand-written library's would not. That argues for
keeping this plugin thin and for pinning behaviour in tests: the
offline suite exercises every entity operation against the SDK's own
mock, so a regeneration that changes a return shape shows up here as a
failing test rather than as a surprise in production.

## How the tests are arranged

The suite runs in two modes from one file, and neither requires
credentials.

The **offline** tests use the SDK's own mock transport, seeded with a
small solar system. This is better than the usual provider-testing
compromise: rather than checking only that the plugin loads and answers
`get:info`, they exercise every entity operation — list, load,
not-found, the nested-moon rules — with no server and no network.
Because the mock is the SDK's, it stays honest as the SDK changes.

The **live** tests point at the companion server in the SDK repository
and probe it first, skipping with a stated reason when it is not
running. So a contributor who has just cloned the repository gets a
meaningful result immediately, and gets more of one after starting the
server.

Skipping is preferred over silently returning early. An early `return`
reports a test as *passed*, making an unconfigured checkout look like
it verified the integration when it verified nothing. A skip is honest
about coverage, and the summary count shows how much did not run.

The live tests write to a real server, so each one removes what it
created in a `finally` block. A test that leaks a record changes the
result of the next run, which is how a suite becomes order-dependent
and then flaky.
