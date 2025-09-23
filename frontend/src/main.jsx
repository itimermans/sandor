// main.jsx: application bootstrap for the React app.
// - Imports React and ReactDOM to render the root component.
// - Mounts `App` into the DOM element with id `root` created in `index.html`.
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

console.log('main.jsx: Starting application...')

const container = document.getElementById('root')
console.log('main.jsx: Container found:', container)

if (!container) {
    console.error('main.jsx: Could not find root element!')
} else {
    const root = createRoot(container)
    console.log('main.jsx: Root created, rendering App...')
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    )
    console.log('main.jsx: App rendered!')
}
