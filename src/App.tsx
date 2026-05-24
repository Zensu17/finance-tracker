import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast, Toaster } from 'sonner'
import {
  Plus, Trash2, Search, TrendingUp, TrendingDown, Wallet,
  ChevronDown, X, SlidersHorizontal, ShoppingCart, Car,
  Utensils, Home, Heart, Briefcase, Zap, Gift, MoreHorizontal,
  DollarSign, PiggyBank, CheckCircle2, Edit2, ChevronLeft, ChevronRight, Calendar, Copy,
  Download, RotateCcw
} from 'lucide-react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { auth, db, signOutUser } from './firebase'
import LoginScreen from './components/LoginScreen'
import { useMonthNavigation } from './hooks/useMonthNavigation'

// ─── Types ───────────────────────────────────────────────────────────────────

type TransactionType = 'income' | 'expense'

type Category =
  | 'Food & Dining' | 'Housing' | 'Transport' | 'Healthcare'
  | 'Shopping' | 'Utilities' | 'Entertainment' | 'Salary'
  | 'Freelance' | 'Investment' | 'Gift' | 'Other'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: Category
  date: string
  description: string
  createdAt: number
  isRecurring?: boolean
}

export interface Budget {
  limit: number
  month: string // "YYYY-MM"
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES: Category[] = [
  'Food & Dining', 'Housing', 'Transport', 'Healthcare',
  'Shopping', 'Utilities', 'Entertainment', 'Gift', 'Other'
]
const INCOME_CATEGORIES: Category[] = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other']

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
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

const CATEGORY_COLORS: Record<Category, string> = {
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

const CATEGORY_BAR_COLORS: Record<Category, string> = {
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

const STORAGE_KEYS = { transactions: 'ft_transactions', budget: 'ft_budget' }

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

function fmt(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR'
  }).format(amount)
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
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
    neutral: 'bg-stone-900 text-white',
    income: 'bg-white border border-stone-100 text-stone-900',
    expense: 'bg-white border border-stone-100 text-stone-900',
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
    <div className={`rounded-2xl p-5 ${colors[variant]}`}>
      <div className="flex items-start justify-between mb-4">
        <span className={`text-sm font-medium ${variant === 'neutral' ? 'text-stone-300' : 'text-stone-500'}`}>
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
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${CATEGORY_COLORS[category]}`}>
      {CATEGORY_ICONS[category]}
      {category}
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
  isRecurring: false,
}

function AddTransactionModal({
  onClose, onAdd
}: {
  onClose: () => void
  onAdd: (t: Omit<Transaction, 'id' | 'createdAt'>) => void
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  const categories = form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  function handleTypeChange(type: TransactionType) {
    const defaultCat = type === 'expense' ? 'Food & Dining' : 'Salary'
    setForm(f => ({ ...f, type, category: defaultCat }))
  }

  function handleSubmit() {
    const amount = parseFloat(form.amount)
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount greater than 0.')
      return
    }
    if (!form.description.trim()) {
      setError('Description is required.')
      return
    }
    onAdd({
      type: form.type,
      amount,
      category: form.category,
      date: form.date,
      description: form.description.trim(),
      isRecurring: form.isRecurring || false,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] sm:max-h-auto overflow-y-auto sm:overflow-visible">
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

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-base md:text-sm">Rp</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full pl-7 pr-3 py-3 md:py-2.5 text-base md:text-sm font-mono border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Category</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, category: e.target.value as Category }))}
                className="w-full px-3 py-3 md:py-2.5 text-base md:text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50 appearance-none pr-8"
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
              className="w-full px-3 py-3 md:py-2.5 text-base md:text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50"
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
              className="w-full px-3 py-3 md:py-2.5 text-base md:text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50"
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

          {error && (
            <p className="text-xs text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-3 md:py-2.5 text-base md:text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors active:scale-95 min-h-12 md:min-h-auto"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 md:py-2.5 text-base md:text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors active:scale-95 min-h-12 md:min-h-auto"
          >
            Add Transaction
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
  onSave: (t: Transaction) => void
  transaction: Transaction
}) {
  const [form, setForm] = useState({
    type: transaction.type,
    amount: String(transaction.amount),
    category: transaction.category,
    date: transaction.date,
    description: transaction.description,
    isRecurring: transaction.isRecurring || false,
  })
  const [error, setError] = useState('')

  const categories = form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  function handleTypeChange(type: TransactionType) {
    const defaultCat = type === 'expense' ? 'Food & Dining' : 'Salary'
    setForm(f => ({ ...f, type, category: defaultCat }))
  }

  function handleSubmit() {
    const amount = parseFloat(form.amount)
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount greater than 0.')
      return
    }
    if (!form.description.trim()) {
      setError('Description is required.')
      return
    }
    onSave({
      ...transaction,
      type: form.type,
      amount,
      category: form.category,
      date: form.date,
      description: form.description.trim(),
      isRecurring: form.isRecurring || false,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] sm:max-h-auto overflow-y-auto sm:overflow-visible">
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

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-base md:text-sm">Rp</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full pl-7 pr-3 py-3 md:py-2.5 text-base md:text-sm font-mono border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Category</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, category: e.target.value as Category }))}
                className="w-full px-3 py-3 md:py-2.5 text-base md:text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50 appearance-none pr-8"
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
              className="w-full px-3 py-3 md:py-2.5 text-base md:text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50"
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
              className="w-full px-3 py-3 md:py-2.5 text-base md:text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50"
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

          {error && (
            <p className="text-xs text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 py-3 md:py-2.5 text-base md:text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors active:scale-95 min-h-12 md:min-h-auto"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 md:py-2.5 text-base md:text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors active:scale-95 min-h-12 md:min-h-auto"
          >
            Update Transaction
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Budget Panel ─────────────────────────────────────────────────────────────

function BudgetPanel({ budget, monthlyExpenses, onUpdate }: {
  budget: Budget
  monthlyExpenses: number
  onUpdate: (limit: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState(String(budget.limit))

  const pct = budget.limit > 0 ? Math.min((monthlyExpenses / budget.limit) * 100, 100) : 0
  const over = budget.limit > 0 && monthlyExpenses > budget.limit
  const remaining = budget.limit - monthlyExpenses

  function handleSave() {
    const val = parseFloat(input)
    if (!isNaN(val) && val > 0) onUpdate(val)
    setEditing(false)
  }

  const barColor = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5 w-full">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <PiggyBank size={16} className="text-stone-400 flex-shrink-0" />
          <span className="text-sm font-medium text-stone-700 truncate">Monthly Budget</span>
          <span className="text-xs text-stone-400 whitespace-nowrap">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
        <button
          onClick={() => { setEditing(e => !e); setInput(String(budget.limit)) }}
          className="text-xs text-stone-400 hover:text-stone-700 transition-colors font-medium whitespace-nowrap"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-base md:text-sm">Rp</span>
            <input
              type="number"
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              className="w-full pl-7 pr-3 py-3 md:py-2 text-base md:text-sm font-mono border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50"
              autoFocus
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-3 md:py-2 text-base md:text-sm font-medium text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors active:scale-95 whitespace-nowrap min-h-12 md:min-h-auto"
          >
            Save
          </button>
        </div>
      ) : null}

      {budget.limit === 0 ? (
        <p className="text-sm text-stone-400 text-center py-4">No budget set. Click Edit to add one.</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-2 gap-2">
            <span className="font-mono text-lg md:text-xl font-medium text-stone-900 truncate">{fmt(monthlyExpenses)}</span>
            <span className="text-xs md:text-sm text-stone-400 font-mono whitespace-nowrap">/ {fmt(budget.limit)}</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
            <span className={`font-medium ${over ? 'text-rose-500' : 'text-stone-500'} truncate`}>
              {over ? `${fmt(Math.abs(remaining))} over budget` : `${fmt(remaining)} remaining`}
            </span>
            <span className={`font-mono font-medium whitespace-nowrap ${pct >= 90 ? 'text-rose-500' : pct >= 70 ? 'text-amber-500' : 'text-emerald-600'}`}>
              {pct.toFixed(1)}%
            </span>
          </div>
          {!over && pct < 70 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
              <CheckCircle2 size={12} className="flex-shrink-0" />
              <span className="truncate">On track for this month</span>
            </div>
          )}
          {over && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">
              <TrendingDown size={12} className="flex-shrink-0" />
              <span className="truncate">Budget exceeded — review your expenses</span>
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
    const map: Partial<Record<Category, number>> = {}
    for (const t of expenses) {
      map[t.category] = (map[t.category] ?? 0) + t.amount
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7) as [Category, number][]
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
                  className={`h-full rounded-full ${CATEGORY_BAR_COLORS[cat]} transition-all duration-500`}
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

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ t, onDelete, onEdit, onDuplicate, onRepeat }: { t: Transaction; onDelete: (id: string) => void; onEdit: (transaction: Transaction) => void; onDuplicate: (transaction: Transaction) => void; onRepeat?: (transaction: Transaction) => void }) {
  const [confirm, setConfirm] = useState(false)
  
  // Check if transaction is from a previous month (for Repeat button)
  const currentDate = new Date()
  const transactionDate = new Date(t.date)
  const isFromPreviousMonth = transactionDate.getFullYear() < currentDate.getFullYear() ||
    (transactionDate.getFullYear() === currentDate.getFullYear() && transactionDate.getMonth() < currentDate.getMonth())

  return (
    <div className="flex items-center gap-3 py-4 md:py-3 px-4 hover:bg-stone-50 rounded-xl transition-colors group active:bg-stone-50">
      <div className={`w-10 h-10 md:w-8 md:h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
        t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'
      }`}>
        {CATEGORY_ICONS[t.category]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm md:text-base font-medium text-stone-900 truncate">{t.description}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <CategoryBadge category={t.category} />
          {t.isRecurring && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
              Recurring
            </span>
          )}
          <span className="text-xs text-stone-400">{fmtDate(t.date)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className={`font-mono text-sm md:text-base font-semibold whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-stone-900'}`}>
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
  const [budget, setBudget] = useState<Budget>({ limit: 0, month: currentMonth() })
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all')
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all')
  const [user, setUser] = useState<User | null>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [loading, setLoading] = useState(true)

  // Month Navigation
  const monthNav = useMonthNavigation()
  const isCurrentMonth = monthNav.selectedMonth === new Date().toISOString().slice(0, 7)

  // Load data and set up real-time listeners
  useEffect(() => {
    if (!user || isGuest) {
      // Guest or no user: load from localStorage
      setTransactions(() => loadFromStorage(STORAGE_KEYS.transactions, []))
      setBudget(() => loadFromStorage(STORAGE_KEYS.budget, { limit: 0, month: currentMonth() }))
      setLoading(false)
      return
    }

    // Authenticated user: set up Firestore listeners with proper error handling
    setLoading(true)
    const transactionsRef = doc(db, `users/${user.uid}/data`, 'transactions')
    const budgetRef = doc(db, `users/${user.uid}/data`, 'budget')

    const unsubscribeTransactions = onSnapshot(
      transactionsRef,
      (docSnap) => {
        try {
          if (docSnap.exists()) {
            const data = docSnap.data()
            setTransactions(data.items || [])
            console.log('✓ Transactions loaded from Firestore:', data.items?.length || 0)
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
        setTransactions(() => loadFromStorage(STORAGE_KEYS.transactions, []))
      }
    )

    const unsubscribeBudget = onSnapshot(
      budgetRef,
      (docSnap) => {
        try {
          if (docSnap.exists()) {
            const data = docSnap.data()
            if (data && data.limit !== undefined && data.month !== undefined) {
              setBudget({ limit: data.limit, month: data.month })
              console.log('✓ Budget loaded from Firestore')
            } else {
              setBudget({ limit: 0, month: currentMonth() })
            }
          } else {
            console.log('No budget document found, starting fresh')
            setBudget({ limit: 0, month: currentMonth() })
          }
        } catch (error) {
          console.error('Error processing budget snapshot:', error)
          setBudget({ limit: 0, month: currentMonth() })
        }
      },
      (error) => {
        console.error('✗ Error listening to budget:', error)
        // Fallback to localStorage
        const cachedBudget = loadFromStorage(STORAGE_KEYS.budget, { limit: 0, month: currentMonth() })
        setBudget(cachedBudget)
      }
    )

    return () => {
      unsubscribeTransactions()
      unsubscribeBudget()
    }
  }, [user, isGuest])

  // Persist data based on auth state
  useEffect(() => {
    if (!user || isGuest) {
      // Guest or no user: persist to localStorage
      saveToStorage(STORAGE_KEYS.transactions, transactions)
      saveToStorage(STORAGE_KEYS.budget, budget)
      return
    }

    // Authenticated user: persist to Firestore
    const persistUserData = async () => {
      try {
        // Save both documents with error handling
        await Promise.all([
          setDoc(doc(db, `users/${user.uid}/data`, 'transactions'), {
            items: transactions,
            updatedAt: Date.now()
          }, { merge: true }),
          setDoc(doc(db, `users/${user.uid}/data`, 'budget'), {
            ...budget,
            updatedAt: Date.now()
          }, { merge: true })
        ])
        console.log('✓ Data persisted to Firestore successfully')
      } catch (error) {
        console.error('✗ Error saving user data to Firestore:', error)
        // Fallback: also save to localStorage as backup
        saveToStorage(STORAGE_KEYS.transactions, transactions)
        saveToStorage(STORAGE_KEYS.budget, budget)
      }
    }

    // Debounce: avoid too many writes if state changes rapidly
    const debounceTimer = setTimeout(() => {
      persistUserData()
    }, 500)

    return () => clearTimeout(debounceTimer)
  }, [transactions, budget, user, isGuest])

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
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

  // All unique categories in current transactions for filter
  const usedCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category))
    return Array.from(cats) as Category[]
  }, [transactions])

  // Filtered + searched transactions (use monthly transactions)
  const filtered = useMemo(() => {
    return monthlyTransactions
      .filter(t => {
        if (filterType !== 'all' && t.type !== filterType) return false
        if (filterCategory !== 'all' && t.category !== filterCategory) return false
        if (search.trim()) {
          const q = search.toLowerCase()
          return t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
        }
        return true
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [monthlyTransactions, filterType, filterCategory, search])

  const addTransaction = useCallback((data: Omit<Transaction, 'id' | 'createdAt'>) => {
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

  const editTransaction = useCallback((updatedTransaction: Transaction) => {
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

  const updateBudget = useCallback((limit: number) => {
    setBudget({ limit, month: currentMonth() })
  }, [])

  const handleDuplicate = useCallback((transaction: Transaction) => {
    // Create duplicate data with today's date
    const duplicatedData = {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      date: new Date().toISOString().slice(0, 10), // Today's date
      description: transaction.description,
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
      isRecurring: true, // Mark as recurring when repeating
    }
    
    // Add the repeated transaction
    addTransaction(repeatedData)
    toast.success(`✓ Recurring transaction added for this month!`)
    console.log('✓ Transaction repeated:', transaction.id)
  }, [addTransaction])

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
                      <button
                        onClick={handleSignOut}
                        className="text-xs text-stone-400 hover:text-stone-700 transition-colors font-medium whitespace-nowrap"
                      >
                        Keluar
                      </button>
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

            {/* Summary Cards - Responsive grid */}
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
                          className="appearance-none w-full pl-3 pr-8 py-3 md:py-2 text-base md:text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50 text-stone-700"
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
                          className="appearance-none w-full pl-3 pr-8 py-3 md:py-2 text-base md:text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50 text-stone-700"
                        >
                          <option value="all">All categories</option>
                          {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transaction List */}
                <div className="bg-white rounded-2xl border border-stone-100 w-full">
                  <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-700">Transactions</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-stone-400">{filtered.length} entries</span>
                      <button
                        onClick={exportToCSV}
                        disabled={monthlyTransactions.length === 0}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed transition-colors active:scale-95"
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
                        <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mb-3">
                          <Wallet size={20} className="text-stone-400" />
                        </div>
                        <p className="text-sm font-medium text-stone-500">No transactions found</p>
                        <p className="text-xs text-stone-400 mt-1">
                          {transactions.length === 0 ? 'Add your first transaction above' : 'Try adjusting your filters'}
                        </p>
                      </div>
                    ) : (
                      filtered.map(t => (
                       <TransactionRow key={t.id} t={t} onDelete={deleteTransaction} onEdit={(transaction) => setEditingTransaction(transaction)} onDuplicate={handleDuplicate} onRepeat={handleRepeat} />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Budget + Categories - Stacks below on mobile */}
              <div className="space-y-4 w-full">
                <BudgetPanel
                  budget={budget}
                  monthlyExpenses={monthlyExpenses}
                  onUpdate={updateBudget}
                />
                <CategoryBreakdown transactions={monthlyTransactions} />
              </div>
            </div>
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
        </>
      )}
    </div>
  )
}
