import { ArrowLeft, FileQuestion } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function NotFound() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-6 py-10 text-ink">
      <section className="w-full max-w-xl rounded-[28px] border border-[#e4ebef] bg-white p-8 text-center shadow-card sm:p-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e5f5f7] text-cyan">
          <FileQuestion className="h-7 w-7" strokeWidth={1.8} />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-cyan">Adonay</p>
        <h1 className="mt-2 font-['Manrope'] text-2xl font-extrabold tracking-[-0.04em] text-ink sm:text-3xl">Página no encontrada</h1>
        <button
          type="button"
          onClick={() => navigate(user ? '/dashboard' : '/login', { replace: true })}
          className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-white transition hover:bg-[#183b5c] focus:outline-none focus:ring-4 focus:ring-ink/15"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Volver al dashboard
        </button>
      </section>
    </main>
  )
}

export default NotFound
