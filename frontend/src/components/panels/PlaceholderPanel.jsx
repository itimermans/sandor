import React, { useState } from 'react'

/**
 * PlaceholderPanel.jsx
 * 
 * A lightweight, flexible panel component for rapid prototyping and testing.
 * Perfect for:
 * - Testing Golden Layout behavior before building complex components
 * - Placeholder content during development
 * - Quick mockups and UI experiments
 * - Demonstrating panel communication patterns
 */

export default function PlaceholderPanel({
    title = 'Placeholder Panel',
    content = 'This is a placeholder panel for testing.',
    showControls = true,
    backgroundColor = '#f8f9fa',
    ...props
}) {
    const [counter, setCounter] = useState(0)
    const [notes, setNotes] = useState('')

    const panelStyle = {
        height: '100%',
        width: '100%',
        backgroundColor,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        overflow: 'auto'
    }

    const headerStyle = {
        borderBottom: '2px solid #e9ecef',
        paddingBottom: '12px',
        marginBottom: '16px'
    }

    const sectionStyle = {
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: 'white',
        borderRadius: '6px',
        border: '1px solid #e9ecef'
    }

    const buttonStyle = {
        padding: '8px 16px',
        margin: '4px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px'
    }

    const inputStyle = {
        width: '100%',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px',
        marginTop: '8px'
    }

    return (
        <div style={panelStyle}>
            <div style={headerStyle}>
                <h3 style={{ margin: 0, color: '#333' }}>{title}</h3>
                <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
                    {content}
                </p>
            </div>

            {showControls && (
                <>
                    <div style={sectionStyle}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Interactive Controls</h4>
                        <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
                            Counter: <strong>{counter}</strong>
                        </p>
                        <div>
                            <button
                                style={buttonStyle}
                                onClick={() => setCounter(c => c + 1)}
                            >
                                Increment
                            </button>
                            <button
                                style={{ ...buttonStyle, backgroundColor: '#6c757d' }}
                                onClick={() => setCounter(0)}
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div style={sectionStyle}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Notes Area</h4>
                        <textarea
                            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                            placeholder="Add some notes to test panel state..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </>
            )}

            <div style={sectionStyle}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>Panel Properties</h4>
                <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#666' }}>
                    <div>Background: {backgroundColor}</div>
                    <div>Show Controls: {showControls.toString()}</div>
                    <div>Additional Props: {JSON.stringify(props, null, 2)}</div>
                </div>
            </div>

            <div style={{
                marginTop: 'auto',
                padding: '12px',
                backgroundColor: '#e9ecef',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#6c757d'
            }}>
                💡 <strong>Tip:</strong> This placeholder panel is perfect for testing Golden Layout
                features like resizing, docking, and panel communication before building your actual components.
            </div>
        </div>
    )
}