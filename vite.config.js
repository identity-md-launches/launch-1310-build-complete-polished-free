export default {
  base: './',
  build: {
    target: 'es2022', assetsInlineLimit: 0, sourcemap: false, modulePreload: false,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } }
  },
  server: { host: '127.0.0.1' }
};
