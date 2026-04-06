import { useRef, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useCustomSitesStore, processCSVUpload } from '../../store/customSitesStore'
import AddSiteModal from './AddSiteModal'

export default function LumenNav({ onExportCsv }: { onExportCsv?: () => void }) {
  const { user, logout } = useAuthStore()
  const customSites = useCustomSitesStore((s) => s.customSites)
  const isUploading = useCustomSitesStore((s) => s.isUploading)
  const uploadError = useCustomSitesStore((s) => s.uploadError)
  const clearCustomSites = useCustomSitesStore((s) => s.clearCustomSites)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processCSVUpload(file)
      // Reset input so the same file can be re-uploaded
      e.target.value = ''
    }
  }

  return (
    <nav className="h-12 bg-lumen-graphite-black flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <img src="/logo-white.svg" alt="Lumen Energy" className="h-6" />
        <span className="text-white font-medium text-sm tracking-wide">FTM Battery Site Selector</span>
      </div>
      <div className="flex items-center gap-3">
        {/* Add Single Site */}
        <button
          onClick={() => setShowAddModal(true)}
          className="text-xs text-lumen-concrete-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
        >
          <span className="text-base leading-none">+</span> Add Site
        </button>

        <span className="text-lumen-concrete-200/30">|</span>

        {/* CSV Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-xs text-lumen-concrete-200 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        >
          {isUploading ? 'Uploading...' : 'Upload CSV'}
        </button>

        {/* Clear Sites (only visible when custom sites exist) */}
        {customSites.length > 0 && (
          <button
            onClick={clearCustomSites}
            className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer"
          >
            Clear Sites ({customSites.length})
          </button>
        )}

        {/* Upload status message */}
        {uploadError && (
          <span className="text-xs text-yellow-400 max-w-[300px] truncate" title={uploadError}>
            {uploadError}
          </span>
        )}

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
      <AddSiteModal open={showAddModal} onClose={() => setShowAddModal(false)} />
    </nav>
  )
}
