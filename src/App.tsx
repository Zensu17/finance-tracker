import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus, Trash2, Search, TrendingUp, TrendingDown, Wallet,
  ChevronDown, X, SlidersHorizontal, ShoppingCart, Car,
  Utensils, Home, Heart, Briefcase, Zap, Gift, MoreHorizontal,
  DollarSign, PiggyBank, CheckCircle2
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type TransactionType = 'income' | 'expense'

type Category =
  | 'Food & Dining' | 'Housing' | 'Transport' | 'Healthcare'
  | 'Shopping' | 'Utilities' | 'Entertainment' | 'Salary'
  | 'Freelance' | 'Investment' | 'Gift' | 'Other'

interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: Category
  date: string
  description: string
  createdAt: number
}

interface Budget {
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
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">New Transaction</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl bg-stone-100 p-1 gap-1">
            {(['expense', 'income'] as TransactionType[]).map(t => (
              <button
                key={t}
                onClick={() => handleTypeChange(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
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
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-sm">Rp</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full pl-7 pr-3 py-2.5 text-sm font-mono border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Category</label>
            <div className="relative">
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50 appearance-none pr-8"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Description</label>
            <input
              type="text"
              placeholder="What was this for?"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors"
          >
            Add Transaction
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
    <div className="bg-white rounded-2xl border border-stone-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PiggyBank size={16} className="text-stone-400" />
          <span className="text-sm font-medium text-stone-700">Monthly Budget</span>
          <span className="text-xs text-stone-400">{new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>
        <button
          onClick={() => { setEditing(e => !e); setInput(String(budget.limit)) }}
          className="text-xs text-stone-400 hover:text-stone-700 transition-colors font-medium"
        >
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-sm">Rp</span>
            <input
              type="number"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full pl-7 pr-3 py-2 text-sm font-mono border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors"
          >
            Save
          </button>
        </div>
      ) : null}

      {budget.limit === 0 ? (
        <p className="text-sm text-stone-400 text-center py-2">No budget set. Click Edit to add one.</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-mono text-xl font-medium text-stone-900">{fmt(monthlyExpenses)}</span>
            <span className="text-sm text-stone-400 font-mono">/ {fmt(budget.limit)}</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-medium ${over ? 'text-rose-500' : 'text-stone-500'}`}>
              {over ? `${fmt(Math.abs(remaining))} over budget` : `${fmt(remaining)} remaining`}
            </span>
            <span className={`font-mono font-medium ${pct >= 90 ? 'text-rose-500' : pct >= 70 ? 'text-amber-500' : 'text-emerald-600'}`}>
              {pct.toFixed(1)}%
            </span>
          </div>
          {!over && pct < 70 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
              <CheckCircle2 size={12} />
              On track for this month
            </div>
          )}
          {over && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-500 bg-rose-50 px-3 py-2 rounded-lg">
              <TrendingDown size={12} />
              Budget exceeded — review your expenses
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

function TransactionRow({ t, onDelete }: { t: Transaction; onDelete: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="flex items-center gap-3 py-3 px-4 hover:bg-stone-50 rounded-xl transition-colors group">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
        t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'
      }`}>
        {CATEGORY_ICONS[t.category]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-900 truncate">{t.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <CategoryBadge category={t.category} />
          <span className="text-xs text-stone-400">{fmtDate(t.date)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-stone-900'}`}>
          {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
        </span>
        {confirm ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(t.id)}
              className="text-xs text-rose-500 hover:text-rose-700 font-medium px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 text-stone-300 transition-all"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadFromStorage(STORAGE_KEYS.transactions, [])
  )
  const [budget, setBudget] = useState<Budget>(() =>
    loadFromStorage(STORAGE_KEYS.budget, { limit: 0, month: currentMonth() })
  )
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all')
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all')

  // Persist
  useEffect(() => saveToStorage(STORAGE_KEYS.transactions, transactions), [transactions])
  useEffect(() => saveToStorage(STORAGE_KEYS.budget, budget), [budget])

  // Derived stats
  const totalIncome = useMemo(
    () => transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [transactions]
  )
  const totalExpenses = useMemo(
    () => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [transactions]
  )
  const balance = totalIncome - totalExpenses

  const thisMonth = currentMonth()
  const monthlyExpenses = useMemo(
    () => transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(thisMonth))
      .reduce((s, t) => s + t.amount, 0),
    [transactions]
  )

  // All unique categories in current transactions for filter
  const usedCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category))
    return Array.from(cats) as Category[]
  }, [transactions])

  // Filtered + searched transactions
  const filtered = useMemo(() => {
    return transactions
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
  }, [transactions, filterType, filterCategory, search])

  const addTransaction = useCallback((data: Omit<Transaction, 'id' | 'createdAt'>) => {
    const t: Transaction = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    setTransactions(prev => [t, ...prev])
  }, [])

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
  }, [])

  const updateBudget = useCallback((limit: number) => {
    setBudget({ limit, month: currentMonth() })
  }, [])

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-stone-900 rounded-lg flex items-center justify-center">
              <Wallet size={14} className="text-white" />
            </div>
            <span className="font-semibold text-stone-900 text-sm tracking-tight">FinanceTracker</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-stone-900 text-white text-sm font-medium px-3.5 py-2 rounded-xl hover:bg-stone-800 transition-colors"
          >
            <Plus size={15} />
            Add
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCard label="Net Balance" amount={balance} icon={<Wallet size={16} />} variant="neutral" />
          <SummaryCard label="Total Income" amount={totalIncome} icon={<TrendingUp size={16} />} variant="income" />
          <SummaryCard label="Total Expenses" amount={totalExpenses} icon={<TrendingDown size={16} />} variant="expense" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Transactions */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search & Filter Bar */}
            <div className="bg-white rounded-2xl border border-stone-100 p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search transactions…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent bg-stone-50"
                  />
                </div>
                <div className="flex gap-2">
                  {/* Type filter */}
                  <div className="relative">
                    <select
                      value={filterType}
                      onChange={e => setFilterType(e.target.value as typeof filterType)}
                      className="appearance-none pl-3 pr-8 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50 text-stone-700"
                    >
                      <option value="all">All types</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                  {/* Category filter */}
                  <div className="relative">
                    <select
                      value={filterCategory}
                      onChange={e => setFilterCategory(e.target.value as Category | 'all')}
                      className="appearance-none pl-3 pr-8 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 bg-stone-50 text-stone-700"
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
            <div className="bg-white rounded-2xl border border-stone-100">
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-stone-700">Transactions</span>
                <span className="text-xs text-stone-400">{filtered.length} entries</span>
              </div>
              <div className="divide-y divide-stone-50 px-2 pb-2 max-h-[520px] overflow-y-auto scrollbar-thin">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
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
                    <TransactionRow key={t.id} t={t} onDelete={deleteTransaction} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Budget + Categories */}
          <div className="space-y-4">
            <BudgetPanel
              budget={budget}
              monthlyExpenses={monthlyExpenses}
              onUpdate={updateBudget}
            />
            <CategoryBreakdown transactions={transactions} />
          </div>
        </div>
      </main>

      {showModal && (
        <AddTransactionModal onClose={() => setShowModal(false)} onAdd={addTransaction} />
      )}
    </div>
  )
}
