import React, { useEffect, useRef, useCallback, useState } from 'react'
import { GoldenLayoutManager } from '../../layout/golden/GoldenLayoutManager'
import { getRegisteredComponents } from './componentRegistry.jsx'

// LayoutRoot: framework-agnostic consumer using the layout manager abstraction
// Currently instantiates GoldenLayoutManager, but swapping is one import change away.

export default function LayoutRoot() {
    const hostRef = useRef(null)
    const managerRef = useRef(null)
    const counterRef = useRef(1)
    const [, force] = useState(0)

    const addPlot = useCallback(() => {
        const mgr = managerRef.current
        if (!mgr) return
        counterRef.current += 1
        const nextIndex = counterRef.current
        mgr.addToRoot({
            type: 'component',
            componentType: 'dataframe-viewer',
            title: `DataFrame Viewer #${nextIndex}`,
            componentState: { index: nextIndex }
        })
        force(n => n + 1)
    }, [])

    useEffect(() => {
        if (!hostRef.current) return
        if (managerRef.current) return

        const mgr = new GoldenLayoutManager()
        mgr.init(hostRef.current)

        // Register components from registry
        const registry = getRegisteredComponents()
        for (const [name, renderFn] of Object.entries(registry)) {
            mgr.registerComponent(name, renderFn)
        }

        // Load initial layout
        mgr.loadLayout({
            root: {
                type: 'row',
                content: [
                    { type: 'component', componentType: 'dataframe-viewer', title: 'DataFrame Viewer', componentState: { index: 1 } }
                ]
            }
        })
        // Force initial sizing after mount to avoid blank view if initial layout pass missed
        requestAnimationFrame(() => mgr.updateSize())
        setTimeout(() => mgr.updateSize(), 300)

        mgr.setAddComponentHandler(addPlot)

        const onResize = () => mgr.updateSize()
        window.addEventListener('resize', onResize)
        managerRef.current = mgr
        return () => {
            window.removeEventListener('resize', onResize)
            mgr.destroy()
            managerRef.current = null
        }
    }, [addPlot])

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <div style={{ position: 'absolute', top: 4, left: 8, zIndex: 10, display: 'flex', gap: 8 }}>
                <button onClick={addPlot} style={{ padding: '6px 12px', cursor: 'pointer' }}>+ New Plot</button>
            </div>
            <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
        </div>
    )
}
