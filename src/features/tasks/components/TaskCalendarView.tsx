'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/shared/components/UI/Button/Button';
import type { Task } from '../types';

export interface TaskCalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  locale: string;
}

export function TaskCalendarView({ tasks, onTaskClick, locale }: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const translations = {
    nl: {
      today: 'Vandaag',
      previous: 'Vorige',
      next: 'Volgende',
      noDeadline: 'Geen deadline',
      months: [
        'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
        'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
      ],
      weekdays: ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
    },
    en: {
      today: 'Today',
      previous: 'Previous',
      next: 'Next',
      noDeadline: 'No deadline',
      months: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ],
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.en;

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();

    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Group tasks by date
    const tasksByDate = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (task.deadline) {
        const date = new Date(task.deadline);
        if (date.getFullYear() === year && date.getMonth() === month) {
          const dateKey = date.getDate().toString();
          if (!tasksByDate.has(dateKey)) {
            tasksByDate.set(dateKey, []);
          }
          tasksByDate.get(dateKey)!.push(task);
        }
      }
    });

    return {
      year,
      month,
      daysInMonth,
      startingDayOfWeek,
      tasksByDate
    };
  }, [currentDate, tasks]);

  function goToPreviousMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function isToday(day: number): boolean {
    const today = new Date();
    return (
      day === today.getDate() &&
      calendarData.month === today.getMonth() &&
      calendarData.year === today.getFullYear()
    );
  }

  // Generate calendar cells
  const calendarCells: React.ReactNode[] = [];

  // Empty cells before first day
  for (let i = 0; i < calendarData.startingDayOfWeek; i++) {
    calendarCells.push(
      <div key={`empty-${i}`} className="min-h-[100px] bg-gray-50 border border-gray-200" />
    );
  }

  // Days of month
  for (let day = 1; day <= calendarData.daysInMonth; day++) {
    const dayTasks = calendarData.tasksByDate.get(day.toString()) || [];
    const isCurrentDay = isToday(day);

    calendarCells.push(
      <div
        key={`day-${day}`}
        className={`min-h-[100px] border border-gray-200 p-2 ${
          isCurrentDay ? 'border-primary' : 'bg-white'
        }`}
        style={isCurrentDay ? { background: 'linear-gradient(135deg, #96b068 0%, #a9bf79 100%)' } : undefined}
      >
        <div className={`text-sm font-medium mb-2 ${isCurrentDay ? 'text-white' : 'text-gray-700'}`}>
          {day}
        </div>
        <div className="space-y-1">
          {dayTasks.slice(0, 3).map(task => {
            const priorityColors = {
              urgent: 'bg-red-500',
              high: 'bg-orange-500',
              normal: 'bg-gray-400',
              low: 'bg-gray-300'
            };

            return (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="w-full text-left px-2 py-1 rounded text-xs truncate hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[task.priority]}`}
                  />
                  <span className="truncate">{task.title}</span>
                </div>
              </button>
            );
          })}
          {dayTasks.length > 3 && (
            <div className="text-xs text-gray-500 px-2">
              +{dayTasks.length - 3} more
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {t.months[calendarData.month]} {calendarData.year}
        </h3>
        <div className="flex gap-2">
          <Button onClick={goToPreviousMonth} variant="secondary" size="sm">
            {t.previous}
          </Button>
          <Button onClick={goToToday} variant="secondary" size="sm">
            {t.today}
          </Button>
          <Button onClick={goToNextMonth} variant="secondary" size="sm">
            {t.next}
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-gray-100">
          {t.weekdays.map((day, index) => (
            <div
              key={index}
              className="p-2 text-center text-sm font-medium text-gray-700 border-b border-gray-200"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {calendarCells}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>{locale === 'nl' ? 'Urgent' : 'Urgent'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span>{locale === 'nl' ? 'Hoog' : 'High'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span>{locale === 'nl' ? 'Normaal' : 'Normal'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <span>{locale === 'nl' ? 'Laag' : 'Low'}</span>
        </div>
      </div>
    </div>
  );
}

export default TaskCalendarView;
