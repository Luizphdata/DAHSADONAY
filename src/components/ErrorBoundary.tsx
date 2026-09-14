import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CircleAlert, RefreshCw } from 'lucide-react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[Adonay Dashboard] Error de renderización.', error, errorInfo)
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-6 py-10 text-ink">
        <section className="w-full max-w-xl rounded-[28px] border border-[#e4ebef] bg-white p-8 text-center shadow-card sm:p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fff3f1] text-[#b45c59]">
            <CircleAlert className="h-7 w-7" strokeWidth={1.8} />
          </div>
          <h1 className="mt-6 font-['Manrope'] text-2xl font-extrabold tracking-[-0.04em] text-ink sm:text-3xl">Algo salió mal.</h1>
          <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[#657b89]">No fue posible mostrar esta sección.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition hover:bg-[#183b5c] focus:outline-none focus:ring-4 focus:ring-ink/15"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            Recargar aplicación
          </button>
        </section>
      </main>
    )
  }
}

export default ErrorBoundary
