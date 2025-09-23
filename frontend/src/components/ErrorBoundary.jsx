import React from 'react'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
        this.setState({
            error: error,
            errorInfo: errorInfo
        })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '20px',
                    backgroundColor: '#ffebee',
                    border: '1px solid #f44336',
                    borderRadius: '4px',
                    color: '#c62828',
                    margin: '20px'
                }}>
                    <h2>Something went wrong.</h2>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        <summary>Error details (click to expand)</summary>
                        <strong>Error:</strong> {this.state.error && this.state.error.toString()}
                        <br />
                        <strong>Stack trace:</strong>
                        {this.state.errorInfo.componentStack}
                    </details>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary