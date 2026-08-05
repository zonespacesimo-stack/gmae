import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            input: 'index.html'
        }
    },
    // Don't process non-module scripts, just copy them
    assetsInclude: [],
    publicDir: 'public'
});
