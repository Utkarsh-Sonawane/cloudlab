import React from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import { clsx } from 'clsx'

interface Props {
  children: React.ReactNode
  fullWidth?: boolean
}

export function PageWrapper({ children, fullWidth = false }: Props) {
  const sidebarOpen = useSelector((s: RootState) => s.ui.sidebarOpen)

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      <Navbar />
      <div className="flex flex-1 pt-16">
        <Sidebar />
        <main className={clsx(
          'flex-1 min-w-0 transition-all duration-300',
          sidebarOpen ? 'lg:ml-60' : 'ml-0',
          !fullWidth && 'max-w-7xl mx-auto w-full'
        )}>
          <div className={clsx(!fullWidth && 'p-6')}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
