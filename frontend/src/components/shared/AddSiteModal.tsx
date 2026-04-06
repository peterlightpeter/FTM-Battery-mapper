import { useState } from 'react'
import { addSingleSite } from '../../store/customSitesStore'

interface Props {
  open: boolean
  onClose: () => void
}

export default function AddSiteModal({ open, onClose }: Props) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('IL')
  const [zip, setZip] = useState('')
  const [buildingType, setBuildingType] = useState('')
  const [utilityName, setUtilityName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.trim()) {
      setError('Address is required')
      return
    }

    setSubmitting(true)
    setError(null)

    const success = await addSingleSite({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
      buildingType: buildingType.trim(),
      utilityName: utilityName.trim(),
    })

    setSubmitting(false)

    if (success) {
      // Reset form and close
      setName('')
      setAddress('')
      setCity('')
      setState('IL')
      setZip('')
      setBuildingType('')
      setUtilityName('')
      onClose()
    } else {
      setError('Could not geocode this address. Please check and try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-lumen-graphite-black px-5 py-3 flex items-center justify-between">
          <h2 className="text-white text-sm font-medium">Add New Site</h2>
          <button onClick={onClose} className="text-lumen-concrete-200 hover:text-white text-lg leading-none cursor-pointer">
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-lumen-graphite-100 mb-1">Site Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Warehouse on Main St"
              className="w-full px-3 py-2 text-sm border border-lumen-concrete-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lumen-sky-blue focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-lumen-graphite-100 mb-1">
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main Street"
              required
              className="w-full px-3 py-2 text-sm border border-lumen-concrete-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lumen-sky-blue focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-6 gap-2">
            <div className="col-span-3">
              <label className="block text-xs font-medium text-lumen-graphite-100 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Chicago"
                className="w-full px-3 py-2 text-sm border border-lumen-concrete-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lumen-sky-blue focus:border-transparent"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-lumen-graphite-100 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="IL"
                maxLength={2}
                className="w-full px-3 py-2 text-sm border border-lumen-concrete-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lumen-sky-blue focus:border-transparent"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-lumen-graphite-100 mb-1">Zip</label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="60601"
                className="w-full px-3 py-2 text-sm border border-lumen-concrete-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lumen-sky-blue focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-lumen-graphite-100 mb-1">Building Type</label>
              <select
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-lumen-concrete-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lumen-sky-blue focus:border-transparent bg-white"
              >
                <option value="">Select...</option>
                <option value="Industrial/Warehouse">Industrial/Warehouse</option>
                <option value="Industrial/Manufacturing">Industrial/Manufacturing</option>
                <option value="Office">Office</option>
                <option value="Retail/Strip Mall">Retail/Strip Mall</option>
                <option value="Retail/Standalone">Retail/Standalone</option>
                <option value="Multi-Family">Multi-Family</option>
                <option value="Parking Lot">Parking Lot</option>
                <option value="Outpatient">Outpatient</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-lumen-graphite-100 mb-1">Utility</label>
              <select
                value={utilityName}
                onChange={(e) => setUtilityName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-lumen-concrete-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-lumen-sky-blue focus:border-transparent bg-white"
              >
                <option value="">Select...</option>
                <option value="Commonwealth Edison Co">ComEd</option>
                <option value="Ameren Illinois">Ameren Illinois</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-lumen-graphite-100 hover:text-lumen-black transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-lumen-graphite-black rounded-lg hover:bg-lumen-graphite-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              {submitting ? 'Locating...' : 'Add Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
