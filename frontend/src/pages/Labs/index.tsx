import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, SlidersHorizontal, X } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { LabCard } from '@/components/labs/LabCard'
import { Badge } from '@/components/common/Badge'
import { Spinner } from '@/components/common/Spinner'
import { labsService } from '@/services/labsApi'
import type { Lab, LabCategory, LabFilters } from '@/types/lab.types'

const TECH_TABS = [
  { id: 'all', label: 'All Labs' },
  { id: 'linux', label: 'Linux' },
  { id: 'docker', label: 'Docker' },
  { id: 'git', label: 'Git' },
  { id: 'kubernetes', label: 'Kubernetes' }
]

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest' },
  { value: '-total_completions', label: 'Most Popular' },
  { value: '-avg_rating', label: 'Top Rated' },
  { value: 'duration_minutes', label: 'Shortest First' },
]

export default function LabsPage() {
  const [labs, setLabs] = useState<Lab[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<LabFilters>({ ordering: '-created_at' })
  const [search, setSearch] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    setLoading(true)
    const activeFilters = { ...filters }
    if (search) activeFilters.search = search
    labsService.list(activeFilters)
      .then(r => {
        const d = r.data.data || r.data
        setLabs(d.results || [])
        setTotalCount(d.count || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filters, search])

  const toggleFilter = (key: keyof LabFilters, value: any) => {
    setFilters(f => ({ ...f, [key]: f[key] === value ? undefined : value }))
  }

  const clearFilters = () => {
    setFilters({ ordering: filters.ordering })
    setActiveTab('all')
  }

  const hasActiveFilters = Object.entries(filters)
    .some(([k, v]) => k !== 'ordering' && v !== undefined) || activeTab !== 'all'

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setFilters(f => ({ ...f, category: tabId === 'all' ? undefined : tabId }))
  }

  return (
    <PageWrapper>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Lab Catalog</h1>
          <p className="text-gray-400">{totalCount} hands-on labs across Docker, Kubernetes, Linux & more</p>
        </div>

        {/* Search + controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search labs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filters.ordering || '-created_at'}
            onChange={e => setFilters(f => ({ ...f, ordering: e.target.value }))}
            className="input-field w-full sm:w-48"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Tech Tabs */}
        <div className="flex border-b border-dark-border overflow-x-auto scrollbar-hide">
          {TECH_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 items-center pt-2">

          {/* Difficulty */}
          {DIFFICULTIES.map(d => (
            <button key={d}
              onClick={() => toggleFilter('difficulty', d)}
              className={`badge-category text-xs transition-all capitalize ${
                filters.difficulty === d
                  ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                  : 'bg-dark-50 border-dark-border text-gray-400 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}

          {/* Free only */}
          <button
            onClick={() => toggleFilter('is_free', true)}
            className={`badge-category text-xs transition-all ${
              filters.is_free
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-dark-50 border-dark-border text-gray-400 hover:text-white'
            }`}
          >
            Free only
          </button>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 ml-2">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Lab grid */}
        {loading ? (
          <Spinner size="lg" fullscreen />
        ) : labs.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <FlaskIcon />
            <p className="mt-4 text-lg font-medium">No labs found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden" animate="show"
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          >
            {labs.map(lab => (
              <motion.div key={lab.id} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
                <LabCard lab={lab} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </PageWrapper>
  )
}

function FlaskIcon() {
  return (
    <svg className="mx-auto" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14.5 2H9.5L8 7H3l1 15h16l1-15h-5L14.5 2z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
