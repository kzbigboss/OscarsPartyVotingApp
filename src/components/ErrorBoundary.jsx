import { Component } from 'react'
import './ErrorBoundary.css'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1 className="error-boundary-title">Something went wrong</h1>
          <p className="error-boundary-message">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button className="error-boundary-button" onClick={this.handleRefresh}>
            Refresh Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
