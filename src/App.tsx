import { useState, useEffect, useMemo, useCallback, createContext, useContext, useRef } from 'react'
import { toast, Toaster } from 'sonner'
import {
  Plus, Trash2, Search, TrendingUp, TrendingDown, Wallet,
  ChevronDown, X, SlidersHorizontal, ShoppingCart, Car,
  Utensils, Home, Heart, Briefcase, Zap, Gift, MoreHorizontal,
  DollarSign, PiggyBank, CheckCircle2, Edit2, ChevronLeft, ChevronRight, Calendar, Copy,
  Download, RotateCcw, BarChart3, Layout, Loader, AlertCircle, Bell
} from 'lucide-react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, setDoc, onSnapshot, writeBatch } from 'firebase/firestore'
import { auth, db, signOutUser } from './firebase'
import LoginScreen from './components/LoginScreen'
import { useMonthNavigation } from './hooks/useMonthNavigation'
import { AnalyticsDashboard } from './components/AnalyticsDashboard'
import { NotificationSettings } from './components/NotificationSettings'
import { initializeMessaging } from './utils/notifications'

// ─── Types ───────────────────────────────────────────────────────────────────

type TransactionType = 'income' | 'expense'

type Category = string

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: Category
  date: string
  description: string
  tags?: string[]
  createdAt: number
  isRecurring?: boolean
}

export interface Budget {
  limit: number
  month: string // "YYYY-MM"
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  'Food & Dining', 'Housing', 'Transport', 'Healthcare',
  'Shopping', 'Utilities', 'Entertainment', 'Gift', 'Other'
]
const DEFAULT_INCOME_CATEGORIES: Category[] = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other']
const DEFAULT_CATEGORIES: Category[] = Array.from(new Set([...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES])) as Category[]

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Food & Dining': <Utensils size={14} />,
  'Housing': <Home size={14} />,
  'Transport': <Car size={14} />,
  'Healthcare': <Heart size={14} />,
  'Shopping': <ShoppingCart size={14} />,
  'Utilities': <Zap size={14} />,
  'Entertainment': <Gift size={14} />,
  'Salary': <Briefcase size={14} />,
  'Freelance': <DollarSign size={14} />,
  'Investment': <TrendingUp size={14} />,
  'Gift': <Gift size={14} />,
  'Other': <MoreHorizontal size={14} />,
}

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': 'bg-orange-100 text-orange-700',
  'Housing': 'bg-blue-100 text-blue-700',
  'Transport': 'bg-sky-100 text-sky-700',
  'Healthcare': 'bg-rose-100 text-rose-700',
  'Shopping': 'bg-purple-100 text-purple-700',
  'Utilities': 'bg-yellow-100 text-yellow-700',
  'Entertainment': 'bg-pink-100 text-pink-700',
  'Salary': 'bg-emerald-100 text-emerald-700',
  'Freelance': 'bg-teal-100 text-teal-700',
  'Investment': 'bg-cyan-100 text-cyan-700',
  'Gift': 'bg-violet-100 text-violet-700',
  'Other': 'bg-stone-100 text-stone-600',
}

const CATEGORY_BAR_COLORS: Record<string, string> = {
  'Food & Dining': 'bg-orange-400',
  'Housing': 'bg-blue-400',
  'Transport': 'bg-sky-400',
  'Healthcare': 'bg-rose-400',
  'Shopping': 'bg-purple-400',
  'Utilities': 'bg-yellow-400',
  'Entertainment': 'bg-pink-400',
  'Salary': 'bg-emerald-400',
  'Freelance': 'bg-teal-400',
  'Investment': 'bg-cyan-400',
  'Gift': 'bg-violet-400',
  'Other': 'bg-stone-400',
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  transactions: 'ft_transactions',
  budget: 'ft_budget',
  categories: 'ft_categories',
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number | undefined | null): string {
  // Validate amount
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0'
  }
  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR'
    }).format(amount)
  } catch (error) {
    console.error('Error formatting amount:', error)
    return '0'
  }
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

function normalizeTag(tag: string): string {
  const cleaned = tag.trim().replace(/\s+/g, '-').toLowerCase()
  if (!cleaned) return ''
  return cleaned.startsWith('#') ? cleaned : `#${cleaned}`
}

function parseTagsInput(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(',')
        .map(normalizeTag)
        .filter(Boolean)
    )
  )
}

// ─── Budget Alert System ───────────────────────────────────────────────────

interface BudgetStatus {
  percentage: number
  status: 'safe' | 'warning' | 'critical'
  message: string
  icon: 'check' | 'alert' | 'error'
}

function calculateBudgetStatus(totalSpent: number, monthlyBudget: number | null | undefined): BudgetStatus {
  if (!monthlyBudget || monthlyBudget <= 0) {
    return {
      percentage: 0,
      status: 'safe',
      message: 'No budget set',
      icon: 'check'
    }
  }

  const percentage = Math.min((totalSpent / monthlyBudget) * 100, 100)

  if (percentage >= 100) {
    return {
      percentage,
      status: 'critical',
      message: `Critical: You've exceeded your budget by ${fmt(totalSpent - monthlyBudget)}`,
      icon: 'error'
    }
  }

  if (percentage >= 75) {
    return {
      percentage,
      status: 'warning',
      message: `Warning: You've used ${percentage.toFixed(1)}% of your budget`,
      icon: 'alert'
    }
  }

  return {
    percentage,
    status: 'safe',
    message: `Safe: ${fmt(monthlyBudget - totalSpent)} remaining`,
    icon: 'check'
  }
}

// ─── Data Normalization (Migration for old data format) ─────────────────────

/**
 * Normalize transaction data from storage/Firestore
 * Handles old transaction format and ensures all required fields exist
 */
function normalizeTransaction(t: any): Transaction {
  // Validate basic structure
  if (!t || typeof t !== 'object') return null as any

  // If already normalized, return as-is
  if (typeof t.amount === 'number' && !isNaN(t.amount) && t.amount >= 0) {
    return {
      id: t.id,
      type: t.type,
      amount: t.amount,
      category: t.category,
      date: t.date,
      description: t.description,
      tags: t.tags ?? [],
      createdAt: t.createdAt,
      isRecurring: t.isRecurring ?? false,
    } as Transaction
  }

  // Migrate old transaction format (no-op since we're already normalized)
  const amount = t.amount ?? 0

  if (!isNaN(amount) && amount >= 0) {
    return {
      id: t.id,
      type: t.type,
      amount,
      category: t.category,
      date: t.date,
      description: t.description,
      tags: t.tags ?? [],
      createdAt: t.createdAt,
      isRecurring: t.isRecurring ?? false,
    } as Transaction
  }

  // Fallback: return empty transaction with defaults
  return {
    id: t.id ?? '',
    type: 'expense',
    amount: 0,
    category: t.category ?? 'Other',
    date: t.date ?? new Date().toISOString().split('T')[0],
    description: t.description ?? '',
    tags: t.tags ?? [],
    createdAt: t.createdAt ?? new Date().toISOString(),
    isRecurring: false,
  } as Transaction
}

/**
 * Normalize array of transactions with error handling
 */
function normalizeTransactions(transactions: any[]): Transaction[] {
  if (!Array.isArray(transactions)) return []
  
  return transactions
    .filter(t => t && typeof t === 'object')
    .map(t => {
      try {
        return normalizeTransaction(t)
      } catch (err) {
        console.error('Error normalizing transaction:', t, err)
        return null
      }
    })
    .filter((t): t is Transaction => t !== null)
}

/**
 * Validate and normalize budget data
 */
function normalizeBudget(budget: any): Budget {
  if (!budget || typeof budget !== 'object') {
    return { limit: 0, month: currentMonth() }
  }

  const limit = typeof budget.limit === 'number' && !isNaN(budget.limit) && budget.limit >= 0 
    ? budget.limit 
    : 0

  const month = typeof budget.month === 'string' && /^\d{4}-\d{2}$/.test(budget.month)
    ? budget.month
    : currentMonth()

  return { limit, month }
}

function getCategoryIcon(category: string): React.ReactNode {
  return CATEGORY_ICONS[category] ?? <MoreHorizontal size={14} />
}

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? 'bg-slate-100 text-slate-600'
}

function getCategoryBarColor(category: string): string {
  return CATEGORY_BAR_COLORS[category] ?? 'bg-stone-400'
}

interface CategoryContextValue {
  categories: Category[]
}

const CategoryContext = createContext<CategoryContextValue>({ categories: DEFAULT_CATEGORIES })

function useCategoryOptions(): Category[] {
  return useContext(CategoryContext).categories
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label, amount, icon, variant
}: {
  label: string
  amount: number
  icon: React.ReactNode
  variant: 'neutral' | 'income' | 'expense'
}) {
  const colors = {
    neutral: 'bg-slate-900 text-white shadow-sm',
    income: 'bg-white border border-slate-200 text-slate-900 shadow-sm',
    expense: 'bg-white border border-slate-200 text-slate-900 shadow-sm',
  }
  const amountColor = {
    neutral: 'text-white',
    income: 'text-emerald-600',
    expense: 'text-rose-500',
  }
  const iconBg = {
    neutral: 'bg-white/10',
    income: 'bg-emerald-50',
    expense: 'bg-rose-50',
  }
  const iconColor = {
    neutral: 'text-white',
    income: 'text-emerald-600',
    expense: 'text-rose-500',
  }

  return (
    <div className={`rounded-xl p-5 ${colors[variant]}`}>
      <div className="flex items-start justify-between mb-4">
        <span className={`text-sm font-medium ${variant === 'neutral' ? 'text-slate-300' : 'text-slate-500'}`}>
          {label}
        </span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg[variant]} ${iconColor[variant]}`}>
          {icon}
        </div>
      </div>
      <div className={`font-mono text-2xl font-medium tracking-tight ${amountColor[variant]}`}>
        {fmt(amount)}
      </div>
    </div>
  )
}

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${getCategoryColor(category)}`}>
      {getCategoryIcon(category)}
      {category}
    </span>
  )
}

function TagChip({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
      {tag}
    </span>
  )
}

// ─── Add Transaction Modal ─────────────────────────────────────────────────────

const EMPTY_FORM = {
  type: 'expense' as TransactionType,
  amount: '',
  category: 'Food & Dining' as Category,
  date: new Date().toISOString().slice(0, 10),
  description: '',
  tags: '',
  isRecurring: false,
}

function AddTransactionModal({
  onClose, onAdd
}: {
  onClose: () => void
  onAdd: (t: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void> | void
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const categories = useCategoryOptions()

  useEffect(() => {
    if (categories.length === 0) return
    if (!categories.includes(form.category)) {
      setForm(prev => ({ ...prev, category: categories[0] }))
    }
  }, [categories, form.category])

  function handleTypeChange(type: TransactionType) {
    const defaultCat = categories[0] ?? 'Other'
    setForm(f => ({ ...f, type, category: defaultCat }))
  }

  async function handleSubmit() {
    const amount = parseFloat(form.amount)
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount greater than 0.')
      return
    }
    if (!form.description.trim()) {
      setError('Description is required.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const transaction: Omit<Transaction, 'id' | 'createdAt'> = {
        type: form.type,
        amount,
        category: form.category,
        date: form.date,
        description: form.description.trim(),
        tags: parseTagsInput(form.tags),
        isRecurring: form.isRecurring || false,
      }

      await onAdd(transaction)
      setForm(EMPTY_FORM)
      setError('')
      onClose()
      toast.success('✓ Transaction saved!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save transaction'
      console.error('Save error:', err)
      setError(message)
      toast.error(`✗ ${message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] sm:max-h-auto overflow-y-auto sm:overflow-visible">
        {/* Error Alert - Sticky at top */}
        {error && (
          <div className="sticky top-0 z-50 bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-900">⚠️ Please complete all required fields</p>
              <p className="text-xs text-rose-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-rose-400 hover:text-rose-600 flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-stone-900 text-base md:text-lg">New Transaction</h2>
          <button onClick={onClose} className="w-10 h-10 md:w-8 md:h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors active:scale-95">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Type toggle */}
          <div className="flex rounded-xl bg-stone-100 p-1 gap-1">
            {(['expense', 'income'] as TransactionType[]).map(t => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`flex-1 py-3 md:py-2 text-base md:text-sm font-medium rounded-lg transition-all active:scale-95 ${
                  form.type === t
                    ? t === 'expense'
                      ? 'bg-white text-rose-600 shadow-sm'
                      : 'bg-white text-emerald-600 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Amount (IDR) */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Amount (IDR)</label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, amount: e.target.value }))}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base font-mono text-slate-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="#urgent, #work"
              value={form.tags}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, tags: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Category</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, category: e.target.value as Category }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Description</label>
            <input
              type="text"
              placeholder="What was this for?"
              value={form.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Recurring Checkbox */}
          <div className="flex items-center gap-3 px-3 py-3 bg-blue-50 rounded-xl border border-blue-100">
            <input
              type="checkbox"
              id="recurring"
              checked={form.isRecurring || false}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
              className="w-4 h-4 rounded cursor-pointer accent-blue-600"
            />
            <label htmlFor="recurring" className="flex-1 text-sm font-medium text-stone-700 cursor-pointer">
              Mark as Recurring
            </label>
            <span className="text-xs text-stone-500">Repeat monthly</span>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3 sticky bottom-0 bg-white border-t border-stone-100">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 md:py-2.5 text-base md:text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors active:scale-95 min-h-12 md:min-h-auto disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 py-3 md:py-2.5 text-base md:text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors active:scale-95 min-h-12 md:min-h-auto disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              'Add Transaction'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Transaction Modal ────────────────────────────────────────────────────

function EditTransactionModal({
  onClose, onSave, transaction
}: {
  onClose: () => void
  onSave: (t: Transaction) => Promise<void> | void
  transaction: Transaction
}) {
  const [form, setForm] = useState({
    type: transaction.type,
    amount: String(transaction.amount),
    category: transaction.category,
    date: transaction.date,
    description: transaction.description,
    tags: (transaction.tags ?? []).join(', '),
    isRecurring: transaction.isRecurring || false,
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const categories = useCategoryOptions()

  useEffect(() => {
    if (categories.length === 0) return
    if (!categories.includes(form.category)) {
      setForm(prev => ({ ...prev, category: categories[0] }))
    }
  }, [categories, form.category])

  function handleTypeChange(type: TransactionType) {
    const defaultCat = categories[0] ?? 'Other'
    setForm(f => ({ ...f, type, category: defaultCat }))
  }

  async function handleSubmit() {
    const amount = parseFloat(form.amount)
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount greater than 0.')
      return
    }
    if (!form.description.trim()) {
      setError('Description is required.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      await onSave({
        ...transaction,
        type: form.type,
        amount,
        category: form.category,
        date: form.date,
        description: form.description.trim(),
        tags: parseTagsInput(form.tags),
        isRecurring: form.isRecurring || false,
      })
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save transaction'
      console.error('Save error:', err)
      setError(message)
      toast.error(`✗ ${message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] sm:max-h-auto overflow-y-auto sm:overflow-visible">
        {/* Error Alert - Sticky at top */}
        {error && (
          <div className="sticky top-0 z-50 bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-900">⚠️ Please complete all required fields</p>
              <p className="text-xs text-rose-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-rose-400 hover:text-rose-600 flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-stone-900 text-base md:text-lg">Edit Transaction</h2>
          <button onClick={onClose} className="w-10 h-10 md:w-8 md:h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors active:scale-95">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Type toggle */}
          <div className="flex rounded-xl bg-stone-100 p-1 gap-1">
            {(['expense', 'income'] as TransactionType[]).map(t => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`flex-1 py-3 md:py-2 text-base md:text-sm font-medium rounded-lg transition-all active:scale-95 ${
                  form.type === t
                    ? t === 'expense'
                      ? 'bg-white text-rose-600 shadow-sm'
                      : 'bg-white text-emerald-600 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Amount (IDR) */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Amount (IDR)</label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, amount: e.target.value }))}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base font-mono text-slate-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="#urgent, #work"
              value={form.tags}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, tags: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Category</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, category: e.target.value as Category }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Description</label>
            <input
              type="text"
              placeholder="What was this for?"
              value={form.description}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Recurring Checkbox */}
          <div className="flex items-center gap-3 px-3 py-3 bg-blue-50 rounded-xl border border-blue-100">
            <input
              type="checkbox"
              id="recurring-edit"
              checked={form.isRecurring || false}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, isRecurring: e.target.checked }))}
              className="w-4 h-4 rounded cursor-pointer accent-blue-600"
            />
            <label htmlFor="recurring-edit" className="flex-1 text-sm font-medium text-stone-700 cursor-pointer">
              Mark as Recurring
            </label>
            <span className="text-xs text-stone-500">Repeat monthly</span>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3 sticky bottom-0 bg-white border-t border-stone-100">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 md:py-2.5 text-base md:text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors active:scale-95 min-h-12 md:min-h-auto disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 py-3 md:py-2.5 text-base md:text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors active:scale-95 min-h-12 md:min-h-auto disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              'Update Transaction'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Budget Panel ─────────────────────────────────────────────────────────────

function BudgetPanel({ budget, budgetLoading, monthlyExpenses, onUpdate }: {
  budget: Budget | null
  budgetLoading: boolean
  monthlyExpenses: number
  onUpdate: (limit: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(budget?.limit ? String(budget.limit) : '')
  const lastNotifiedThresholdRef = useRef<'safe' | 'warning' | 'critical' | null>(null)

  useEffect(() => {
    setInput(budget?.limit ? String(budget.limit) : '')
  }, [budget?.limit])

  const pct = budget && budget.limit > 0 ? Math.min((monthlyExpenses / budget.limit) * 100, 100) : 0
  const over = budget && budget.limit > 0 && monthlyExpenses > budget.limit
  const remaining = budget ? budget.limit - monthlyExpenses : 0

  // Calculate budget status
  const budgetStatus = calculateBudgetStatus(monthlyExpenses, budget?.limit)

  // Handle budget threshold notifications
  useEffect(() => {
    if (!budget || budget.limit <= 0) return

    const currentThreshold = budgetStatus.status

    // Only notify when crossing into a new threshold
    if (currentThreshold !== lastNotifiedThresholdRef.current) {
      if (currentThreshold === 'critical') {
        toast.error('🚨 Critical: You have exceeded your budget!')
      } else if (currentThreshold === 'warning') {
        toast.warning(`⚠️ ${budgetStatus.message}`)
      }
      lastNotifiedThresholdRef.current = currentThreshold
    }
  }, [budgetStatus.status, budget?.limit])

  function handleSave() {
    const val = parseFloat(input)
    if (!isNaN(val) && val > 0) {
      onUpdate(val)
      setEditing(false)
      return
    }
    setInput(budget?.limit ? String(budget.limit) : '')
  }

  // Show loading state while budget is being fetched
  if (budgetLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm w-full">
        <div className="flex items-center gap-3">
          <div className="animate-pulse flex-1">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  // Determine colors based on budget status
  const statusColors = {
    safe: {
      bar: 'bg-emerald-400',
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100'
    },
    warning: {
      bar: 'bg-amber-400',
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100'
    },
    critical: {
      bar: 'bg-rose-500',
      text: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100'
    }
  }

  const colors = statusColors[budgetStatus.status]

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm w-full">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <PiggyBank size={16} className="text-stone-400 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">Monthly Budget</span>
          <span className="text-xs text-slate-400 whitespace-nowrap">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
        <button
          onClick={() => { setEditing(e => !e); setInput(budget?.limit ? String(budget.limit) : '') }}
          className="text-xs text-slate-400 hover:text-slate-700 transition-colors font-medium whitespace-nowrap"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-base md:text-sm">Rp</span>
            <input
              type="number"
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onBlur={handleSave}
            className="w-full pl-7 pr-3 py-3 md:py-2 text-base md:text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              autoFocus
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-3 md:py-2 text-base md:text-sm font-medium text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors active:scale-95 whitespace-nowrap min-h-12 md:min-h-auto"
          >
            Save
          </button>
        </div>
      ) : null}

      {!budget || budget.limit === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">No budget set. Click Edit to add one.</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-2 gap-2">
          <span className="font-mono text-lg md:text-xl font-medium text-slate-900 truncate">{fmt(monthlyExpenses)}</span>
          <span className="text-xs md:text-sm text-slate-400 font-mono whitespace-nowrap">/ {fmt(budget.limit)}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          
          {/* Budget Status Alert */}
          <div className={`px-3 py-2 rounded-lg border ${colors.bg} ${colors.border} mb-3`}>
            <p className={`text-xs font-medium ${colors.text}`}>
              {budgetStatus.message}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
          <span className={`font-medium ${over ? 'text-rose-500' : 'text-slate-500'} truncate`}>
              {over ? `${fmt(Math.abs(remaining))} over budget` : `${fmt(remaining)} remaining`}
            </span>
            <span className={`font-mono font-medium whitespace-nowrap ${colors.text}`}>
              {pct.toFixed(1)}%
            </span>
          </div>

          {/* Status-specific recommendations */}
          {budgetStatus.status === 'safe' && pct < 70 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
              <CheckCircle2 size={12} className="flex-shrink-0" />
              <span className="truncate">On track for this month</span>
            </div>
          )}
          {budgetStatus.status === 'warning' && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
              <AlertCircle size={12} className="flex-shrink-0" />
              <span className="truncate">Review your spending before it gets critical</span>
            </div>
          )}
          {budgetStatus.status === 'critical' && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg border border-rose-100">
              <TrendingDown size={12} className="flex-shrink-0" />
              <span className="truncate">You must reduce expenses immediately</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ transactions }: { transactions: Transaction[] }) {
  const expenses = transactions.filter(t => t.type === 'expense')
  const total = expenses.reduce((s, t) => s + t.amount, 0)

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of expenses) {
      map[t.category] = (map[t.category] ?? 0) + t.amount
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7) as [string, number][]
  }, [transactions])

  if (byCategory.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal size={16} className="text-stone-400" />
          <span className="text-sm font-medium text-stone-700">Spending by Category</span>
        </div>
        <p className="text-sm text-stone-400 text-center py-4">No expense data yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-stone-400" />
          <span className="text-sm font-medium text-stone-700">Spending by Category</span>
        </div>
        <span className="text-xs text-stone-400 font-mono">{fmt(total)} total</span>
      </div>
      <div className="space-y-3">
        {byCategory.map(([cat, amount]) => {
          const pct = total > 0 ? (amount / total) * 100 : 0
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <CategoryBadge category={cat} />
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-400">{pct.toFixed(1)}%</span>
                  <span className="font-mono text-sm font-medium text-stone-800">{fmt(amount)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${getCategoryBarColor(cat)} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CategoryManagerModal({
  categories,
  onClose,
  onAdd,
  onRename,
  onDelete,
}: {
  categories: Category[]
  onClose: () => void
  onAdd: (name: string) => void
  onRename: (oldName: string, newName: string) => void
  onDelete: (name: string) => void
}) {
  const [newCategory, setNewCategory] = useState('')
  const [renameTarget, setRenameTarget] = useState<string>('')
  const [renameValue, setRenameValue] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900 text-base md:text-lg">Category Manager</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategory(e.target.value)}
              placeholder="New category name"
              className="flex-1 px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50"
            />
            <button
              onClick={() => {
                onAdd(newCategory)
                setNewCategory('')
              }}
              className="px-3 py-2.5 text-xs font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {categories.map(category => (
              <div key={category} className="flex items-center gap-2 p-2 rounded-lg border border-stone-100">
                <CategoryBadge category={category} />
                <div className="ml-auto flex items-center gap-2">
                  {renameTarget === category ? (
                    <>
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameValue(e.target.value)}
                        className="w-40 px-2 py-1.5 text-xs border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50"
                      />
                      <button
                        onClick={() => {
                          onRename(category, renameValue)
                          setRenameTarget('')
                          setRenameValue('')
                        }}
                        className="px-2 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setRenameTarget('')
                          setRenameValue('')
                        }}
                        className="px-2 py-1.5 text-xs font-medium rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setRenameTarget(category)
                          setRenameValue(category)
                        }}
                        className="px-2 py-1.5 text-xs font-medium rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => onDelete(category)}
                        className="px-2 py-1.5 text-xs font-medium rounded-md bg-rose-50 text-rose-700 hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({
  t,
  onDelete,
  onEdit,
  onDuplicate,
  onRepeat,
  selected,
  onToggleSelect,
}: {
  t: Transaction
  onDelete: (id: string) => void
  onEdit: (transaction: Transaction) => void
  onDuplicate: (transaction: Transaction) => void
  onRepeat?: (transaction: Transaction) => void
  selected: boolean
  onToggleSelect: (id: string) => void
}) {
  const [confirm, setConfirm] = useState(false)
  
  // Check if transaction is from a previous month (for Repeat button)
  const currentDate = new Date()
  const transactionDate = new Date(t.date)
  const isFromPreviousMonth = transactionDate.getFullYear() < currentDate.getFullYear() ||
    (transactionDate.getFullYear() === currentDate.getFullYear() && transactionDate.getMonth() < currentDate.getMonth())

  return (
    <div className="flex items-center gap-3 py-4 md:py-3 px-4 hover:bg-slate-50 rounded-xl transition-colors group active:bg-slate-50">
      <div className="flex-shrink-0">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(t.id)}
          className="w-4 h-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900 cursor-pointer"
          aria-label={`Select transaction ${t.description}`}
        />
      </div>
      <div className={`w-10 h-10 md:w-8 md:h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
        t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
      }`}>
        {getCategoryIcon(t.category)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm md:text-base font-medium text-slate-900 truncate">{t.description}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <CategoryBadge category={t.category} />
          {t.isRecurring && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
              Recurring
            </span>
          )}
          <span className="text-xs text-stone-400">{fmtDate(t.date)}</span>
          {(t.tags ?? []).map(tag => (
            <TagChip key={`${t.id}-${tag}`} tag={tag} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className={`font-mono text-sm md:text-base font-semibold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
          {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
        </span>
        {confirm ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(t.id)}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium px-2 py-2 md:py-1 rounded-lg hover:bg-rose-50 transition-colors active:scale-95 min-h-10 md:min-h-auto"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="text-xs text-stone-400 hover:text-stone-600 px-2 py-2 md:py-1 rounded-lg hover:bg-stone-100 transition-colors active:scale-95 min-h-10 md:min-h-auto"
            >
              No
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {isFromPreviousMonth && onRepeat && (
              <button
                onClick={() => onRepeat(t)}
                className="w-10 h-10 md:w-7 md:h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-violet-50 hover:text-violet-600 text-stone-300 transition-all active:scale-95"
                title="Repeat this month"
              >
                <RotateCcw size={18} className="md:w-3.5 md:h-3.5" />
              </button>
            )}
            <button
              onClick={() => onDuplicate(t)}
              className="w-10 h-10 md:w-7 md:h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-emerald-50 hover:text-emerald-600 text-stone-300 transition-all active:scale-95"
              title="Duplicate"
            >
              <Copy size={18} className="md:w-3.5 md:h-3.5" />
            </button>
            <button
              onClick={() => onEdit(t)}
              className="w-10 h-10 md:w-7 md:h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-blue-50 hover:text-blue-500 text-stone-300 transition-all active:scale-95"
              title="Edit"
            >
              <Edit2 size={18} className="md:w-3.5 md:h-3.5" />
            </button>
            <button
              onClick={() => setConfirm(true)}
              className="w-10 h-10 md:w-7 md:h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 text-stone-300 transition-all active:scale-95"
              title="Delete"
            >
              <Trash2 size={18} className="md:w-3.5 md:h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [budget, setBudget] = useState<Budget | null>(null)
  const [budgetLoading, setBudgetLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all')
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [user, setUser] = useState<User | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'dashboard' | 'analytics'>('dashboard')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkMode, setBulkMode] = useState<'recategorize' | 'date' | null>(null)
  const [bulkCategory, setBulkCategory] = useState<Category>(DEFAULT_CATEGORIES[0])
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().slice(0, 10))
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  // Month Navigation
  const monthNav = useMonthNavigation()
  const isCurrentMonth = monthNav.selectedMonth === new Date().toISOString().slice(0, 7)

  useEffect(() => {
    if (categories.length === 0) return
    if (!categories.includes(bulkCategory)) {
      setBulkCategory(categories[0])
    }
  }, [categories, bulkCategory])

  // Load data and set up real-time listeners
  useEffect(() => {
    if (!user || isGuest) {
      // Guest or no user: load from localStorage with normalization
      const rawTransactions = loadFromStorage(STORAGE_KEYS.transactions, [])
      const normalizedTransactions = normalizeTransactions(rawTransactions)
      setTransactions(normalizedTransactions)
      
      const rawBudget = loadFromStorage(STORAGE_KEYS.budget, null)
      if (rawBudget) {
        const normalizedBudget = normalizeBudget(rawBudget)
        setBudget(normalizedBudget)
      } else {
        setBudget(null)
      }
      setBudgetLoading(false)
      
      const categories = loadFromStorage(STORAGE_KEYS.categories, DEFAULT_CATEGORIES)
      setCategories(categories)
      
      setLoading(false)
      return
    }

    // Authenticated user: set up Firestore listeners with proper error handling
    setLoading(true)
    setBudgetLoading(true)
    const transactionsRef = doc(db, `users/${user.uid}/data`, 'transactions')
    const budgetRef = doc(db, `users/${user.uid}/user_settings`, 'budget')
    const categoriesRef = doc(db, `users/${user.uid}/user_settings`, 'categories')

    const unsubscribeTransactions = onSnapshot(
      transactionsRef,
      (docSnap) => {
        try {
          if (docSnap.exists()) {
            const data = docSnap.data()
            const items = data.items || []
            const normalizedItems = normalizeTransactions(items)
            setTransactions(normalizedItems)
            console.log('✓ Transactions loaded from Firestore:', normalizedItems.length)
          } else {
            console.log('No transactions document found, starting fresh')
            setTransactions([])
          }
        } catch (error) {
          console.error('Error processing transactions snapshot:', error)
          setTransactions([])
        }
        setLoading(false)
      },
      (error) => {
        console.error('✗ Error listening to transactions:', error)
        setLoading(false)
        // Fallback to localStorage
        const rawTransactions = loadFromStorage(STORAGE_KEYS.transactions, [])
        const normalizedTransactions = normalizeTransactions(rawTransactions)
        setTransactions(normalizedTransactions)
      }
    )

    const unsubscribeBudget = onSnapshot(
      budgetRef,
      (docSnap) => {
        try {
          if (docSnap.exists()) {
            const data = docSnap.data()
            const normalizedBudget = normalizeBudget(data)
            setBudget(normalizedBudget)
            console.log('✓ Budget loaded from Firestore:', normalizedBudget)
          } else {
            console.log('No budget document found, initializing without budget')
            setBudget(null)
          }
        } catch (error) {
          console.error('Error processing budget snapshot:', error)
          setBudget(null)
        } finally {
          setBudgetLoading(false)
        }
      },
      (error) => {
        console.error('✗ Error listening to budget:', error)
        // Fallback to localStorage
        const cachedBudget = loadFromStorage(STORAGE_KEYS.budget, null)
        if (cachedBudget) {
          const normalizedBudget = normalizeBudget(cachedBudget)
          setBudget(normalizedBudget)
        } else {
          setBudget(null)
        }
        setBudgetLoading(false)
      }
    )

    const unsubscribeCategories = onSnapshot(
      categoriesRef,
      (docSnap) => {
        try {
          if (docSnap.exists()) {
            const data = docSnap.data()
            const loaded = Array.isArray(data.items) && data.items.length > 0 ? data.items : DEFAULT_CATEGORIES
            setCategories(loaded)
          } else {
            setCategories(DEFAULT_CATEGORIES)
          }
        } catch (error) {
          console.error('Error processing categories snapshot:', error)
          setCategories(DEFAULT_CATEGORIES)
        }
      },
      (error) => {
        console.error('✗ Error listening to categories:', error)
        setCategories(DEFAULT_CATEGORIES)
      }
    )

    return () => {
      unsubscribeTransactions()
      unsubscribeBudget()
      unsubscribeCategories()
    }
  }, [user, isGuest])

  // Persist data based on auth state
  useEffect(() => {
    if (!user || isGuest) {
      // Guest or no user: persist to localStorage
      saveToStorage(STORAGE_KEYS.transactions, transactions)
      if (budget) {
        saveToStorage(STORAGE_KEYS.budget, budget)
      }
      saveToStorage(STORAGE_KEYS.categories, categories)
      return
    }

    // Authenticated user: persist to Firestore
    if (loading || budgetLoading) {
      return
    }

    const persistUserData = async () => {
      try {
        // Save transactions
        await setDoc(doc(db, `users/${user.uid}/data`, 'transactions'), {
          items: transactions,
          updatedAt: Date.now()
        }, { merge: true })

        // Save categories
        await setDoc(doc(db, `users/${user.uid}/user_settings`, 'categories'), {
          items: categories,
          updatedAt: Date.now()
        }, { merge: true })

        console.log('✓ Data persisted to Firestore successfully')
      } catch (error) {
        console.error('✗ Error saving user data to Firestore:', error)
        // Fallback: also save to localStorage as backup
        saveToStorage(STORAGE_KEYS.transactions, transactions)
        if (budget) {
          saveToStorage(STORAGE_KEYS.budget, budget)
        }
        saveToStorage(STORAGE_KEYS.categories, categories)
      }
    }

    // Debounce: avoid too many writes if state changes rapidly
    const debounceTimer = setTimeout(() => {
      persistUserData()
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [transactions, budget, categories, user, isGuest, loading, budgetLoading])

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      // Initialize Firebase Messaging for authenticated users
      if (user) {
        initializeMessaging(user.uid).catch((error) => {
          console.warn('⚠️ FCM initialization skipped:', error)
          // Don't show error to user - FCM is optional
        })
      }
      // Note: loading state is handled in the data loading effect
    })
    return unsubscribe
  }, [auth])

  // Derived stats
  // Filter transactions to selected month ONLY
  const monthlyTransactions = useMemo(
    () => monthNav.filterBySelectedMonth(transactions),
    [transactions, monthNav]
  )

  // Calculate stats based on SELECTED MONTH
  const totalIncome = useMemo(
    () => monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [monthlyTransactions]
  )
  const totalExpenses = useMemo(
    () => monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [monthlyTransactions]
  )
  const balance = totalIncome - totalExpenses

  const monthlyExpenses = totalExpenses

  const usedTags = useMemo(() => {
    const tags = new Set<string>()
    for (const t of monthlyTransactions) {
      for (const tag of (t.tags ?? [])) tags.add(tag)
    }
    return Array.from(tags).sort()
  }, [monthlyTransactions])

  // Filtered + searched transactions (use monthly transactions)
  const filtered = useMemo(() => {
    return monthlyTransactions
      .filter(t => {
        if (filterType !== 'all' && t.type !== filterType) return false
        if (filterCategory !== 'all' && t.category !== filterCategory) return false
        if (filterTag !== 'all' && !(t.tags ?? []).includes(filterTag)) return false
        if (search.trim()) {
          const q = search.toLowerCase()
          const inTags = ((t.tags ?? []) as string[]).some((tag: string) => tag.toLowerCase().includes(q))
          return t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || inTags
        }
        return true
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [monthlyTransactions, filterType, filterCategory, filterTag, search])

  useEffect(() => {
    const validIds = new Set(monthlyTransactions.map(t => t.id))
    setSelectedIds(prev => prev.filter(id => validIds.has(id)))
  }, [monthlyTransactions])

  const allFilteredSelected = filtered.length > 0 && filtered.every(t => selectedIds.includes(t.id))

  const toggleSelectTransaction = useCallback((id: string) => {
    setSelectedIds(prev => (
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    ))
  }, [])

  const toggleSelectAllFiltered = useCallback((checked: boolean) => {
    const filteredIds = filtered.map(t => t.id)
    setSelectedIds(prev => {
      if (checked) {
        return Array.from(new Set([...prev, ...filteredIds]))
      }
      const filteredSet = new Set(filteredIds)
      return prev.filter(id => !filteredSet.has(id))
    })
  }, [filtered])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
  }, [])

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    try {
      const t: Transaction = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      }
      setTransactions(prev => [t, ...prev])
      toast.success('✓ Transaction added successfully!')
      console.log('✓ Transaction added:', t.id)
    } catch (error) {
      console.error('✗ Error adding transaction:', error)
      toast.error('✗ Failed to add transaction')
    }
  }, [])

  const deleteTransaction = useCallback((id: string) => {
    try {
      setTransactions(prev => {
        const newTransactions = prev.filter(t => t.id !== id)
        console.log('✓ Transaction deleted:', id)
        return newTransactions
      })
      toast.success('✓ Transaction deleted!')
    } catch (error) {
      console.error('✗ Error deleting transaction:', error)
      toast.error('✗ Failed to delete transaction')
    }
  }, [])

  const editTransaction = useCallback(async (updatedTransaction: Transaction) => {
    try {
      setTransactions(prev =>
        prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
      )
      toast.success('✓ Transaction updated successfully!')
      console.log('✓ Transaction updated:', updatedTransaction.id)
    } catch (error) {
      console.error('✗ Error updating transaction:', error)
      toast.error('✗ Failed to update transaction')
    }
  }, [])

  const saveBudget = useCallback((limit: number) => {
    const newBudget: Budget = { limit, month: currentMonth() }
    
    // Set state
    setBudget(newBudget)
    
    // Always persist to localStorage as backup (even for Firebase users)
    saveToStorage(STORAGE_KEYS.budget, newBudget)
    
    // For Firebase users, also save to Firestore asynchronously
    if (user && !isGuest) {
      const budgetRef = doc(db, `users/${user.uid}/user_settings`, 'budget')
      setDoc(budgetRef, { ...newBudget, updatedAt: Date.now() }, { merge: true })
        .then(() => console.log('✓ Budget persisted to Firestore'))
        .catch(error => {
          console.error('⚠️ Failed to persist budget to Firestore:', error)
          // Fallback to localStorage is already done above
        })
    }
  }, [user, isGuest])

  const handleDuplicate = useCallback((transaction: Transaction) => {
    // Create duplicate data with today's date
    const duplicatedData = {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      date: new Date().toISOString().slice(0, 10), // Today's date
      description: transaction.description,
      tags: transaction.tags ?? [],
      isRecurring: transaction.isRecurring || false,
    }
    
    // Add the duplicated transaction
    addTransaction(duplicatedData)
    toast.success(`✓ Transaction duplicated! Adjust if needed.`)
    console.log('✓ Transaction duplicated:', transaction.id)
  }, [addTransaction])

  const handleRepeat = useCallback((transaction: Transaction) => {
    // Create repeat data with today's date (for current month)
    const repeatedData = {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      date: new Date().toISOString().slice(0, 10), // Today's date (current month)
      description: transaction.description,
      tags: transaction.tags ?? [],
      isRecurring: true, // Mark as recurring when repeating
    }
    
    // Add the repeated transaction
    addTransaction(repeatedData)
    toast.success(`✓ Recurring transaction added for this month!`)
    console.log('✓ Transaction repeated:', transaction.id)
  }, [addTransaction])

  const handleAddCategory = useCallback(async (rawName: string) => {
    const name = rawName.trim()
    if (!name) return
    if (categories.some(c => c.toLowerCase() === name.toLowerCase())) {
      toast.error('Category already exists')
      return
    }

    const updatedCategories = [...categories, name]
    try {
      if (user && !isGuest) {
        const categoriesRef = doc(db, `users/${user.uid}/user_settings`, 'categories')
        await setDoc(categoriesRef, { items: updatedCategories, updatedAt: Date.now() }, { merge: true })
      }
      setCategories(updatedCategories)
      toast.success(`✓ Category "${name}" added`)
    } catch (error) {
      console.error('✗ Error adding category:', error)
      toast.error('✗ Failed to add category')
    }
  }, [categories, user, isGuest])

  const handleDeleteCategory = useCallback(async (categoryName: string) => {
    const usageCount = transactions.filter(t => t.category === categoryName).length
    if (usageCount > 0) {
      toast.error(`Category is still used by ${usageCount} transaction(s)`)
      return
    }
    if (!window.confirm(`Delete category "${categoryName}"?`)) return

    const updatedCategories = categories.filter(c => c !== categoryName)
    try {
      if (user && !isGuest) {
        const categoriesRef = doc(db, `users/${user.uid}/user_settings`, 'categories')
        await setDoc(categoriesRef, { items: updatedCategories, updatedAt: Date.now() }, { merge: true })
      }
      setCategories(updatedCategories.length > 0 ? updatedCategories : DEFAULT_CATEGORIES)
      if (filterCategory === categoryName) setFilterCategory('all')
      toast.success(`✓ Category "${categoryName}" deleted`)
    } catch (error) {
      console.error('✗ Error deleting category:', error)
      toast.error('✗ Failed to delete category')
    }
  }, [categories, transactions, user, isGuest, filterCategory])

  const handleRenameCategory = useCallback(async (oldName: string, rawNewName: string) => {
    const newName = rawNewName.trim()
    if (!newName || oldName === newName) return
    if (categories.some(c => c.toLowerCase() === newName.toLowerCase())) {
      toast.error('Target category already exists')
      return
    }
    if (!window.confirm(`Rename "${oldName}" to "${newName}" and update related transactions?`)) return

    const updatedTransactions = transactions.map(t => (
      t.category === oldName ? { ...t, category: newName } : t
    ))
    const updatedCategories = categories.map(c => (c === oldName ? newName : c))

    try {
      if (user && !isGuest) {
        const batch = writeBatch(db)
        const transactionsRef = doc(db, `users/${user.uid}/data`, 'transactions')
        const categoriesRef = doc(db, `users/${user.uid}/user_settings`, 'categories')

        batch.set(transactionsRef, { items: updatedTransactions, updatedAt: Date.now() }, { merge: true })
        batch.set(categoriesRef, { items: updatedCategories, updatedAt: Date.now() }, { merge: true })
        await batch.commit()
      }

      setTransactions(updatedTransactions)
      setCategories(updatedCategories)
      if (filterCategory === oldName) setFilterCategory(newName)
      toast.success(`✓ Category renamed to "${newName}"`)
    } catch (error) {
      console.error('✗ Error renaming category:', error)
      toast.error('✗ Failed to rename category')
    }
  }, [categories, transactions, user, isGuest, filterCategory])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Delete ${selectedIds.length} selected transactions?`)) return

    try {
      const selectedSet = new Set(selectedIds)
      const updatedTransactions = transactions.filter(t => !selectedSet.has(t.id))

      if (user && !isGuest) {
        const batch = writeBatch(db)
        const transactionsRef = doc(db, `users/${user.uid}/data`, 'transactions')
        batch.set(transactionsRef, {
          items: updatedTransactions,
          updatedAt: Date.now(),
        }, { merge: true })
        await batch.commit()
      }

      setTransactions(updatedTransactions)
      clearSelection()
      toast.success(`✓ Successfully deleted ${selectedIds.length} transactions`)
    } catch (error) {
      console.error('✗ Error deleting selected transactions:', error)
      toast.error('✗ Failed to delete selected transactions')
    }
  }, [selectedIds, transactions, user, isGuest, clearSelection])

  const handleBulkRecategorize = useCallback(async () => {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Change category for ${selectedIds.length} selected transactions?`)) return

    try {
      const selectedSet = new Set(selectedIds)
      const updatedTransactions = transactions.map(t => (
        selectedSet.has(t.id) ? { ...t, category: bulkCategory } : t
      ))

      if (user && !isGuest) {
        const batch = writeBatch(db)
        const transactionsRef = doc(db, `users/${user.uid}/data`, 'transactions')
        batch.set(transactionsRef, {
          items: updatedTransactions,
          updatedAt: Date.now(),
        }, { merge: true })
        await batch.commit()
      }

      setTransactions(updatedTransactions)
      setBulkMode(null)
      clearSelection()
      toast.success(`✓ Successfully recategorized ${selectedIds.length} transactions`)
    } catch (error) {
      console.error('✗ Error recategorizing selected transactions:', error)
      toast.error('✗ Failed to recategorize selected transactions')
    }
  }, [selectedIds, transactions, bulkCategory, user, isGuest, clearSelection])

  const handleBulkDateChange = useCallback(async () => {
    if (selectedIds.length === 0) return
    if (!bulkDate) {
      toast.error('Please select a valid date')
      return
    }
    if (!window.confirm(`Change date for ${selectedIds.length} selected transactions?`)) return

    try {
      const selectedSet = new Set(selectedIds)
      const updatedTransactions = transactions.map(t => (
        selectedSet.has(t.id) ? { ...t, date: bulkDate } : t
      ))

      if (user && !isGuest) {
        const batch = writeBatch(db)
        const transactionsRef = doc(db, `users/${user.uid}/data`, 'transactions')
        batch.set(transactionsRef, {
          items: updatedTransactions,
          updatedAt: Date.now(),
        }, { merge: true })
        await batch.commit()
      }

      setTransactions(updatedTransactions)
      setBulkMode(null)
      clearSelection()
      toast.success(`✓ Successfully updated date for ${selectedIds.length} transactions`)
    } catch (error) {
      console.error('✗ Error changing date for selected transactions:', error)
      toast.error('✗ Failed to update date for selected transactions')
    }
  }, [selectedIds, transactions, bulkDate, user, isGuest, clearSelection])

  // Export transactions to CSV
  const exportToCSV = useCallback(() => {
    if (monthlyTransactions.length === 0) {
      toast.error('No transactions to export')
      return
    }

    // Create CSV header
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Type']
    
    // Create CSV rows
    const rows = monthlyTransactions.map(t => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`, // Escape quotes
      t.category,
      t.amount.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      t.type,
    ])

    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    // Generate filename with month and year
    const [year, month] = monthNav.selectedMonth.split('-')
    const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('id-ID', { month: 'long' })
    const fileName = `finance-report-${monthName}-${year}.csv`
    
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success(`✓ Exported ${monthlyTransactions.length} transactions`)
    console.log(`✓ CSV exported: ${fileName}`)
  }, [monthlyTransactions, monthNav.selectedMonth])

  const handleSignOut = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar?')) {
      try {
        if (user) {
          // Firebase user - sign out from Firebase
          await signOutUser()
          // Auth state listener will set user to null
        } else if (isGuest) {
          // Guest user - clear persisted guest data from localStorage
          localStorage.removeItem(STORAGE_KEYS.transactions)
          localStorage.removeItem(STORAGE_KEYS.budget)
          localStorage.removeItem(STORAGE_KEYS.categories)
          // Reset states
          setUser(null)
          setIsGuest(false)
          // Note: data loading effect will load empty/default values from localStorage
        }
      } catch (error) {
        console.error('Error signing out:', error)
        alert('Terjadi kesalahan saat keluar. Silakan coba lagi.')
      }
    }
  }

  return (
    <CategoryContext.Provider value={{ categories }}>
    <div className="min-h-screen bg-stone-50">
      <Toaster 
        position="top-right" 
        richColors 
        closeButton
        duration={3000}
      />
      {loading ? (
        <div className="flex h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900"></div>
        </div>
      ) : !user && !isGuest ? (
        // Show login screen when not authenticated and not in guest mode
        <LoginScreen
          onLogin={() => {}}
          onGuest={() => setIsGuest(true)}
        />
      ) : (
        // Show main app when authenticated or in guest mode
        <>
          {/* Header */}
          <header className="bg-white border-b border-stone-100 sticky top-0 z-40 w-full">
            <div className="max-w-full mx-auto px-4 md:px-6 py-3 md:py-0">
              <div className="flex flex-col md:flex-row md:h-14 md:items-center md:justify-between gap-3 md:gap-0">
                {/* Logo */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-stone-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Wallet size={14} className="text-white" />
                  </div>
                  <span className="font-semibold text-stone-900 text-sm md:text-base tracking-tight">FinanceTracker</span>
                </div>

                {/* User Info & Actions - Stack on mobile, flex on desktop */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  {/* User Info */}
                  {(!user && isGuest) ? (
                    <div className="flex items-center justify-between gap-3 sm:justify-start">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 bg-stone-900 rounded-full flex items-center justify-center flex-shrink-0">
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-sm font-medium text-stone-900 truncate">Pengguna Tamu</p>
                          <p className="text-xs text-stone-500">Data lokal</p>
                        </div>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="text-xs text-stone-400 hover:text-stone-700 transition-colors font-medium whitespace-nowrap"
                      >
                        Keluar
                      </button>
                    </div>
                  ) : user ? (
                    <div className="flex items-center justify-between gap-3 sm:justify-start">
                      <div className="flex items-center gap-2 min-w-0">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt="User"
                            className="h-8 w-8 rounded-full object-cover border-2 border-white flex-shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 bg-stone-900 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-medium">
                            {user.displayName?.[0] ?? 'U'}
                          </div>
                        )}
                        <div className="space-y-0.5 min-w-0 hidden sm:block">
                          <p className="text-sm font-medium text-stone-900 truncate">{user.displayName || 'User'}</p>
                          <p className="text-xs text-stone-500 truncate">{user.email || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user && !isGuest && (
                          <button
                            onClick={() => setShowNotificationSettings(true)}
                            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                            title="Notification Settings"
                          >
                            <Bell size={18} />
                          </button>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="text-xs text-stone-400 hover:text-stone-700 transition-colors font-medium whitespace-nowrap"
                        >
                          Keluar
                        </button>
                      </div>
                    </div>
                  ) : null}
                  
                  {/* Add Transaction Button - Touch-friendly size */}
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-1.5 bg-stone-900 text-white text-sm md:text-base font-medium px-4 md:px-3.5 py-3 md:py-2 rounded-xl hover:bg-stone-800 transition-colors active:scale-95 min-h-12 md:min-h-auto"
                  >
                    <Plus size={18} className="md:w-4 md:h-4" />
                    <span className="md:hidden">Add</span>
                    <span className="hidden md:inline">Add</span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          <main className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 space-y-6">
            {/* Month Navigation Header */}
            <div className="bg-white rounded-2xl border border-stone-100 p-4">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={monthNav.goToPreviousMonth}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors active:scale-95 text-stone-600 hover:text-stone-900"
                  title="Previous month"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
                  <Calendar size={16} className="text-stone-400 flex-shrink-0" />
                  <div className="text-center flex-1">
                    <div className="text-sm md:text-base font-semibold text-stone-900">
                      {monthNav.getMonthDisplay(monthNav.selectedMonth)}
                    </div>
                    {!isCurrentMonth && (
                      <button
                        onClick={monthNav.goToCurrentMonth}
                        className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline"
                      >
                        View current month
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={monthNav.goToNextMonth}
                  className="p-2 hover:bg-stone-100 rounded-lg transition-colors active:scale-95 text-stone-600 hover:text-stone-900"
                  title="Next month"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 justify-start">
             <button
               onClick={() => setViewMode('dashboard')}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 ${
                 viewMode === 'dashboard'
                   ? 'bg-stone-900 text-white'
                   : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
               }`}
             >
               <Layout size={16} />
               Dashboard
             </button>
             <button
               onClick={() => setViewMode('analytics')}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 ${
                 viewMode === 'analytics'
                   ? 'bg-stone-900 text-white'
                   : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
               }`}
             >
               <BarChart3 size={16} />
               Analytics
             </button>
            </div>

            {/* Content based on view mode */}
            {viewMode === 'dashboard' ? (
            <>
            {/* Dashboard View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <SummaryCard label="Net Balance" amount={balance} icon={<Wallet size={16} />} variant="neutral" />
              <SummaryCard label="Total Income" amount={totalIncome} icon={<TrendingUp size={16} />} variant="income" />
              <SummaryCard label="Total Expenses" amount={totalExpenses} icon={<TrendingDown size={16} />} variant="expense" />
            </div>

            {/* Main Grid - Single column on mobile, 3 columns on large screens */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Transactions */}
              <div className="lg:col-span-2 space-y-4 w-full">
                {/* Search & Filter Bar - Responsive */}
                <div className="bg-white rounded-2xl border border-stone-100 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="relative w-full">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Search transactions…"
                        value={search}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 md:py-2 text-base md:text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Type filter */}
                      <div className="relative flex-1">
                        <select
                          value={filterType}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value as typeof filterType)}
                          className="appearance-none w-full pl-3 pr-8 py-3 md:py-2 text-base md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700 transition-colors"
                        >
                          <option value="all">All types</option>
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                      </div>
                      {/* Category filter */}
                      <div className="relative flex-1">
                        <select
                          value={filterCategory}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterCategory(e.target.value as Category | 'all')}
                          className="appearance-none w-full pl-3 pr-8 py-3 md:py-2 text-base md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700 transition-colors"
                        >
                          <option value="all">All categories</option>
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                      </div>
                      {/* Tag filter */}
                      <div className="relative flex-1">
                        <select
                          value={filterTag}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterTag(e.target.value)}
                          className="appearance-none w-full pl-3 pr-8 py-3 md:py-2 text-base md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700 transition-colors"
                        >
                          <option value="all">All tags</option>
                          {usedTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                      </div>
                      <button
                        onClick={() => setShowCategoryManager(true)}
                        className="px-3 py-3 md:py-2 text-xs font-medium bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors active:scale-95 whitespace-nowrap"
                      >
                        Manage Categories
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transaction List */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm w-full">
                  <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => toggleSelectAllFiltered(e.target.checked)}
                        disabled={filtered.length === 0}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                        aria-label="Select all transactions"
                        title="Select all visible transactions"
                      />
                      <span className="text-sm font-medium text-slate-700">Transactions</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{filtered.length} entries</span>
                      <button
                        onClick={exportToCSV}
                        disabled={monthlyTransactions.length === 0}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors active:scale-95"
                        title={`Export ${monthlyTransactions.length} transactions as CSV`}
                      >
                        <Download size={14} />
                        Export CSV
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-stone-50 px-2 pb-2 max-h-[520px] overflow-y-auto scrollbar-thin">
                    {filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                          <Wallet size={20} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-700">No transactions yet</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {transactions.length === 0 ? 'Add your first transaction above' : 'Try adjusting your filters'}
                        </p>
                      </div>
                    ) : (
                      filtered.map(t => (
                       <TransactionRow
                         key={t.id}
                         t={t}
                         selected={selectedIds.includes(t.id)}
                         onToggleSelect={toggleSelectTransaction}
                         onDelete={deleteTransaction}
                         onEdit={(transaction) => setEditingTransaction(transaction)}
                         onDuplicate={handleDuplicate}
                         onRepeat={handleRepeat}
                       />
                      ))
                    )}
                  </div>
                </div>

                {selectedIds.length > 0 && (
                  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-between">
                      <span className="text-sm font-medium text-slate-700">
                        {selectedIds.length} selected
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setBulkMode('recategorize')}
                          className="px-3 py-2 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          Recategorize
                        </button>
                        <button
                          onClick={() => setBulkMode('date')}
                          className="px-3 py-2 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                        >
                          Change Date
                        </button>
                        <button
                          onClick={handleBulkDelete}
                          className="px-3 py-2 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                        >
                          Delete Selected
                        </button>
                        <button
                          onClick={clearSelection}
                          className="px-3 py-2 text-xs font-medium rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Budget + Categories - Stacks below on mobile */}
              <div className="space-y-4 w-full">
                <BudgetPanel
                  budget={budget}
                  budgetLoading={budgetLoading}
                  monthlyExpenses={monthlyExpenses}
                  onUpdate={saveBudget}
                />
                 
                {/* Exchange Rate Info Card */}
                <CategoryBreakdown transactions={monthlyTransactions} />
              </div>
            </div>
            </>) : (
            <>
            {/* Analytics View */}
            <AnalyticsDashboard
              transactions={monthlyTransactions}
              selectedMonth={monthNav.selectedMonth}
            />
            </>
            )}
          </main>

          {showModal && (
            <AddTransactionModal onClose={() => setShowModal(false)} onAdd={addTransaction} />
          )}

          {editingTransaction && (
            <EditTransactionModal
              transaction={editingTransaction}
              onClose={() => setEditingTransaction(null)}
              onSave={editTransaction}
            />
          )}

          {showCategoryManager && (
            <CategoryManagerModal
              categories={categories}
              onClose={() => setShowCategoryManager(false)}
              onAdd={handleAddCategory}
              onRename={handleRenameCategory}
              onDelete={handleDeleteCategory}
            />
          )}

          {bulkMode === 'recategorize' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-stone-900">Bulk Recategorize</h3>
                <select
                  value={bulkCategory}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBulkCategory(e.target.value as Category)}
                  className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setBulkMode(null)}
                    className="px-3 py-2 text-xs font-medium rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkRecategorize}
                    className="px-3 py-2 text-xs font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {bulkMode === 'date' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
              <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-stone-900">Bulk Change Date</h3>
                <input
                  type="date"
                  value={bulkDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBulkDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setBulkMode(null)}
                    className="px-3 py-2 text-xs font-medium rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkDateChange}
                    className="px-3 py-2 text-xs font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {showNotificationSettings && user && !isGuest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-stone-900 text-lg">Notification Settings</h2>
                  <button
                    onClick={() => setShowNotificationSettings(false)}
                    className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600"
                  >
                    <X size={18} />
                  </button>
                </div>
                <NotificationSettings userId={user.uid} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </CategoryContext.Provider>
  )
}
