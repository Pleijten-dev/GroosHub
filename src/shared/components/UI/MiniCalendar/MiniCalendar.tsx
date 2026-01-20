/**
 * MiniCalendar Component
 *
 * A compact monthly calendar view for displaying upcoming deadlines.
 * Used in the AI assistant sidebar for task deadline overview.
 *
 * Features:
 * - Monthly calendar grid
 * - Deadline indicators (dots)
 * - Today highlight
 * - Month navigation
 * - Clickable dates with deadline popover
 */

'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/shared/utils/cn';

// ============================================================================
// Types
// ============================================================================

export interface Deadline {
  id: string;
  date: Date | string;
  title: string;
  taskId: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface MiniCalendarProps {
  /** Array of deadlines to display */
  deadlines?: Deadline[];
  /** Called when a date is clicked */
  onDateClick?: (date: Date) => void;
  /** Called when a specific deadline is clicked */
  onDeadlineClick?: (taskId: string) => void;
  /** Current locale */
  locale?: 'nl' | 'en';
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Translations
// ============================================================================

const translations = {
  nl: {
    months: [
      'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
      'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
    ],
    days: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
    today: 'Vandaag',
    noDeadlines: 'Geen deadlines',
    deadlines: 'Deadlines',
  },
  en: {
    months: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    days: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    today: 'Today',
    noDeadlines: 'No deadlines',
    deadlines: 'Deadlines',
  },
};

// ============================================================================
// Helpers
// ============================================================================

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getMonthDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Get the day of week for the first day (0 = Sunday, adjust for Monday start)
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6; // Sunday becomes 6

  const days: Date[] = [];

  // Add previous month days
  for (let i = startOffset - 1; i >= 0; i--) {
    const prevDay = new Date(year, month, -i);
    days.push(prevDay);
  }

  // Add current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Add next month days to fill the grid (6 rows * 7 days = 42)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function getPriorityColor(priority?: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-primary';
  }
}

// ============================================================================
// Component
// ============================================================================

export function MiniCalendar({
  deadlines = [],
  onDateClick,
  onDeadlineClick,
  locale = 'nl',
  className,
}: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const t = translations[locale];
  const today = new Date();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calculate month days
  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  // Group deadlines by date
  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, Deadline[]>();

    deadlines.forEach((deadline) => {
      const date = deadline.date instanceof Date ? deadline.date : new Date(deadline.date);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(deadline);
    });

    return map;
  }, [deadlines]);

  // Get deadlines for selected date
  const selectedDeadlines = useMemo(() => {
    if (!selectedDate) return [];
    const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
    return deadlinesByDate.get(key) || [];
  }, [selectedDate, deadlinesByDate]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Date click handler
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateClick?.(date);
  };

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-base', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-sm">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={goToToday}
          className="text-sm font-medium text-gray-900 hover:text-primary transition-colors"
        >
          {t.months[month]} {year}
        </button>

        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1 rounded hover:bg-gray-100 transition-colors"
          aria-label="Next month"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {t.days.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px">
        {monthDays.map((date, index) => {
          const isCurrentMonth = date.getMonth() === month;
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const dateDeadlines = deadlinesByDate.get(dateKey) || [];
          const hasDeadlines = dateDeadlines.length > 0;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDateClick(date)}
              className={cn(
                'relative aspect-square flex flex-col items-center justify-center rounded text-xs transition-colors',
                isCurrentMonth ? 'text-gray-900' : 'text-gray-400',
                isToday && 'bg-primary text-white font-bold',
                isSelected && !isToday && 'bg-primary/10 text-primary',
                !isToday && !isSelected && 'hover:bg-gray-100'
              )}
            >
              <span>{date.getDate()}</span>

              {/* Deadline indicator */}
              {hasDeadlines && (
                <div className="absolute bottom-0.5 flex gap-px">
                  {dateDeadlines.slice(0, 3).map((d, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-1 h-1 rounded-full',
                        isToday ? 'bg-white' : getPriorityColor(d.priority)
                      )}
                    />
                  ))}
                  {dateDeadlines.length > 3 && (
                    <div className={cn(
                      'w-1 h-1 rounded-full',
                      isToday ? 'bg-white/60' : 'bg-gray-400'
                    )} />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date deadlines */}
      {selectedDate && (
        <div className="mt-sm pt-sm border-t border-gray-200">
          <div className="text-xs font-medium text-gray-500 mb-1">
            {isSameDay(selectedDate, today)
              ? t.today
              : `${selectedDate.getDate()} ${t.months[selectedDate.getMonth()]}`}
          </div>

          {selectedDeadlines.length > 0 ? (
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {selectedDeadlines.map((deadline) => (
                <button
                  key={deadline.id}
                  type="button"
                  onClick={() => onDeadlineClick?.(deadline.taskId)}
                  className="w-full text-left flex items-center gap-2 p-1 rounded hover:bg-gray-50 transition-colors"
                >
                  <div className={cn('w-2 h-2 rounded-full flex-shrink-0', getPriorityColor(deadline.priority))} />
                  <span className="text-xs text-gray-700 truncate">{deadline.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">{t.noDeadlines}</p>
          )}
        </div>
      )}
    </div>
  );
}

MiniCalendar.displayName = 'MiniCalendar';

export default MiniCalendar;
