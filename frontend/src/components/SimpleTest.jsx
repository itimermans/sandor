import React from 'react'
import ExamplePlotlyChart from './ExamplePlotlyChart'
import PlaceholderPanel from './panels/PlaceholderPanel'

/**
 * Simple test component to verify our components work independently
 */
export default function SimpleTest() {
    return (
        <div style={{ padding: '20px' }}>
            <h2>Component Test (No Golden Layout)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '400px' }}>
                <div style={{ border: '1px solid #ccc', borderRadius: '4px' }}>
                    <h3>Plotly Chart Test</h3>
                    <div style={{ height: '300px' }}>
                        <ExamplePlotlyChart index={1} />
                    </div>
                </div>
                <div style={{ border: '1px solid #ccc', borderRadius: '4px' }}>
                    <h3>Placeholder Panel Test</h3>
                    <div style={{ height: '300px' }}>
                        <PlaceholderPanel
                            title="Test Panel"
                            content="This is a test to verify the component works"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}