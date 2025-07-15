import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './public/manifest.json'

export default defineConfig({
  plugins: [crx({ manifest })],
  resolve: {
    alias: {
      path: 'path-browserify'
    }
  },
  build: {
    rollupOptions: {
      input: {
        content: 'src/content/app.js',
        background: 'src/background.js',
        popup: 'src/popup.html'
      },
      output: {
        entryFileNames: chunk => {
          if (chunk.name === 'content') return 'content.js';
          return '[name].js';
        }
      }
    }
  }
})
