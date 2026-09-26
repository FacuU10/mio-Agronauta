import { create } from 'zustand'
import type { AgronautasCanonicalLocation } from '@/lib/agronautas/schemas'

interface AgronautasState {
  selectedFieldId: string | null
  selectedLocation: AgronautasCanonicalLocation | null
  selectionError: string | null
  lastCreatedFieldId: string | null
  intakeError: string | null
  setSelectedFieldId: (fieldId: string | null) => void
  setSelectedLocation: (location: AgronautasCanonicalLocation | null) => void
  setSelectionError: (message: string | null) => void
  setLastCreatedFieldId: (fieldId: string | null) => void
  setIntakeError: (message: string | null) => void
  reset: () => void
}

const initialState = {
  selectedFieldId: null,
  selectedLocation: null,
  selectionError: null,
  lastCreatedFieldId: null,
  intakeError: null,
}

export const useAgronautasStore = create<AgronautasState>()((set) => ({
  ...initialState,
  setSelectedFieldId: (selectedFieldId) => set({ selectedFieldId }),
  setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
  setSelectionError: (selectionError) => set({ selectionError }),
  setLastCreatedFieldId: (lastCreatedFieldId) => set({ lastCreatedFieldId }),
  setIntakeError: (intakeError) => set({ intakeError }),
  reset: () => set(initialState),
}))
