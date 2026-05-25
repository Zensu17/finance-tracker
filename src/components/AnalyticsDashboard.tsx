import React, { useMemo, useState, useCallback, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Transaction } from '../App'

interface AnalyticsDashboardProps {
  transactions: Transaction[]
  selectedMonth: string
}

// Constants - memoized outside component
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const COLORS = {
  primary: '#475569',    // slate-600
  accent: '#3b82f6',     // blue-500 (cleaner, more monochromatic)
  success: '#10b981',    // emerald-500
  warning: '#f59e0b',    // amber-500
  danger: '#ef4444',     // red-500
  secondary: '#8b5cf6',  // violet-500
  bars: '#3b82f6',       // monochromatic bar color
}

// Memoized color array for pie segments
const PIE_COLORS = [
  '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'
]

const formatCompactAmount = (value: number): string => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return `${Math.round(value)}`
}

const getDynamicAxisWidth = (maxValue: number): number => {
  const textLength = formatCompactAmount(maxValue).length
  return Math.max(52, Math.min(90, textLength * 8 + 20))
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  transactions,
  selectedMonth
}) => {
  // Loading state for better UX
  const [isLoading, setIsLoading] = useState(true)

  // ─── OPTIMIZED: Single pass data transformation ───────────────────────────
  
  // Transform transactions to monthly spending trend (last 12 months)
  const monthlyTrendData = useMemo(() => {
    // Get current year/month from selectedMonth
    const [year, month] = selectedMonth.split('-').map(Number)
    
    // Create data for last 12 months
    const data = []
    let currentYear = year
    let currentMonth = month
    
    // Go back 12 months
    for (let i = 11; i >= 0; i--) {
      let tempMonth = currentMonth - i
      let tempYear = currentYear
      
      if (tempMonth <= 0) {
        tempMonth += 12
        tempYear -= 1
      }
      
      const monthStr = `${tempYear}-${String(tempMonth).padStart(2, '0')}`
      
      // Optimized: single pass with reduce
      const totalExpenses = transactions.reduce((sum, t) => {
        return t.date.startsWith(monthStr) && t.type === 'expense' ? sum + t.amount : sum
      }, 0)
      
      data.push({
        month: MONTH_NAMES[tempMonth - 1],
        fullMonth: monthStr,
        expenses: totalExpenses,
      })
    }
    
    return data
  }, [transactions, selectedMonth])

  // Category distribution for current month (OPTIMIZED: single pass)
  const categoryDistData = useMemo(() => {
    const categoryMap: Record<string, number> = {}
    
    // Single pass through transactions
    for (const t of transactions) {
      if (t.date.startsWith(selectedMonth) && t.type === 'expense') {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount
      }
    }
    
    return Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions, selectedMonth])

  // Daily breakdown for current month (OPTIMIZED: single pass)
  const dailyBreakdownData = useMemo(() => {
    const dayMap: Record<string, number> = {}
    
    // Single pass through transactions
    for (const t of transactions) {
      if (t.date.startsWith(selectedMonth) && t.type === 'expense') {
        const day = t.date.split('-')[2]
        dayMap[day] = (dayMap[day] || 0) + t.amount
      }
    }
    
    return Object.entries(dayMap)
      .map(([day, amount]) => ({
        day: `${day}`,
        amount,
      }))
      .sort((a, b) => Number(a.day) - Number(b.day))
  }, [transactions, selectedMonth])

  // Summary stats (OPTIMIZED: reuse category data)
  const summaryStats = useMemo(() => {
    if (categoryDistData.length === 0) {
      return {
        topCategory: 'N/A',
        topCategoryAmount: 0,
        avgTransaction: 0,
        highestDay: 'N/A',
        highestDayAmount: 0,
      }
    }

    const topCategory = categoryDistData[0] // Already sorted descending

    // Average transaction
    const monthExpenses = transactions.filter(t =>
      t.date.startsWith(selectedMonth) && t.type === 'expense'
    )
    const totalExpenses = monthExpenses.reduce((sum, t) => sum + t.amount, 0)
    const avgTransaction = monthExpenses.length > 0 ? totalExpenses / monthExpenses.length : 0

    // Highest spending day (from daily breakdown)
    const highestDayData = dailyBreakdownData.length > 0
      ? dailyBreakdownData.reduce((max, d) => d.amount > max.amount ? d : max)
      : null

    const highestDayStr = highestDayData
      ? `${selectedMonth}-${String(highestDayData.day).padStart(2, '0')}`
      : 'N/A'
    const highestDayAmount = highestDayData?.amount || 0

    return {
      topCategory: topCategory.name,
      topCategoryAmount: topCategory.value,
      avgTransaction,
      highestDay: highestDayStr,
      highestDayAmount,
    }
  }, [categoryDistData, dailyBreakdownData, transactions, selectedMonth])

  const categoryTotal = useMemo(
    () => categoryDistData.reduce((sum, item) => sum + item.value, 0),
    [categoryDistData]
  )

  const maxTrendValue = useMemo(
    () => monthlyTrendData.reduce((max, item) => Math.max(max, item.expenses), 0),
    [monthlyTrendData]
  )

  const maxDailyValue = useMemo(
    () => dailyBreakdownData.reduce((max, item) => Math.max(max, item.amount), 0),
    [dailyBreakdownData]
  )

  // Memoized formatter
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }, [])

  // Simulate loading state completion
  useEffect(() => {
    setIsLoading(false)
  }, [selectedMonth])

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton for summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-stone-100 rounded-xl p-4 h-28 animate-pulse" />
          ))}
        </div>
        {/* Loading skeleton for charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-stone-100 rounded-2xl p-6 h-80 animate-pulse" />
          <div className="bg-white border border-stone-100 rounded-2xl p-6 h-80 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryStatCard
          label="Top Spending Category"
          value={formatCurrency(summaryStats.topCategoryAmount)}
          subtitle={summaryStats.topCategory}
          icon="🏷️"
          bgColor="bg-slate-50"
          borderColor="border-slate-200"
          textColor="text-slate-900"
        />
        <SummaryStatCard
          label="Average Transaction"
          value={formatCurrency(summaryStats.avgTransaction)}
          subtitle="Per transaction"
          icon="📊"
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
          textColor="text-blue-900"
        />
        <SummaryStatCard
          label="Highest Spending Day"
          value={formatCurrency(summaryStats.highestDayAmount)}
          subtitle={summaryStats.highestDay !== 'N/A' ? `${summaryStats.highestDay}` : 'No data'}
          icon="📈"
          bgColor="bg-emerald-50"
          borderColor="border-emerald-200"
          textColor="text-emerald-900"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending Trend */}
        <ChartCard title="12-Month Spending Trend">
          <ResponsiveContainer width="100%" height={300} minWidth={280}>
            <LineChart data={monthlyTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} />
              <YAxis
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
                width={getDynamicAxisWidth(maxTrendValue)}
                tickFormatter={(value: number) => formatCompactAmount(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '10px',
                }}
                formatter={(value: any) => formatCurrency(value)}
                labelFormatter={(label: any) => `Month: ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke={COLORS.primary}
                dot={{ fill: COLORS.primary, r: 3 }}
                activeDot={{ r: 5 }}
                name="Expenses"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category Distribution - Donut Chart with Legend */}
        <ChartCard title="Category Distribution">
          {categoryDistData.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-stone-400">
              <p>No expense data for this month</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <ResponsiveContainer width="100%" height={250} minWidth={250}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={categoryDistData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={1}
                    dataKey="value"
                    labelLine={false}
                    label={({ x, y, percent, value }: any) => {
                      if (percent < 0.08) return null
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#1e293b"
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="text-[11px] font-semibold"
                        >
                          {formatCompactAmount(value)}
                        </text>
                      )
                    }}
                    isAnimationActive={false}
                  >
                    {categoryDistData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload || !payload.length) return null
                      const percent = categoryTotal > 0
                        ? ((payload[0].value / categoryTotal) * 100).toFixed(1)
                        : '0.0'
                      return (
                        <div className="bg-white border border-stone-200 rounded-lg p-2.5 shadow-lg">
                          <p className="text-xs font-medium text-stone-700">{payload[0].payload.name}</p>
                          <p className="text-sm font-semibold text-stone-900">{formatCurrency(payload[0].value)}</p>
                          <p className="text-xs text-stone-500">{percent}%</p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Detailed Legend with amounts */}
              <div className="space-y-1.5 px-2 max-h-40 overflow-y-auto">
                {categoryDistData.map((item, index) => {
                  const percent = categoryTotal > 0
                    ? ((item.value / categoryTotal) * 100).toFixed(1)
                    : '0.0'
                  return (
                    <div key={item.name} className="flex items-center justify-between gap-2 text-sm p-1.5 bg-stone-50 rounded">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-stone-700 font-medium truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 text-right">
                        <span className="text-stone-600 text-xs">({percent}%)</span>
                        <span className="text-stone-900 font-semibold whitespace-nowrap">{formatCurrency(item.value)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Daily Breakdown - Scrollable on mobile */}
      <ChartCard title="Daily Expenditure">
        {dailyBreakdownData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-stone-400">
            <p>No expense data for this month</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0 md:px-0">
            <div className="min-w-full px-4 md:px-0" style={{ minWidth: dailyBreakdownData.length > 20 ? '100%' : 'auto' }}>
              <ResponsiveContainer width="100%" height={300} minWidth={Math.max(280, dailyBreakdownData.length * 15)}>
                <BarChart data={dailyBreakdownData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#94a3b8"
                    style={{ fontSize: '11px' }}
                    interval={Math.ceil(dailyBreakdownData.length / 15) - 1}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    style={{ fontSize: '12px' }}
                    width={getDynamicAxisWidth(maxDailyValue)}
                    tickFormatter={(value: number) => formatCompactAmount(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '10px',
                    }}
                    formatter={(value: any) => formatCurrency(value)}
                    labelFormatter={(label: any) => `Day ${label}`}
                  />
                  <Bar
                    dataKey="amount"
                    fill={COLORS.bars}
                    name="Daily Amount"
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={false}
                    barSize={Math.max(8, Math.min(24, 400 / dailyBreakdownData.length))}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </ChartCard>
    </div>
  )
}

// Helper component for summary stat cards - memoized to prevent unnecessary re-renders
const SummaryStatCard = React.memo<{
  label: string
  value: string
  subtitle: string
  icon: string
  bgColor: string
  borderColor: string
  textColor: string
}>(({ label, value, subtitle, icon, bgColor, borderColor, textColor }) => (
  <div className={`${bgColor} border ${borderColor} rounded-xl p-4 shadow-sm`}>
    <div className="flex items-start gap-3">
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${textColor} truncate`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      </div>
    </div>
  </div>
))
SummaryStatCard.displayName = 'SummaryStatCard'

// Helper component for chart containers - memoized to prevent unnecessary re-renders
const ChartCard = React.memo<{
  title: string
  children: React.ReactNode
}>(({ title, children }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm">
    <h3 className="text-sm md:text-base font-semibold text-slate-900 mb-4">{title}</h3>
    {children}
  </div>
))
ChartCard.displayName = 'ChartCard'
