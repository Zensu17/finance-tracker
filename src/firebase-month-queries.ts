import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  QueryConstraint
} from 'firebase/firestore'
import { db } from './firebase'
import type { Transaction } from './App'

/**
 * Parse YYYY-MM format to month start date (YYYY-MM-01)
 */
function getMonthStartDate(monthStr: string): string {
  return `${monthStr}-01`
}

/**
 * Parse YYYY-MM format to month end date (YYYY-MM-31 or last day)
 */
function getMonthEndDate(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number)
  const date = new Date(year, month, 0) // 0 = last day of previous month
  return date.toISOString().slice(0, 10)
}

/**
 * Fetch transactions for a specific month from Firestore (server-side filtering)
 * 
 * USAGE:
 * const monthTransactions = await getTransactionsByMonth(userId, '2024-05')
 * 
 * @param userId - The user's ID
 * @param month - Month in YYYY-MM format (e.g., '2024-05')
 * @returns Array of transactions for that month
 */
export async function getTransactionsByMonth(
  userId: string,
  month: string
): Promise<Transaction[]> {
  try {
    const startDate = getMonthStartDate(month)
    const endDate = getMonthEndDate(month)

    const constraints: QueryConstraint[] = [
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc'),
    ]

    // Different path depending on your Firestore structure
    // Adjust path based on how you store transactions
    const q = query(
      collection(db, 'users', userId, 'transactions'),
      ...constraints
    )

    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as Omit<Transaction, 'id'>
      return {
        ...data,
        id: doc.id,
      }
    })
  } catch (error) {
    console.error(`Error fetching transactions for ${month}:`, error)
    return []
  }
}

/**
 * Fetch transactions for a custom date range from Firestore
 * 
 * USAGE:
 * const transactions = await getTransactionsByDateRange(
 *   userId, 
 *   '2024-01-01', 
 *   '2024-12-31'
 * )
 * 
 * @param userId - The user's ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of transactions in date range
 */
export async function getTransactionsByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  try {
    const q = query(
      collection(db, 'users', userId, 'transactions'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    )

    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as Omit<Transaction, 'id'>
      return {
        ...data,
        id: doc.id,
      }
    })
  } catch (error) {
    console.error(`Error fetching transactions from ${startDate} to ${endDate}:`, error)
    return []
  }
}

/**
 * Fetch only income transactions for a specific month
 */
export async function getMonthIncomeTransactions(
  userId: string,
  month: string
): Promise<Transaction[]> {
  try {
    const startDate = getMonthStartDate(month)
    const endDate = getMonthEndDate(month)

    const q = query(
      collection(db, 'users', userId, 'transactions'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      where('type', '==', 'income'),
      orderBy('date', 'desc')
    )

    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    } as Transaction))
  } catch (error) {
    console.error(`Error fetching income transactions for ${month}:`, error)
    return []
  }
}

/**
 * Fetch only expense transactions for a specific month
 */
export async function getMonthExpenseTransactions(
  userId: string,
  month: string
): Promise<Transaction[]> {
  try {
    const startDate = getMonthStartDate(month)
    const endDate = getMonthEndDate(month)

    const q = query(
      collection(db, 'users', userId, 'transactions'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      where('type', '==', 'expense'),
      orderBy('date', 'desc')
    )

    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    } as Transaction))
  } catch (error) {
    console.error(`Error fetching expense transactions for ${month}:`, error)
    return []
  }
}

/**
 * Fetch transactions for a specific category in a month
 */
export async function getMonthTransactionsByCategory(
  userId: string,
  month: string,
  category: string
): Promise<Transaction[]> {
  try {
    const startDate = getMonthStartDate(month)
    const endDate = getMonthEndDate(month)

    const q = query(
      collection(db, 'users', userId, 'transactions'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      where('category', '==', category),
      orderBy('date', 'desc')
    )

    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    } as Transaction))
  } catch (error) {
    console.error(`Error fetching ${category} transactions for ${month}:`, error)
    return []
  }
}

/**
 * Get summary stats for a month (total income, total expenses)
 * 
 * USAGE:
 * const stats = await getMonthStats(userId, '2024-05')
 * console.log(stats.totalIncome, stats.totalExpense)
 */
export async function getMonthStats(
  userId: string,
  month: string
): Promise<{
  totalIncome: number
  totalExpense: number
  transactionCount: number
}> {
  const transactions = await getTransactionsByMonth(userId, month)
  
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  
  return {
    totalIncome,
    totalExpense,
    transactionCount: transactions.length,
  }
}

/**
 * Get category breakdown for a specific month
 */
export async function getMonthCategoryBreakdown(
  userId: string,
  month: string,
  type: 'income' | 'expense' = 'expense'
): Promise<Record<string, number>> {
  const transactions = await getTransactionsByMonth(userId, month)
  
  const filtered = transactions.filter(t => t.type === type)
  const breakdown: Record<string, number> = {}
  
  for (const transaction of filtered) {
    breakdown[transaction.category] = (breakdown[transaction.category] ?? 0) + transaction.amount
  }
  
  return breakdown
}

/**
 * Fetch transactions by tag using array-contains
 *
 * USAGE:
 * const tagged = await getMonthTransactionsByTag(userId, '2024-05', '#urgent')
 */
export async function getMonthTransactionsByTag(
  userId: string,
  month: string,
  tag: string
): Promise<Transaction[]> {
  try {
    const startDate = getMonthStartDate(month)
    const endDate = getMonthEndDate(month)

    const normalizedTag = tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`

    const q = query(
      collection(db, 'users', userId, 'transactions'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      where('tags', 'array-contains', normalizedTag),
      orderBy('date', 'desc')
    )

    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    } as Transaction))
  } catch (error) {
    console.error(`Error fetching tagged transactions (${tag}) for ${month}:`, error)
    return []
  }
}

/**
 * IMPORTANT: Firestore Query Limitations
 * 
 * Note: To use the above queries, your Firestore collection must have
 * these composite indexes created (they'll be prompted automatically
 * when you first run the query, or create them in Firestore console):
 * 
 * 1. For date range queries:
 *    Collection: transactions
 *    Fields: date (Ascending), createdAt (Descending)
 * 
 * 2. For type + date range:
 *    Collection: transactions
 *    Fields: type (Ascending), date (Ascending)
 * 
 * 3. For category + date range:
 *    Collection: transactions
 *    Fields: category (Ascending), date (Ascending)
 * 
 * Firestore will auto-prompt to create these when needed.
 */

/**
 * EXAMPLE USAGE IN App.tsx WITH SERVER-SIDE FILTERING
 * 
 * const monthNav = useMonthNavigation()
 * const [monthlyTransactions, setMonthlyTransactions] = useState<Transaction[]>([])
 * 
 * useEffect(() => {
 *   if (!user) return
 *   
 *   // Load transactions for selected month from server
 *   const loadMonthData = async () => {
 *     const txns = await getTransactionsByMonth(user.uid, monthNav.selectedMonth)
 *     setMonthlyTransactions(txns)
 *   }
 *   
 *   loadMonthData()
 * }, [monthNav.selectedMonth, user])
 */
