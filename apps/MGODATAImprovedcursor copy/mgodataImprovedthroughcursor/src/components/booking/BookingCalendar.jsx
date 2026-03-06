/**
 * Calendar month view for Book a Call scheduling.
 * Disables past dates and weekends. Uses existing Calendar (DayPicker) styling.
 * Uses local date parsing to avoid UTC timezone bugs that shift dates.
 */
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { addMonths, startOfMonth, endOfMonth, isBefore } from 'date-fns';
import { enUS } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

/** Parse YYYY-MM-DD as local date (avoids UTC midnight bug that shifts dates in western timezones). */
function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return undefined;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return undefined;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
}

function isPast(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isBefore(date, today);
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isDisabled(date) {
  return isPast(date) || isWeekend(date);
}

function BookingCalendar({
  selected,
  onSelect,
  className,
  fromMonth,
  toMonth,
  ...props
}) {
  const today = new Date();
  const defaultFrom = startOfMonth(today);
  const defaultTo = endOfMonth(addMonths(today, 3));

  const selectedDate = parseLocalDate(selected);
  const defaultMonth = selectedDate ?? today;

  return (
    <DayPicker
      mode="single"
      locale={enUS}
      weekStartsOn={0}
      defaultMonth={defaultMonth}
      selected={selectedDate}
      onSelect={(date) => {
        if (date) {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          onSelect(`${y}-${m}-${d}`);
        }
      }}
      disabled={isDisabled}
      fromMonth={fromMonth ?? defaultFrom}
      toMonth={toMonth ?? defaultTo}
      showOutsideDays={false}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 pb-3 relative items-center min-h-[2rem]',
        caption_label: 'text-base font-semibold text-slate-900',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-8 w-8 bg-white border-slate-200 p-0 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors'
        ),
        nav_button_previous: 'absolute left-0',
        nav_button_next: 'absolute right-0',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex w-full',
        head_cell: 'text-slate-500 rounded-md w-9 min-w-9 flex-shrink-0 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell: 'relative p-0 text-center text-sm w-9 min-w-9 flex-shrink-0',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal rounded-md transition-colors hover:bg-slate-100 hover:text-slate-900'
        ),
        day_selected: 'bg-green-600 text-white hover:bg-green-600 hover:text-white focus:bg-green-600 focus:text-white focus:ring-2 focus:ring-green-500 focus:ring-offset-1',
        day_today: 'bg-slate-100 text-slate-900 font-semibold ring-1 ring-slate-300 ring-inset',
        day_outside: 'text-slate-300 opacity-50',
        day_disabled: 'text-slate-300 opacity-40 cursor-not-allowed hover:bg-transparent',
        day_hidden: 'invisible',
      }}
      components={{
        IconLeft: ({ className: c, ...rest }) => (
          <ChevronLeft className={cn('h-4 w-4', c)} {...rest} />
        ),
        IconRight: ({ className: c, ...rest }) => (
          <ChevronRight className={cn('h-4 w-4', c)} {...rest} />
        ),
      }}
      {...props}
    />
  );
}

BookingCalendar.displayName = 'BookingCalendar';

export { BookingCalendar, isDisabled };
