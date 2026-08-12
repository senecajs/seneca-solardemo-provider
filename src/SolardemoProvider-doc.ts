/* Copyright © 2026 Seneca Project Contributors, MIT License. */


const messages = {
  get_info: {
    desc: 'Get information about the Voxgig Solardemo SDK.',
  },
}


const sections = {
  intro: {
    path: '../provider/doc/intro.md'
  }
}

const docs = {
  sections,
  messages
}

export default docs


if ('undefined' !== typeof module) {
  module.exports = docs
}
