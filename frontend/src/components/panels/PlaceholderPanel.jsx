import React from 'react'

export default function PlaceholderPanel({ title = 'Placeholder', children }) {
    return (
        <div style={{ padding: 12 }}>
            <h3 style={{ margin: '8px 0' }}>{title}</h3>
            <div style={{ color: '#666' }}>
                {children || 'This is a placeholder panel.'}
            </div>
        </div>
    )
}
