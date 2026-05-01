import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { reactClickToComponent } from 'vite-plugin-react-click-to-component'

export default defineConfig({
  plugins: [react(), reactClickToComponent()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
