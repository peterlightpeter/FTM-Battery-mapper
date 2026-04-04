import { create } from 'zustand'

interface UiState {
  selectedSiteId: string | null
  setSelectedSiteId: (id: string | null) => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedSiteId: null,
  setSelectedSiteId: (id) => set({ selectedSiteId: id }),
}))
