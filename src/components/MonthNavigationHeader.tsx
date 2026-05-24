import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface MonthNavigationHeaderProps {
  selectedMonth: string
  onPreviousMonth: () => void
  onNextMonth: () => void
  onCurrentMonth: () => void
  getMonthDisplay: (month: string) => string
  isCurrentMonth: boolean
}

export function MonthNavigationHeader({
  selectedMonth,
  onPreviousMonth,
  onNextMonth,
  onCurrentMonth,
  getMonthDisplay,
  isCurrentMonth,
}: MonthNavigationHeaderProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-4 mb-6">
      <div className="flex items-center justify-center gap-4">
        {/* Previous Month Button */}
        <button
          onClick={onPreviousMonth}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors active:scale-95 text-stone-600 hover:text-stone-900"
          title="Previous month"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Month Display */}
        <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
          <Calendar size={16} className="text-stone-400 flex-shrink-0" />
          <div className="text-center flex-1">
            <div className="text-sm md:text-base font-semibold text-stone-900 truncate">
              {getMonthDisplay(selectedMonth)}
            </div>
            {!isCurrentMonth && (
              <button
                onClick={onCurrentMonth}
                className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline"
              >
                View current month
              </button>
            )}
          </div>
        </div>

        {/* Next Month Button */}
        <button
          onClick={onNextMonth}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors active:scale-95 text-stone-600 hover:text-stone-900"
          title="Next month"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}
