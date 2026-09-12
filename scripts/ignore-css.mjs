import {register} from 'node:module'
// Node-only markup tests; this does not emulate a browser or check visual layout.
register('./css-loader.mjs',import.meta.url)
