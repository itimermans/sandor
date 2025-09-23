import React from 'react'
import GridLayoutRoot from './components/layout/GridLayoutRoot'

// Final implementation - React Grid Layout with component registry system
export default function App() {
    console.log('App component is rendering with React Grid Layout!')

    const handleLayoutChange = (layout, allLayouts) => {
        console.log('Layout changed:', { layout, allLayouts })
        // Here you could save layout to localStorage or send to backend
    }

    return (
        <div className="app-root">
            <header className="app-header">
                <h1>Sandor Frontend - Data Analysis Dashboard</h1>
                <p>React Grid Layout with clean component separation</p>
            </header>
            <main className="app-main">
                <GridLayoutRoot
                    onLayoutChange={handleLayoutChange}
                    style={{ minHeight: '70vh' }}
                />
            </main>
        </div>
    )
}
