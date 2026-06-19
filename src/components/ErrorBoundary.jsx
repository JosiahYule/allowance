import { Component } from 'react'

// Stops a render error from white-screening the whole app. Shows a calm recovery
// screen with a reload, and logs the error for debugging.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center max-w-md mx-auto">
          <p className="font-display font-light text-4xl text-ink mb-3 tracking-tight">Something broke</p>
          <p className="text-[15px] text-muted mb-8 leading-relaxed">
            The app hit an unexpected error. Your data is safe — reloading usually fixes it.
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary px-8 py-3.5 text-sm">
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
