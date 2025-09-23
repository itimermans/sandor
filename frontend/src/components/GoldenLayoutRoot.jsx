import React, { useEffect, useRef, useCallback, useState } from 'react'
import { GoldenLayout } from 'golden-layout'
import ExamplePlotlyChart from './ExamplePlotlyChart'
import 'golden-layout/dist/css/goldenlayout-base.css'
import 'golden-layout/dist/css/themes/goldenlayout-light-theme.css'

/*
  GoldenLayoutRoot.jsx
  - Initializes a GoldenLayout instance inside a React component.
  - Registers a Plotly chart component wrapping existing ExamplePlotlyChart.
*/

export default function GoldenLayoutRoot() {
    const containerRef = useRef(null)
    const layoutRef = useRef(null)
    const counterRef = useRef(1)
    const [, forceRender] = useState(0) // for optional re-render triggers

    useEffect(() => {
        if (!containerRef.current) return

        // Only initialize once
        if (layoutRef.current) return

        // Basic layout: single row with one plot component (more panes can be added later)
        const config = {
            root: {
                type: 'row',
                content: [
                    {
                        type: 'component',
                        componentType: 'plotly-example',
                        title: 'Plotly Chart #1',
                        componentState: { index: 1 }
                    }
                ]
            }
        }

        const layout = new GoldenLayout(containerRef.current)

        layout.registerComponentFactoryFunction('plotly-example', (container, state) => {
            // Create a mounting point element for React
            const el = document.createElement('div')
            el.style.height = '100%'
            el.style.width = '100%'
            container.element.append(el)
            // Render the React component inside
            // Using React 18 createRoot API dynamically
            import('react-dom/client').then(mod => {
                const root = mod.createRoot(el)
                const idx = state?.index ?? 1
                root.render(<ExamplePlotlyChart index={idx} />)
                container.on('destroy', () => {
                    try { root.unmount() } catch (e) { /* ignore */ }
                })
            })
        })

        layout.loadLayout(config)
        layoutRef.current = layout

        const handleResize = () => layout.updateSize()
        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
            try { layout.destroy() } catch (e) { /* ignore */ }
            layoutRef.current = null
        }
    }, [])

    const addPlot = useCallback(() => {
        if (!layoutRef.current) return
        counterRef.current += 1
        const nextIndex = counterRef.current
        const rootContent = layoutRef.current.rootItem
        // Add new component next to existing ones
        rootContent.addItem({
            type: 'component',
            componentType: 'plotly-example',
            title: `Plotly Chart #${nextIndex}`,
            componentState: { index: nextIndex }
        })
        forceRender(n => n + 1)
    }, [])

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', gap: 8 }}>
                <button onClick={addPlot} style={{ padding: '6px 12px', cursor: 'pointer' }}>
                    + New Plot
                </button>
            </div>
            <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
        </div>
    )
}
