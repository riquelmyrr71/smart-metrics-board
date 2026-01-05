import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, startOfMonth, subMonths, addMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthSelectorProps {
  selectedMonth: Date;
  onMonthChange: (month: Date) => void;
  availableMonths?: Date[];
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonth,
  onMonthChange,
  availableMonths,
}) => {
  const now = new Date();
  const isCurrentMonth = isSameMonth(selectedMonth, now);

  // Generate last 12 months for the dropdown
  const months = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < 12; i++) {
      result.push(startOfMonth(subMonths(now, i)));
    }
    return result;
  }, []);

  const handlePreviousMonth = () => {
    onMonthChange(startOfMonth(subMonths(selectedMonth, 1)));
  };

  const handleNextMonth = () => {
    const nextMonth = startOfMonth(addMonths(selectedMonth, 1));
    if (nextMonth <= now) {
      onMonthChange(nextMonth);
    }
  };

  const canGoNext = !isSameMonth(selectedMonth, now);

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 border border-border">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handlePreviousMonth}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <Select
        value={format(selectedMonth, 'yyyy-MM')}
        onValueChange={(value) => {
          const [year, month] = value.split('-').map(Number);
          onMonthChange(new Date(year, month - 1, 1));
        }}
      >
        <SelectTrigger className="w-[180px] h-9 border-0 bg-transparent font-medium">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem
              key={format(month, 'yyyy-MM')}
              value={format(month, 'yyyy-MM')}
            >
              <span className="capitalize">
                {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
              </span>
              {isSameMonth(month, now) && (
                <span className="ml-2 text-xs text-primary">(Atual)</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleNextMonth}
        disabled={!canGoNext}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      {!isCurrentMonth && (
        <Button
          variant="outline"
          size="sm"
          className="ml-2 text-xs h-7"
          onClick={() => onMonthChange(startOfMonth(now))}
        >
          Mês Atual
        </Button>
      )}
    </div>
  );
};
