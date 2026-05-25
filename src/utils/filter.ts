/**
 * Transaction Filtering Utilities
 * Provides optimized filtering functions for transactions
 */

import type { Transaction, Category } from '../App'

export interface FilterCriteria {
  searchText: string
  dateFrom: string
  dateTo: string
  amountMin: number | ''
  amountMax: number | ''
  selectedCategories: Category[]
}

/**
 * Count active filters (for badge display)
 */
export function countActiveFilters(criteria: FilterCriteria): number {
  let count = 0
  if (criteria.searchText) count++
  if (criteria.dateFrom) count++
  if (criteria.dateTo) count++
  if (criteria.amountMin !== '') count++
  if (criteria.amountMax !== '') count++
  if (criteria.selectedCategories.length > 0) count++
  return count
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(criteria: FilterCriteria): boolean {
  return countActiveFilters(criteria) > 0
}

/**
 * Filter transactions based on criteria
 * Optimized for performance with early returns
 */
export function filterTransactions(transactions: Transaction[], criteria: FilterCriteria): Transaction[] {
  return transactions.filter(tx => {
    // Text search - early exit if no match
    if (criteria.searchText) {
      const searchLower = criteria.searchText.toLowerCase()
      const matchesDescription = tx.description.toLowerCase().includes(searchLower)
      const matchesTags = tx.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ?? false
      if (!matchesDescription && !matchesTags) {
        return false
      }
    }

    // Date range filters
    if (criteria.dateFrom && tx.date < criteria.dateFrom) {
      return false
    }
    if (criteria.dateTo && tx.date > criteria.dateTo) {
      return false
    }

    // Amount range filters
    const amount = tx.amount
    if (criteria.amountMin !== '' && amount < Number(criteria.amountMin)) {
      return false
    }
    if (criteria.amountMax !== '' && amount > Number(criteria.amountMax)) {
      return false
    }

    // Category filter
    if (criteria.selectedCategories.length > 0) {
      if (!criteria.selectedCategories.includes(tx.category)) {
        return false
      }
    }

    return true
  })
}

/**
 * Format filter criteria for display
 */
export function formatFilterSummary(criteria: FilterCriteria): string[] {
  const summary: string[] = []

  if (criteria.searchText) {
    summary.push(`Search: "${criteria.searchText}"`)
  }
  if (criteria.dateFrom) {
    summary.push(`From: ${criteria.dateFrom}`)
  }
  if (criteria.dateTo) {
    summary.push(`To: ${criteria.dateTo}`)
  }
  if (criteria.amountMin !== '') {
    summary.push(`Min: Rp ${Number(criteria.amountMin).toLocaleString('id-ID')}`)
  }
  if (criteria.amountMax !== '') {
    summary.push(`Max: Rp ${Number(criteria.amountMax).toLocaleString('id-ID')}`)
  }
  if (criteria.selectedCategories.length > 0) {
    if (criteria.selectedCategories.length === 1) {
      summary.push(`Category: ${criteria.selectedCategories[0]}`)
    } else {
      summary.push(`Categories: ${criteria.selectedCategories.length} selected`)
    }
  }

  return summary
}

/**
 * Export filters to JSON for sharing
 */
export function exportFilters(criteria: FilterCriteria): string {
  return JSON.stringify(criteria, null, 2)
}

/**
 * Import filters from JSON
 */
export function importFilters(json: string): FilterCriteria | null {
  try {
    const parsed = JSON.parse(json)
    // Validate structure
    if (
      typeof parsed.searchText === 'string' &&
      typeof parsed.dateFrom === 'string' &&
      typeof parsed.dateTo === 'string' &&
      (typeof parsed.amountMin === 'number' || parsed.amountMin === '') &&
      (typeof parsed.amountMax === 'number' || parsed.amountMax === '') &&
      Array.isArray(parsed.selectedCategories)
    ) {
      return parsed as FilterCriteria
    }
    return null
  } catch {
    return null
  }
}
