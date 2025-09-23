import React from 'react'
import ExamplePlotlyChart from './components/ExamplePlotlyChart'

// App.jsx: top-level React component.
// - Keeps communication with backend minimal for now.
// - Renders a header and the Plotly example component.
export default function App() {
    return (
        <div className="app-root">
            <header className="app-header">
                <h1>Sandor Frontend (Vite + React)</h1>
                <p>Example Plotly chart integration.</p>
            </header>
            <main className="app-main">
                <ExamplePlotlyChart />
            </main>
        </div>
    )
}
