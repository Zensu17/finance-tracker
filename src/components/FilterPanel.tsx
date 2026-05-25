/**
 * Advanced Search & Filters Component
 * Provides comprehensive filtering for transactions with:
 * - Text search (description)
 * - Date range filtering
 * - Amount range filtering
 * - Category multi-select
 * - Save/load filter presets
 */

import { useState, useCallback } from 'react'
import { X, ChevronUp, ChevronDown, RotateCcw, Save, Trash2 } from 'lucide-react'
import type { Transaction, Category } from '../App'
import { countActiveFilters } from '../utils/filter'

interface FilterState {
  searchText: string
  dateFrom: string
  dateTo: string
  amountMin: number | ''
  amountMax: number | ''
  selectedCategories: Category[]
}

interface SavedFilter {
  id: string
  name: string
  filters: FilterState
  createdAt: number
}

interface FilterPanelProps {
  transactions: Transaction[]
  categories: Category[]
  onFilterChange: (filtered: Transaction[]) => void
}

const STORAGE_KEY = 'ft_saved_filters'

export function FilterPanel({ transactions, categories, onFilterChange }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    searchText: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    selectedCategories: [],
  })
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [filterName, setFilterName] = useState('')

  // Apply filters to transactions
  const applyFilters = useCallback((txList: Transaction[], filterState: FilterState) => {
    return txList.filter(tx => {
      // Text search
      if (filterState.searchText) {
        const searchLower = filterState.searchText.toLowerCase()
        const matchesDescription = tx.description.toLowerCase().includes(searchLower)
        const matchesTags = tx.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ?? false
        if (!matchesDescription && !matchesTags) {
          return false
        }
      }

      // Date range
      if (filterState.dateFrom && tx.date < filterState.dateFrom) return false
      if (filterState.dateTo && tx.date > filterState.dateTo) return false

      // Amount range
      if (filterState.amountMin !== '' && tx.amount < Number(filterState.amountMin)) return false
      if (filterState.amountMax !== '' && tx.amount > Number(filterState.amountMax)) return false

      // Category multi-select
      if (filterState.selectedCategories.length > 0) {
        if (!filterState.selectedCategories.includes(tx.category)) {
          return false
        }
      }

      return true
    })
  }, [])

  // Update filters and apply
  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    const filtered = applyFilters(transactions, updatedFilters)
    onFilterChange(filtered)
  }, [filters, transactions, applyFilters, onFilterChange])

  // Toggle category selection
  const toggleCategory = useCallback((category: Category) => {
    handleFilterChange({
      selectedCategories: filters.selectedCategories.includes(category)
        ? filters.selectedCategories.filter(c => c !== category)
        : [...filters.selectedCategories, category]
    })
  }, [filters.selectedCategories, handleFilterChange])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    const emptyFilters: FilterState = {
      searchText: '',
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
      selectedCategories: [],
    }
    setFilters(emptyFilters)
    const filtered = applyFilters(transactions, emptyFilters)
    onFilterChange(filtered)
  }, [transactions, applyFilters, onFilterChange])

  // Save current filter
  const handleSaveFilter = useCallback(() => {
    if (!filterName.trim()) return

    const newFilter: SavedFilter = {
      id: crypto.randomUUID(),
      name: filterName.trim(),
      filters,
      createdAt: Date.now(),
    }

    const updated = [newFilter, ...savedFilters]
    setSavedFilters(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setFilterName('')
    setShowSaveDialog(false)
  }, [filterName, filters, savedFilters])

  // Load saved filter
  const handleLoadFilter = useCallback((savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters)
    const filtered = applyFilters(transactions, savedFilter.filters)
    onFilterChange(filtered)
  }, [transactions, applyFilters, onFilterChange])

  // Delete saved filter
  const handleDeleteSavedFilter = useCallback((id: string) => {
    const updated = savedFilters.filter(f => f.id !== id)
    setSavedFilters(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }, [savedFilters])

  const isFiltered = Object.values(filters).some(v => {
    if (Array.isArray(v)) return v.length > 0
    return v !== '' && v !== null
  })

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 md:px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-stone-900">Filters</span>
            {isFiltered && (
              <span className="inline-flex items-center justify-center h-6 w-6 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                {countActiveFilters(filters)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFiltered && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleClearFilters()
              }}
              className="p-2 text-xs font-medium text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              title="Clear all filters"
            >
              <RotateCcw size={16} />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp size={20} className="text-stone-400" />
          ) : (
            <ChevronDown size={20} className="text-stone-400" />
          )}
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="border-t border-stone-100 px-4 md:px-6 py-5 space-y-5">
          {/* Search Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-2">Search Description</label>
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.searchText}
              onChange={(e) => handleFilterChange({ searchText: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50"
              />
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">Min Amount (Rp)</label>
              <input
                type="number"
                placeholder="0"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange({ amountMin: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-2">Max Amount (Rp)</label>
              <input
                type="number"
                placeholder="0"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange({ amountMax: e.target.value ? Number(e.target.value) : '' })}
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50"
              />
            </div>
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-3">Categories</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {categories.map((category) => (
                <label
                  key={category}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-stone-200 hover:border-stone-300 cursor-pointer transition-all"
                >
                  <input
                    type="checkbox"
                    checked={filters.selectedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-2 focus:ring-stone-900"
                  />
                  <span className="text-xs font-medium text-stone-700 truncate">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-stone-100">
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={!isFiltered}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={14} />
              Save Filter
            </button>
            {isFiltered && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
              >
                <X size={14} />
                Clear All
              </button>
            )}
          </div>

          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <div className="border-t border-stone-100 pt-4">
              <p className="text-xs font-semibold text-stone-700 mb-2">Saved Filters</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {savedFilters.map((saved) => (
                  <div
                    key={saved.id}
                    className="flex items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-100 hover:border-stone-200"
                  >
                    <button
                      onClick={() => handleLoadFilter(saved)}
                      className="flex-1 text-left text-xs font-medium text-stone-700 hover:text-stone-900 transition-colors truncate"
                    >
                      {saved.name}
                    </button>
                    <button
                      onClick={() => handleDeleteSavedFilter(saved.id)}
                      className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Delete saved filter"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Dialog */}
          {showSaveDialog && (
            <div className="border-t border-stone-100 pt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Filter name (e.g., 'Food Expenses')"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveFilter()}
                  autoFocus
                  className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50"
                />
                <button
                  onClick={handleSaveFilter}
                  disabled={!filterName.trim()}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false)
                    setFilterName('')
                  }}
                  className="px-3 py-2 text-xs font-medium rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
