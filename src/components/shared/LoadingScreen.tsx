import { Logo } from './Logo'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="animate-pulse">
        <Logo size={40} />
      </div>
    </div>
  )
}
