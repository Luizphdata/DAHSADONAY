import { AlertTriangle, Terminal } from 'lucide-react'

type ConfigurationErrorScreenProps = {
  message: string
}

function ConfigurationErrorScreen({ message }: ConfigurationErrorScreenProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fb] px-6 py-10 text-ink">
      <section className="w-full max-w-xl rounded-[28px] border border-[#f0d8c9] bg-white p-8 shadow-card sm:p-10">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff3eb] text-[#c56e42]">
          <AlertTriangle className="h-7 w-7" strokeWidth={1.8} />
        </div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#c56e42]">
          Configuración de desarrollo
        </p>
        <h1 className="font-['Manrope'] text-2xl font-extrabold tracking-[-0.04em] text-ink sm:text-3xl">
          No se pudo iniciar Adonay Dashboard
        </h1>
        <p className="mt-4 text-base leading-7 text-[#5f7384]">{message}</p>
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#e7edf0] bg-[#fbfcfd] p-4 text-sm leading-6 text-[#607787]">
          <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-cyan" strokeWidth={1.8} />
          <span>
            Crea un archivo <code className="font-semibold text-ink">.env.local</code> en la raíz del proyecto y reinicia el servidor de desarrollo.
          </span>
        </div>
      </section>
    </main>
  )
}

export default ConfigurationErrorScreen
