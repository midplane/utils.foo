import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@utils-foo/pivot-engine': path.resolve(__dirname, 'packages/pivot-engine/src/index.ts'),
      '@utils-foo/pivot-react': path.resolve(__dirname, 'packages/pivot-react/src/index.ts'),
      '@ui': path.resolve(__dirname, 'src/components/ui'),
    },
  },
})
