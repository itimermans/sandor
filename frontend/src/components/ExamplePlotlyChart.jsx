import React from 'react'
import Plot from 'react-plotly.js'

// ExamplePlotlyChart.jsx
// Replaces the previous Golden Layout example with a simple Plotly chart.
// - Shows a static explanatory text
// - Renders a small Plotly line chart with two series

export default function ExamplePlotlyChart() {
    const data = [
        {
            x: [1, 2, 3, 4, 5],
            y: [1, 3, 2, 4, 3],
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Series A',
        },
        {
            x: [1, 2, 3, 4, 5],
            y: [2, 2, 3, 3, 4],
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Series B',
        },
    ]

    const layout = {
        width: 800,
        height: 400,
        title: 'Example Plotly Line Chart',
    }

    return (
        <div className="example-plotly-wrapper">
            <div style={{ padding: 12 }}>
                <h2>Example Content</h2>
                <p>
                    Interactive Plotly
                    chart demonstrating how you can embed visual components in the
                    frontend.
                </p>
            </div>
            <div style={{ padding: 12 }}>
                <Plot data={data} layout={layout} />
            </div>
        </div>
    )
}
