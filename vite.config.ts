import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './public/manifest.json'

export default defineConfig({
  define: {
    'crypto.hash': 'undefined',
  },
  plugins: [crx({ manifest })],
  resolve: {
    alias: {
      path: 'path-browserify'
    }
  },
  build: {
    rollupOptions: {
      input: {
        content: 'src/content.js',
        background: 'src/background.js',
        popup: 'src/popup.html'
      }
    }
  }
})
