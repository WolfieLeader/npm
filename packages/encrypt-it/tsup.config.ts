import { defineConfig, type Options } from 'tsup';

export default defineConfig((options: Options) => ({
  name: 'encrypt-it',
  entry: {
    index: 'src/exports/index.ts',
    node: 'src/exports/node.ts',
    'web-api': 'src/exports/web-api.ts',
  },
  outDir: 'dist',
  format: ['cjs', 'esm'],
  clean: true,
  dts: true,
  sourcemap: true,
  treeshake: true,
  splitting: true,
  minify: false,
  cjsInterop: true,
  tsconfig: 'tsconfig.json',
  skipNodeModulesBundle: true,
  ...options,
}));
