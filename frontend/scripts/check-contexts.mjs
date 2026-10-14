/**
 * Bundles scripts/check-contexts.tsx into a runnable file, then executes it.
 * Kept in-repo so `esbuild` (a Vite dependency) resolves from ./node_modules.
 *
 * Output is CommonJS on purpose: axios and friends are CJS and do a dynamic
 * require of node builtins, which esbuild cannot inline into an ESM bundle.
 *
 * Run: npm run check:contexts
 */
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const OUT_DIR = 'node_modules/.tmp';
const OUT_FILE = `${OUT_DIR}/check-contexts.cjs`;
mkdirSync(OUT_DIR, { recursive: true });

/**
 * The providers legitimately touch browser APIs (localStorage, document,
 * matchMedia). Stub the exact surface they use so the render exercises real
 * provider code rather than a mocked-out version of it.
 */
function installBrowserStubs() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };

  globalThis.document = {
    documentElement: {
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      style: {},
    },
    querySelector: () => null,
    addEventListener() {},
    removeEventListener() {},
  };

  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    location: { protocol: 'http:', host: 'localhost:5173', origin: 'http://localhost:5173' },
  };

  globalThis.navigator = { geolocation: undefined, onLine: true };
  globalThis.WebSocket = class {
    constructor() {
      this.readyState = 0;
    }
    close() {}
    send() {}
  };
}

installBrowserStubs();

await build({
  entryPoints: ['scripts/check-contexts.tsx'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  // Matches tsconfig's "jsx": "react-jsx" — the classic transform would emit
  // React.createElement calls and throw "React is not defined".
  jsx: 'automatic',
  outfile: OUT_FILE,
  loader: { '.css': 'empty' },
  logLevel: 'error',
  // Vite injects these at build time; plain Node has no import.meta.env.
  define: {
    'import.meta.env': JSON.stringify({
      VITE_API_URL: 'http://localhost:8000',
      VITE_WS_URL: 'ws://localhost:8000',
      VITE_GEOAPIFY_API_KEY: '',
    }),
  },
  external: ['react', 'react-dom', 'react-dom/server', 'react-router-dom'],
});

// Absolute path — require() would otherwise resolve relative to scripts/.
createRequire(import.meta.url)(resolve(process.cwd(), OUT_FILE));