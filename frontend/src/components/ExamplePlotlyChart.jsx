import React, { useMemo } from 'react'
import Plot from 'react-plotly.js'

// ExamplePlotlyChart.jsx
// Replaces the previous Golden Layout example with a simple Plotly chart.
// - Shows a static explanatory text
// - Renders a small Plotly line chart with two series

export default function ExamplePlotlyChart({ index = 1 }) {
    const seedOffset = index * 0.15
    const data = useMemo(() => [
        {
            x: [1, 2, 3, 4, 5],
            y: [1, 3 + seedOffset, 2, 4 + seedOffset, 3],
            type: 'scatter',
            mode: 'lines+markers',
            name: `Series A ${index}`,
        },
        {
            x: [1, 2, 3, 4, 5],
            y: [2, 2, 3 + seedOffset, 3, 4 + seedOffset],
            type: 'scatter',
            mode: 'lines+markers',
            name: `Series B ${index}`,
        },
    ], [index, seedOffset])

    const layout = useMemo(() => ({
        autosize: true,
        title: `Plot Instance #${index}`,
    }), [index])

    return (
        <div className="example-plotly-wrapper">
            <div style={{ padding: 12 }} />
            <div style={{ padding: 12 }}>
                <Plot data={data} layout={layout} />
            </div>
        </div>
    )
}
