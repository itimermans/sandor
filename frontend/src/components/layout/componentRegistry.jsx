import React from 'react'
import { createRoot } from 'react-dom/client'
import ExamplePlotlyChart from '../ExamplePlotlyChart'
import DataFrameViewer from '../panels/DataFrameViewer.jsx'

// Simple component registry so layout managers only deal with names and DOM nodes.
// Each value is a render function: (el: HTMLElement, state?: any) => (() => void) | void
const registry = {
    'plotly-example': (el, state) => {
        const root = createRoot(el)
        const idx = (state && state.index) || 1
        root.render(<ExamplePlotlyChart index={idx} />)
        return () => {
            try { root.unmount() } catch (_) { /* ignore */ }
        }
    },
    'dataframe-viewer': (el, state) => {
        const root = createRoot(el)
        root.render(<DataFrameViewer {...state} />)
        return () => {
            try { root.unmount() } catch (_) { /* ignore */ }
        }
    },
}

export function getRegisteredComponents() {
    return registry
}
