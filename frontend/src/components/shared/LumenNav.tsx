import { useAuthStore } from '../../store/authStore'

export default function LumenNav({ onExportCsv }: { onExportCsv?: () => void }) {
  const { user, logout } = useAuthStore()

  return (
    <nav className="h-12 bg-lumen-graphite-black flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <img src="/logo-white.svg" alt="Lumen Energy" className="h-6" />
        <span className="text-white font-medium text-sm tracking-wide">FOM Screener</span>
      </div>
      <div className="flex items-center gap-3">
        {onExportCsv && (
          <button
            onClick={onExportCsv}
            className="text-xs text-lumen-concrete-200 hover:text-white transition-colors cursor-pointer"
          >
            Export CSV
          </button>
        )}
        {user && (
          <>
            <span className="text-xs text-lumen-concrete">{user.email}</span>
            <button
              onClick={logout}
              className="text-xs text-lumen-concrete-200 hover:text-white transition-colors cursor-pointer"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
