# Documentation

The documentation for `@seneca/solardemo-provider` follows the
[Diátaxis](https://diataxis.fr) framework. Each document serves one
purpose, and that purpose determines what belongs in it. If you are
unsure where to look, use the table below.

| Document | Purpose | Read it when |
| -------- | ------- | ------------ |
| [Tutorial](tutorial.md) | Learning-oriented. A lesson that takes you from nothing to a working script. | You have never used this plugin and want to see it work. |
| [How-to guides](how-to.md) | Task-oriented. Recipes that solve one problem each. | You know what you want to do and need the steps. |
| [Reference](reference.md) | Information-oriented. A complete, factual description of the interface. | You need to look up a message pattern, entity field, or option. |
| [Explanation](explanation.md) | Understanding-oriented. The reasoning behind the design. | You want to know *why* it works this way, or you are debugging something surprising. |

## The distinction that matters most

The tutorial and the how-to guides look similar — both are sequences of
steps — but they are not interchangeable.

The **tutorial** is a lesson. It is safe to follow, it produces a
result you can see, and it does not ask you to make decisions. Its job
is to build your confidence, so it deliberately avoids alternatives and
edge cases.

A **how-to guide** assumes competence. It answers "how do I list every
item in a collection?" and it assumes you already have a working Seneca
instance. Its job is to get a task done, so it omits the explanation.

Likewise, **reference** describes the machinery and nothing else — it
never teaches. **Explanation** discusses and gives context — it never
instructs.

## Contributing to these documents

When adding documentation, decide which quadrant the material belongs
to before writing it. Material that teaches *and* explains *and*
enumerates ends up serving none of those purposes. If a section starts
drifting — a reference page that begins justifying a design choice —
move that text to the document that owns it and link across.
