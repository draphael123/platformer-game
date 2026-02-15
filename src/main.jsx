import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import Game from './Game'

class ErrorBoundary extends React.Component {
  state = { hasError: false, err: null }
  static getDerivedStateFromError(err) { return { hasError: true, err } }
  componentDidCatch(err, info) { console.error('Game error:', err, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: "'JetBrains Mono', monospace", background: '#0f0c0a', color: '#e8e0d8', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontFamily: "'Bungee', Impact, sans-serif", color: '#d4a84b' }}>Something went wrong</h2>
          <p style={{ color: '#8a7a6a', maxWidth: 400 }}>{String(this.state.err?.message || this.state.err)}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '12px 24px', background: '#c44a3a', border: '2px solid #000', color: '#fff', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, boxShadow: '2px 2px 0 #000' }}>Reload</button>
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
