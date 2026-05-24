import { useState, useCallback } from 'react'

/**
 * Hook for managing month navigation state and operations
 * Returns utilities for navigating between months
 */
export function useMonthNavigation(initialMonth?: string) {
  // Default to current month if not specified
  const defaultMonth = initialMonth || new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)

  /**
   * Get the start of month date (YYYY-MM-DD format)
   */
  const getMonthStart = useCallback((month: string): string => {
    return `${month}-01`
  }, [])

  /**
   * Get the end of month date (YYYY-MM-DD format)
   */
  const getMonthEnd = useCallback((month: string): string => {
    const [year, monthStr] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthStr), 0) // Last day of previous month
    return date.toISOString().slice(0, 10)
  }, [])

  /**
   * Navigate to previous month
   */
  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth((current) => {
      const [year, month] = current.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, 1)
      return date.toISOString().slice(0, 7)
    })
  }, [])

  /**
   * Navigate to next month
   */
  const goToNextMonth = useCallback(() => {
    setSelectedMonth((current) => {
      const [year, month] = current.split('-')
      const date = new Date(parseInt(year), parseInt(month) + 1, 1)
      return date.toISOString().slice(0, 7)
    })
  }, [])

  /**
   * Navigate to current month
   */
  const goToCurrentMonth = useCallback(() => {
    setSelectedMonth(new Date().toISOString().slice(0, 7))
  }, [])

  /**
   * Get formatted month display (e.g., "January 2024")
   */
  const getMonthDisplay = useCallback((month: string): string => {
    const [year, monthStr] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthStr) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [])

  /**
   * Check if a date falls within the selected month
   */
  const isInSelectedMonth = useCallback((dateStr: string): boolean => {
    return dateStr.startsWith(selectedMonth)
  }, [selectedMonth])

  /**
   * Filter transactions to only those in the selected month
   */
  const filterBySelectedMonth = useCallback((transactions: any[]): any[] => {
    return transactions.filter(t => isInSelectedMonth(t.date))
  }, [isInSelectedMonth])

  return {
    selectedMonth,
    setSelectedMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    getMonthStart,
    getMonthEnd,
    getMonthDisplay,
    isInSelectedMonth,
    filterBySelectedMonth,
  }
}
