import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '../ui'

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Application error boundary', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="shadow-panel max-w-md rounded-lg border bg-white p-6 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-600">
            The application could not display this page. No technical details have been exposed.
          </p>
          <Button className="mt-5" onClick={() => window.location.assign('/')}>
            Return home
          </Button>
        </div>
      </main>
    )
  }
}
