import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (!email.trim()) {
      setErrorMessage('Ingresa tu correo electrónico.')
      return
    }

    if (!password) {
      setErrorMessage('Ingresa tu contraseña.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await signIn(email.trim(), password)

      if (error) {
        setErrorMessage(
          error.status === 400
            ? 'Correo o contraseña incorrectos.'
            : 'No fue posible iniciar sesión. Inténtalo nuevamente.',
        )
        return
      }

      navigate('/dashboard', { replace: true })
    } catch {
      setErrorMessage('No fue posible iniciar sesión. Inténtalo nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#f6f8fb] text-ink">
      <div className="pointer-events-none absolute -left-32 -top-36 h-96 w-96 rounded-full bg-[#e9e1fa]/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-24 h-[30rem] w-[30rem] rounded-full bg-[#ddeff9] blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col lg:flex-row">
        <section className="flex flex-1 flex-col justify-between px-6 pb-10 pt-8 sm:px-10 lg:min-h-screen lg:px-16 lg:pb-14 lg:pt-12 xl:px-24">
          <div>
            <img src="/brand/adonay-logo.jpeg" alt="Clínica Dental Adonay" className="w-56 rounded-xl" />
          </div>

          <div className="max-w-[540px] py-14 lg:py-0">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d8e2e8] bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#527083]">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
              Acceso privado
            </div>
            <h1 className="max-w-[500px] font-['Manrope'] text-[clamp(2.8rem,5vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.065em] text-ink">
              Decisiones más claras para crecer mejor.
            </h1>
            <p className="mt-7 max-w-[420px] text-base leading-7 text-[#5f7384] sm:text-lg">
              Una mirada precisa al rendimiento de marketing de la clínica Adonay.
            </p>
          </div>

          <div className="hidden items-center gap-2 text-sm text-[#80919e] lg:flex">
            <ShieldCheck className="h-4 w-4 text-cyan" strokeWidth={1.8} />
            Entorno seguro para el equipo Adonay
          </div>
        </section>

        <section className="flex w-full items-center justify-center px-6 pb-12 sm:px-10 lg:w-[48%] lg:px-12 lg:py-12 xl:w-[45%] xl:px-20">
          <div className="w-full max-w-[440px] rounded-[28px] border border-white/80 bg-white/85 p-7 shadow-card backdrop-blur-xl sm:p-10">
            <div className="mb-9">
              <p className="mb-3 text-sm font-semibold text-cyan">Adonay</p>
              <h2 className="font-['Manrope'] text-3xl font-extrabold tracking-[-0.05em] text-ink sm:text-[2.15rem]">
                Dashboard de Atribución
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#738594]">
                Ingresa tus credenciales para continuar.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#334b60]" htmlFor="email">
                  Correo electrónico
                </label>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9aaab5] transition-colors group-focus-within:text-cyan" strokeWidth={1.8} />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="nombre@adonay.cl"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-14 w-full rounded-2xl border border-[#dbe4ea] bg-[#fbfcfd] pl-12 pr-4 text-base text-ink outline-none transition placeholder:text-[#aab7c0] focus:border-cyan focus:bg-white focus:ring-4 focus:ring-cyan/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#334b60]" htmlFor="password">
                  Contraseña
                </label>
                <div className="group relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9aaab5] transition-colors group-focus-within:text-cyan" strokeWidth={1.8} />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-14 w-full rounded-2xl border border-[#dbe4ea] bg-[#fbfcfd] pl-12 pr-4 text-base tracking-[0.16em] text-ink outline-none transition placeholder:text-[#aab7c0] focus:border-cyan focus:bg-white focus:ring-4 focus:ring-cyan/10"
                  />
                </div>
              </div>

              {errorMessage && (
                <p className="rounded-xl border border-[#f0d5d2] bg-[#fff8f7] px-4 py-3 text-sm leading-5 text-[#a54842]" role="alert">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="group mt-3 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-ink px-5 text-base font-semibold text-white shadow-lg shadow-ink/15 transition hover:-translate-y-0.5 hover:bg-[#183b5c] focus:outline-none focus:ring-4 focus:ring-ink/15 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="h-[18px] w-[18px] animate-spin" strokeWidth={2} />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" strokeWidth={2} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2 border-t border-[#edf0f3] pt-6 text-xs text-[#8999a5]">
              <ShieldCheck className="h-4 w-4 text-cyan/80" strokeWidth={1.8} />
              Tus datos están protegidos
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default Login
