import React from 'react'
import GoldenLayoutRoot from './components/GoldenLayoutRoot'

// App.jsx: top-level React component.
// - Keeps communication with backend minimal for now.
// - Renders a header and the Plotly example component.
export default function App() {
    return (
        <div className="app-root">
            <header className="app-header">
                <h1>Sandor Frontend (Vite + React)</h1>
                <p>Golden Layout container with embedded Plotly chart.</p>
            </header>
            <main className="app-main">
                <div style={{ height: '70vh', minHeight: 400 }}>
                    <GoldenLayoutRoot />
                </div>
            </main>
        </div>
    )
}
