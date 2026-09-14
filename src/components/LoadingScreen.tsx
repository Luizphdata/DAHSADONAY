import { LoaderCircle } from 'lucide-react'

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f8fb] text-ink">
      <div className="flex items-center gap-3 text-sm font-medium text-[#657b8b]">
        <LoaderCircle className="h-5 w-5 animate-spin text-cyan" strokeWidth={2} />
        Verificando tu sesión...
      </div>
    </main>
  )
}

export default LoadingScreen
