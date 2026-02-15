import React from 'react'
import ReactDOM from 'react-dom/client'
import Game from './Game'

class ErrorBoundary extends React.Component {
  state = { hasError: false, err: null }
  static getDerivedStateFromError(err) { return { hasError: true, err } }
  componentDidCatch(err, info) { console.error('Game error:', err, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#1a1a2e', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ color: '#e74c3c' }}>Something went wrong</h2>
          <p style={{ color: '#aaa', maxWidth: 400 }}>{String(this.state.err?.message || this.state.err)}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '12px 24px', background: '#e74c3c', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontFamily: 'monospace' }}>Reload</button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Game />
    </ErrorBoundary>
  </React.StrictMode>,
)
