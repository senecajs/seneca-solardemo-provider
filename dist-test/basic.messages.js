"use strict";
/* Copyright © 2026 Seneca Project Contributors, MIT License. */
Object.defineProperty(exports, "__esModule", { value: true });
/*  test/basic.messages.ts
 *  Basic message spec used by seneca-msg-test.
 *
 *  Compiled to dist-test/basic.messages.js via test/tsconfig.json.
 */
const Pkg = require('../package.json');
const messages = {
    print: false,
    pattern: 'sys:provider,provider:solardemo',
    allow: { missing: true },
    calls: [
        {
            pattern: 'get:info',
            out: {
                ok: true,
                name: 'solardemo',
                version: Pkg.version,
            },
        },
    ],
};
exports.default = messages;
if ('undefined' !== typeof module) {
    module.exports = messages;
}
//# sourceMappingURL=basic.messages.js.map