// main.jsx: application bootstrap for the React app.
// - Imports React and ReactDOM to render the root component.
// - Mounts `App` into the DOM element with id `root` created in `index.html`.
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const container = document.getElementById('root')
const root = createRoot(container)
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
