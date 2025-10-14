import React, { createContext, useContext, useMemo } from 'react'
import { setByPath } from './pathUtils'

const EditorContext = createContext(null)

export function usePlotEditor() {
    const ctx = useContext(EditorContext)
    if (!ctx) throw new Error('usePlotEditor must be used within <EditorProvider>')
    return ctx
}

/**
 * EditorProvider
 * Props:
 * - figure: { data: [], layout: {}, frames?: [], config?: {}, revision?: number }
 * - setFigure: (fn | newFigure) => void
 */
export function EditorProvider({ figure, setFigure, children }) {
    const api = useMemo(() => ({
        getFigure: () => figure,
        updateLayout: (updateOrPath, value) => {
            setFigure(prev => {
                let nextLayout
                if (typeof updateOrPath === 'string') {
                    nextLayout = setByPath(prev.layout || {}, updateOrPath, value)
                } else {
                    nextLayout = { ...(prev.layout || {}), ...(updateOrPath || {}) }
                }
                return { ...prev, layout: nextLayout, revision: (prev.revision || 0) + 1 }
            })
        },
        updateConfig: (updateOrPath, value) => {
            setFigure(prev => {
                let nextConfig
                if (typeof updateOrPath === 'string') {
                    nextConfig = setByPath(prev.config || {}, updateOrPath, value)
                } else {
                    nextConfig = { ...(prev.config || {}), ...(updateOrPath || {}) }
                }
                return { ...prev, config: nextConfig, revision: (prev.revision || 0) + 1 }
            })
        },
        updateTraces: (traceIndexes, update) => {
            setFigure(prev => {
                const nextData = (prev.data || []).map((t, i) => traceIndexes.includes(i) ? { ...t, ...update } : t)
                return { ...prev, data: nextData, revision: (prev.revision || 0) + 1 }
            })
        },
        replaceTrace: (index, nextTrace) => {
            setFigure(prev => {
                const data = prev.data ? prev.data.slice() : []
                data[index] = nextTrace
                return { ...prev, data, revision: (prev.revision || 0) + 1 }
            })
        },
        addTrace: (trace = { type: 'scattergl', mode: 'markers', name: `Trace ${((figure?.data?.length || 0) + 1)}` }) => {
            setFigure(prev => {
                const data = prev.data ? prev.data.slice() : []
                data.push(trace)
                return { ...prev, data, revision: (prev.revision || 0) + 1 }
            })
        },
        deleteTraces: (traceIndexes) => {
            setFigure(prev => {
                const toDelete = new Set(traceIndexes)
                const data = (prev.data || []).filter((_, i) => !toDelete.has(i))
                return { ...prev, data, revision: (prev.revision || 0) + 1 }
            })
        },
        // Frames helpers for animations
        setFrames: (nextFrames) => {
            setFigure(prev => ({ ...prev, frames: Array.isArray(nextFrames) ? nextFrames.slice() : [], revision: (prev.revision || 0) + 1 }))
        },
        addFrame: (frame) => {
            setFigure(prev => {
                const frames = prev.frames ? prev.frames.slice() : []
                frames.push(frame)
                return { ...prev, frames, revision: (prev.revision || 0) + 1 }
            })
        },
        replaceFrame: (index, nextFrame) => {
            setFigure(prev => {
                const frames = prev.frames ? prev.frames.slice() : []
                frames[index] = nextFrame
                return { ...prev, frames, revision: (prev.revision || 0) + 1 }
            })
        },
        deleteFrames: (indexes) => {
            setFigure(prev => {
                const toDelete = new Set(indexes)
                const frames = (prev.frames || []).filter((_, i) => !toDelete.has(i))
                return { ...prev, frames, revision: (prev.revision || 0) + 1 }
            })
        },
    }), [figure, setFigure])

    return (
        <EditorContext.Provider value={api}>
            {children}
        </EditorContext.Provider>
    )
}

export default EditorContext
