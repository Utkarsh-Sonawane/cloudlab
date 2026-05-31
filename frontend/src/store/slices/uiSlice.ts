import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  sidebarOpen: boolean
  theme: 'dark'
  activeModal: string | null
  globalLoading: boolean
  notifications: Notification[]
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message?: string
}

const initialState: UiState = {
  sidebarOpen: true,
  theme: 'dark',
  activeModal: null,
  globalLoading: false,
  notifications: [],
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (s) => { s.sidebarOpen = !s.sidebarOpen },
    setSidebarOpen: (s, a: PayloadAction<boolean>) => { s.sidebarOpen = a.payload },
    openModal: (s, a: PayloadAction<string>) => { s.activeModal = a.payload },
    closeModal: (s) => { s.activeModal = null },
    setGlobalLoading: (s, a: PayloadAction<boolean>) => { s.globalLoading = a.payload },
    addNotification: (s, a: PayloadAction<Omit<Notification, 'id'>>) => {
      s.notifications.push({ ...a.payload, id: Date.now().toString() })
    },
    removeNotification: (s, a: PayloadAction<string>) => {
      s.notifications = s.notifications.filter(n => n.id !== a.payload)
    },
  },
})

export const {
  toggleSidebar, setSidebarOpen, openModal, closeModal,
  setGlobalLoading, addNotification, removeNotification
} = uiSlice.actions
export default uiSlice.reducer
