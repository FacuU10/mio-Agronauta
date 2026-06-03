import { create } from 'zustand'

interface AgronautasState {
  selectedFieldId: string | null
  lastCreatedFieldId: string | null
  intakeError: string | null
  setSelectedFieldId: (fieldId: string | null) => void
  setLastCreatedFieldId: (fieldId: string | null) => void
  setIntakeError: (message: string | null) => void
  reset: () => void
}

const initialState = {
  selectedFieldId: null,
  lastCreatedFieldId: null,
  intakeError: null,
}

export const useAgronautasStore = create<AgronautasState>()((set) => ({
  ...initialState,
  setSelectedFieldId: (selectedFieldId) => set({ selectedFieldId }),
  setLastCreatedFieldId: (lastCreatedFieldId) => set({ lastCreatedFieldId }),
  setIntakeError: (intakeError) => set({ intakeError }),
  reset: () => set(initialState),
}))
