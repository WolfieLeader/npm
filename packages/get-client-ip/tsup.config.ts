import { defineConfig, type Options } from 'tsup';

export default defineConfig((options: Options) => ({
  name: 'get-client-ip',
  entry: ['src/index.ts'],
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
  external: ['express'],
  ...options,
}));
