import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react'
import Plot from 'react-plotly.js'

/**
 * DataViewer.jsx
 * Ploty-based chart generator from dataframe. 
 * Allows users to plot xy traces selecting columns from a dataframe
 */

export default function DataViewer({ index = 1, ...otherProps }) {
    const plotRef = useRef(null)
    const containerRef = useRef(null)

    // State for trace colors
    const [colorA, setColorA] = useState('#007bff')
    const [colorB, setColorB] = useState('#28a745')
    const seedOffset = index * 0.15
    const data = useMemo(() => [
        {
            x: [1, 2, 3, 4, 5],
            y: [1, 3 + seedOffset, 2, 4 + seedOffset, 3],
            type: 'scatter',
            mode: 'lines+markers',
            name: `Series A ${index}`,
            line: { color: colorA },
            marker: { size: 8, color: colorA }
        },
        {
            x: [1, 2, 3, 4, 5],
            y: [2, 2, 3 + seedOffset, 3, 4 + seedOffset],
            type: 'scatter',
            mode: 'lines+markers',
            name: `Series B ${index}`,
            line: { color: colorB },
            marker: { size: 8, color: colorB }
        },
    ], [index, seedOffset, colorA, colorB])

    // Responsive layout configuration
    const layout = useMemo(() => ({
        title: {
            text: `Chart Instance #${index}`,
            font: { size: 16 }
        },
        autosize: true,
        margin: { l: 50, r: 50, t: 50, b: 50 },
        showlegend: true,
        legend: {
            x: 1,
            xanchor: 'right',
            y: 1
        },
        xaxis: {
            title: 'X Values',
            gridcolor: '#f0f0f0'
        },
        yaxis: {
            title: 'Y Values',
            gridcolor: '#f0f0f0'
        },
        plot_bgcolor: 'white',
        paper_bgcolor: 'white'
    }), [index])

    // Configuration for responsive behavior
    const config = useMemo(() => ({
        editable: true,
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d'],
        displaylogo: false,
        toImageButtonOptions: {
            format: 'png',
            filename: `chart-${index}`,
            height: 500,
            width: 700,
            scale: 1
        }
    }), [index])

    // Handle resize events for Golden Layout integration
    const handleResize = useCallback(() => {
        if (plotRef.current && plotRef.current.resizeHandler) {
            plotRef.current.resizeHandler()
        }
    }, [])

    // Set up resize observer for container changes
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const resizeObserver = new ResizeObserver(() => {
            // Debounce resize events
            setTimeout(handleResize, 100)
        })

        resizeObserver.observe(container)

        return () => {
            resizeObserver.disconnect()
        }
    }, [handleResize])

    const containerStyle = {
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fafafa'
    }

    const headerStyle = {
        padding: '12px 16px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e9ecef',
        fontSize: '14px',
        color: '#6c757d'
    }

    const plotContainerStyle = {
        flex: 1,
        padding: '8px',
        minHeight: 0, // Important for flex child to allow shrinking
        maxHeight: '60%' // Reserve space for trace selections below
    }

    const traceSelectorStyle = {
        height: '200px',
        padding: '12px',
        backgroundColor: 'white',
        borderTop: '1px solid #e9ecef',
        overflowY: 'auto'
    }

    return (
        <div ref={containerRef} style={containerStyle}>
            <div style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong>Plotly Chart #{index}</strong>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <label style={{ fontSize: '12px', color: '#6c757d' }}>
                            Series A:
                            <input
                                type="color"
                                value={colorA}
                                onChange={(e) => setColorA(e.target.value)}
                                style={{ marginLeft: '4px', width: '30px', height: '20px', border: 'none', cursor: 'pointer' }}
                            />
                        </label>
                        <label style={{ fontSize: '12px', color: '#6c757d' }}>
                            Series B:
                            <input
                                type="color"
                                value={colorB}
                                onChange={(e) => setColorB(e.target.value)}
                                style={{ marginLeft: '4px', width: '30px', height: '20px', border: 'none', cursor: 'pointer' }}
                            />
                        </label>
                    </div>
                </div>
                {Object.keys(otherProps).length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '12px' }}>
                        Props: {JSON.stringify(otherProps)}
                    </div>
                )}
            </div>
            <div style={plotContainerStyle}>
                <Plot
                    ref={plotRef}
                    data={data}
                    layout={layout}
                    config={config}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                />
            </div>
            <div style={traceSelectorStyle}>
                {/* Trace selections will go here */}
            </div>
        </div>
    )
}
