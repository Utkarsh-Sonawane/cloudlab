import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Lab, LabSession, LabCategory } from '@/types/lab.types'

interface LabState {
  categories: LabCategory[]
  labs: Lab[]
  selectedLab: Lab | null
  activeSession: LabSession | null
  isProvisioning: boolean
  isValidating: boolean
  totalCount: number
  currentPage: number
}

const initialState: LabState = {
  categories: [], labs: [], selectedLab: null, activeSession: null,
  isProvisioning: false, isValidating: false, totalCount: 0, currentPage: 1,
}

const labSlice = createSlice({
  name: 'lab',
  initialState,
  reducers: {
    setCategories: (s, a: PayloadAction<LabCategory[]>) => { s.categories = a.payload },
    setLabs: (s, a: PayloadAction<{ labs: Lab[]; total: number }>) => {
      s.labs = a.payload.labs; s.totalCount = a.payload.total
    },
    setSelectedLab: (s, a: PayloadAction<Lab | null>) => { s.selectedLab = a.payload },
    setActiveSession: (s, a: PayloadAction<LabSession | null>) => { s.activeSession = a.payload },
    updateSessionStatus: (s, a: PayloadAction<LabSession['status']>) => {
      if (s.activeSession) s.activeSession.status = a.payload
    },
    advanceTask: (s) => {
      if (s.activeSession) s.activeSession.current_task_index += 1
    },
    setProvisioning: (s, a: PayloadAction<boolean>) => { s.isProvisioning = a.payload },
    setValidating: (s, a: PayloadAction<boolean>) => { s.isValidating = a.payload },
    setPage: (s, a: PayloadAction<number>) => { s.currentPage = a.payload },
  },
})

export const {
  setCategories, setLabs, setSelectedLab, setActiveSession,
  updateSessionStatus, advanceTask, setProvisioning, setValidating, setPage
} = labSlice.actions
export default labSlice.reducer
