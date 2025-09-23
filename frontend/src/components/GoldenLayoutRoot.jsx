import React, { useEffect, useRef, useCallback, useState } from 'react'
import { GoldenLayout } from 'golden-layout'
import {
    COMPONENT_TYPES,
    registerAllComponents,
    validateRegistry,
    createPanelConfig
} from './layout/componentRegistry'
// Temporarily commenting out CSS imports to debug
// import 'golden-layout/dist/css/goldenlayout-base.css'
// import 'golden-layout/dist/css/themes/goldenlayout-light-theme.css'

/**
 * GoldenLayoutRoot.jsx
 * 
 * Clean Golden Layout wrapper that delegates all component rendering to the registry system.
 * This component only handles:
 * - Layout initialization and lifecycle
 * - Window resize handling
 * - Toolbar for adding new panels
 * - Generic panel management
 * 
 * All specific component logic is handled by componentRegistry.js
 */

export default function GoldenLayoutRoot() {
    const containerRef = useRef(null)
    const layoutRef = useRef(null)
    const plotCounterRef = useRef(1)
    const placeholderCounterRef = useRef(1)
    const [, forceRender] = useState(0) // for optional re-render triggers

    // Debug: Add error boundary and logging
    const [error, setError] = useState(null)

    useEffect(() => {
        try {
            console.log('GoldenLayoutRoot: Starting initialization...')

            if (!containerRef.current) {
                console.log('GoldenLayoutRoot: Container ref not ready')
                return
            }

            // Only initialize once
            if (layoutRef.current) {
                console.log('GoldenLayoutRoot: Already initialized')
                return
            }

            // Validate registry before initialization
            console.log('GoldenLayoutRoot: Validating registry...')
            const missingFactories = validateRegistry()
            if (missingFactories.length > 0) {
                const errorMsg = 'Cannot initialize Golden Layout - missing component factories: ' + missingFactories.join(', ')
                console.error(errorMsg)
                setError(errorMsg)
                return
            }

            console.log('GoldenLayoutRoot: Creating layout config...')
            // Basic layout: single row with one plot component (more panes can be added later)
            const config = {
                root: {
                    type: 'row',
                    content: [
                        createPanelConfig(
                            COMPONENT_TYPES.PLOTLY_CHART,
                            'Plotly Chart #1',
                            { index: 1 }
                        )
                    ]
                }
            }

            console.log('GoldenLayoutRoot: Creating Golden Layout instance...')
            const layout = new GoldenLayout(containerRef.current)

            console.log('GoldenLayoutRoot: Registering components...')
            // Register all components from registry instead of inline definitions
            registerAllComponents(layout)

            console.log('GoldenLayoutRoot: Loading layout...')
            layout.loadLayout(config)
            layoutRef.current = layout

            console.log('GoldenLayoutRoot: Setting up resize handler...')
            const handleResize = () => layout.updateSize()
            window.addEventListener('resize', handleResize)

            console.log('GoldenLayoutRoot: Initialization complete!')

            return () => {
                console.log('GoldenLayoutRoot: Cleaning up...')
                window.removeEventListener('resize', handleResize)
                try { layout.destroy() } catch (e) { console.warn('Layout destroy error:', e) }
                layoutRef.current = null
            }
        } catch (err) {
            console.error('GoldenLayoutRoot: Initialization error:', err)
            setError(err.message)
        }
    }, [])

    // Show error state if something went wrong
    if (error) {
        return (
            <div style={{
                padding: '20px',
                backgroundColor: '#ffebee',
                border: '1px solid #f44336',
                borderRadius: '4px',
                color: '#c62828'
            }}>
                <h3>Golden Layout Error</h3>
                <p>{error}</p>
                <p>Check the browser console for more details.</p>
            </div>
        )
    }

    const addPlot = useCallback(() => {
        if (!layoutRef.current) return
        plotCounterRef.current += 1
        const nextIndex = plotCounterRef.current
        const rootContent = layoutRef.current.rootItem

        rootContent.addItem(createPanelConfig(
            COMPONENT_TYPES.PLOTLY_CHART,
            `Plotly Chart #${nextIndex}`,
            { index: nextIndex }
        ))

        forceRender(n => n + 1)
    }, [])

    const addPlaceholder = useCallback(() => {
        if (!layoutRef.current) return
        placeholderCounterRef.current += 1
        const nextIndex = placeholderCounterRef.current
        const rootContent = layoutRef.current.rootItem

        rootContent.addItem(createPanelConfig(
            COMPONENT_TYPES.PLACEHOLDER,
            `Test Panel #${nextIndex}`,
            {
                title: `Placeholder Panel #${nextIndex}`,
                content: `This is test panel number ${nextIndex}. You can use this to experiment with Golden Layout features.`,
                backgroundColor: nextIndex % 2 === 0 ? '#f0f8ff' : '#f8f9fa'
            }
        ))

        forceRender(n => n + 1)
    }, [])

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <div style={{
                position: 'absolute',
                top: 8,
                left: 8,
                zIndex: 10,
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={addPlot}
                    style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px'
                    }}
                >
                    + Plot
                </button>
                <button
                    onClick={addPlaceholder}
                    style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '13px'
                    }}
                >
                    + Placeholder
                </button>
            </div>
            <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
        </div>
    )
}
