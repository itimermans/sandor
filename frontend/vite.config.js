import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration file.
// We use the React plugin to support JSX and fast refresh.
export default defineConfig({
    plugins: [react()],
})
