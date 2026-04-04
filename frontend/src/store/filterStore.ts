import { create } from 'zustand'
import type { FilterState, TechnicalWeights, CommercialWeights } from '../types'

const DEFAULT_TECH_WEIGHTS: TechnicalWeights = {
  area: 0.25,
  substation: 0.25,
  hosting: 0.20,
  flood: 0.15,
  wetland: 0.10,
  zoning: 0.05,
}

const DEFAULT_COMM_WEIGHTS: CommercialWeights = {
  ira: 0.30,
  miso: 0.20,
  ceja: 0.20,
  brownfield: 0.15,
  zoning: 0.10,
  enterprise: 0.05,
}

interface FilterStoreState extends FilterState {
  setHardFilter: (key: keyof FilterState['hardFilters'], value: boolean) => void
  setTechWeight: (key: keyof TechnicalWeights, value: number) => void
  setCommWeight: (key: keyof CommercialWeights, value: number) => void
  setTechCommBalance: (techWeight: number) => void
  setSortBy: (field: FilterState['sortBy']) => void
  setSortDir: (dir: 'asc' | 'desc') => void
  setPage: (page: number) => void
}

export const useFilterStore = create<FilterStoreState>((set) => ({
  hardFilters: {
    exclude_high_flood: true,
    min_developable_area: true,
    exclude_zoning_no: false,
    require_hosting_data: false,
    require_ira_adder: false,
    require_ej_community: false,
    require_brownfield: false,
  },
  techWeights: { ...DEFAULT_TECH_WEIGHTS },
  commWeights: { ...DEFAULT_COMM_WEIGHTS },
  techCommBalance: 0.5,
  sortBy: 'composite_score',
  sortDir: 'desc',
  page: 1,
  limit: 50,

  setHardFilter: (key, value) =>
    set((s) => ({ hardFilters: { ...s.hardFilters, [key]: value }, page: 1 })),
  setTechWeight: (key, value) =>
    set((s) => ({ techWeights: { ...s.techWeights, [key]: value } })),
  setCommWeight: (key, value) =>
    set((s) => ({ commWeights: { ...s.commWeights, [key]: value } })),
  setTechCommBalance: (techWeight) => set({ techCommBalance: techWeight }),
  setSortBy: (field) => set({ sortBy: field, page: 1 }),
  setSortDir: (dir) => set({ sortDir: dir, page: 1 }),
  setPage: (page) => set({ page }),
}))
