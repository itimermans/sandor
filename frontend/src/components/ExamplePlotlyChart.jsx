import React, { useMemo, useCallback, useEffect, useRef } from 'react'
import Plot from 'react-plotly.js'

/**
 * ExamplePlotlyChart.jsx
 * 
 * Self-contained Plotly chart component designed for Golden Layout integration.
 * Features:
 * - Instance-aware data generation based on index prop
 * - Responsive sizing with automatic resize handling
 * - Clean separation from Golden Layout logic
 * - Easy to test independently
 */

export default function ExamplePlotlyChart({ index = 1, ...otherProps }) {
    const plotRef = useRef(null)
    const containerRef = useRef(null)

    // Generate unique data for each chart instance
    const seedOffset = index * 0.15
    const data = useMemo(() => [
        {
            x: [1, 2, 3, 4, 5],
            y: [1, 3 + seedOffset, 2, 4 + seedOffset, 3],
            type: 'scatter',
            mode: 'lines+markers',
            name: `Series A ${index}`,
            line: { color: '#007bff' },
            marker: { size: 8 }
        },
        {
            x: [1, 2, 3, 4, 5],
            y: [2, 2, 3 + seedOffset, 3, 4 + seedOffset],
            type: 'scatter',
            mode: 'lines+markers',
            name: `Series B ${index}`,
            line: { color: '#28a745' },
            marker: { size: 8 }
        },
    ], [index, seedOffset])

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
        minHeight: 0 // Important for flex child to allow shrinking
    }

    return (
        <div ref={containerRef} style={containerStyle}>
            <div style={headerStyle}>
                <strong>Plotly Chart #{index}</strong>
                {Object.keys(otherProps).length > 0 && (
                    <span style={{ marginLeft: '16px', fontSize: '12px' }}>
                        Props: {JSON.stringify(otherProps)}
                    </span>
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
        </div>
    )
}
