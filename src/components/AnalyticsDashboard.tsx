import React, { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Transaction } from '../App'

interface AnalyticsDashboardProps {
  transactions: Transaction[]
  selectedMonth: string
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  transactions,
  selectedMonth
}) => {
  // Color palette - muted slate, blue, emerald
  const COLORS = {
    primary: '#475569',    // slate-600
    accent: '#0ea5e9',     // sky-500
    success: '#10b981',    // emerald-500
    warning: '#f59e0b',    // amber-500
    danger: '#ef4444',     // red-500
    secondary: '#8b5cf6',  // violet-500
  }

  // Transform transactions to monthly spending trend (last 12 months)
  const monthlyTrendData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
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
      const monthTransactions = transactions.filter(t =>
        t.date.startsWith(monthStr) && t.type === 'expense'
      )
      
      const totalExpenses = monthTransactions.reduce((sum, t) => sum + t.amount, 0)
      
      data.push({
        month: monthNames[tempMonth - 1],
        fullMonth: monthStr,
        expenses: totalExpenses,
      })
    }
    
    return data
  }, [transactions, selectedMonth])

  // Category distribution for current month
  const categoryDistData = useMemo(() => {
    const categoryMap: Record<string, number> = {}
    
    transactions
      .filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense')
      .forEach(t => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount
      })
    
    return Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions, selectedMonth])

  // Daily breakdown for current month
  const dailyBreakdownData = useMemo(() => {
    const dayMap: Record<string, number> = {}
    
    transactions
      .filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense')
      .forEach(t => {
        const day = t.date.split('-')[2]
        dayMap[day] = (dayMap[day] || 0) + t.amount
      })
    
    return Object.entries(dayMap)
      .map(([day, amount]) => ({
        day: `${day}`,
        amount,
      }))
      .sort((a, b) => Number(a.day) - Number(b.day))
  }, [transactions, selectedMonth])

  // Summary stats
  const summaryStats = useMemo(() => {
    const monthTransactions = transactions.filter(t => t.date.startsWith(selectedMonth))
    
    // Top spending category
    const categoryMap: Record<string, number> = {}
    monthTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount
      })
    
    const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0]
    
    // Average transaction
    const expenses = monthTransactions.filter(t => t.type === 'expense')
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)
    const avgTransaction = expenses.length > 0 ? totalExpenses / expenses.length : 0
    
    // Highest spending day
    const dayMap: Record<string, number> = {}
    expenses.forEach(t => {
      const day = t.date.split('-')[2]
      dayMap[day] = (dayMap[day] || 0) + t.amount
    })
    
    const highestDay = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0]
    const highestDayStr = highestDay ? `${selectedMonth}-${String(highestDay[0]).padStart(2, '0')}` : 'N/A'
    const highestDayAmount = highestDay ? highestDay[1] : 0
    
    return {
      topCategory: topCategory[0],
      topCategoryAmount: topCategory[1],
      avgTransaction,
      highestDay: highestDayStr,
      highestDayAmount,
    }
  }, [transactions, selectedMonth])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
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
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                }}
                formatter={(value) => formatCurrency(value as number)}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke={COLORS.primary}
                dot={{ fill: COLORS.primary, r: 4 }}
                activeDot={{ r: 6 }}
                name="Expenses"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category Distribution - Pie Chart */}
        <ChartCard title="Category Distribution">
          {categoryDistData.length === 0 ? (
            <div className="h-300 flex items-center justify-center text-stone-400">
              No expense data for this month
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryDistData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                >
                  {categoryDistData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={Object.values(COLORS)[index % Object.values(COLORS).length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Daily Breakdown */}
      <ChartCard title="Daily Expenditure">
        {dailyBreakdownData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-stone-400">
            No expense data for this month
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyBreakdownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                }}
                formatter={(value) => formatCurrency(value as number)}
                labelFormatter={(label) => `Day ${label}`}
              />
              <Legend />
              <Bar
                dataKey="amount"
                fill={COLORS.accent}
                name="Daily Amount"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  )
}

// Helper component for summary stat cards
const SummaryStatCard: React.FC<{
  label: string
  value: string
  subtitle: string
  icon: string
  bgColor: string
  borderColor: string
  textColor: string
}> = ({ label, value, subtitle, icon, bgColor, borderColor, textColor }) => (
  <div className={`${bgColor} border ${borderColor} rounded-xl p-4`}>
    <div className="flex items-start gap-3">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-stone-600 mb-1">{label}</p>
        <p className={`text-lg md:text-xl font-semibold ${textColor} truncate`}>{value}</p>
        <p className="text-xs text-stone-500 mt-1">{subtitle}</p>
      </div>
    </div>
  </div>
)

// Helper component for chart containers
const ChartCard: React.FC<{
  title: string
  children: React.ReactNode
}> = ({ title, children }) => (
  <div className="bg-white border border-stone-100 rounded-2xl p-4 md:p-6">
    <h3 className="text-sm md:text-base font-semibold text-stone-900 mb-4">{title}</h3>
    {children}
  </div>
)
