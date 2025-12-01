import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PeriodSettings as PeriodSettingsType, getDaysElapsed, getTotalDays, getPeriodProgress } from '@/lib/projectionCalculator';
import { cn } from '@/lib/utils';

interface PeriodSettingsProps {
  settings: PeriodSettingsType;
  onSettingsChange: (settings: Partial<PeriodSettingsType>) => void;
}

export const PeriodSettingsPanel: React.FC<PeriodSettingsProps> = ({
  settings,
  onSettingsChange,
}) => {
  const daysElapsed = getDaysElapsed(settings);
  const totalDays = getTotalDays(settings);
  const progressPercent = getPeriodProgress(settings) * 100;
  const daysRemaining = totalDays - daysElapsed;

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Período de Apuração</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-4 h-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>
                As projeções são calculadas com base no progresso atual e nos dias restantes do período.
              </p>
              <p className="mt-1 text-xs">
                <strong>Fórmula:</strong> Projeção = (Atual ÷ Dias Decorridos) × Total de Dias
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Start Date */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Início:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal h-8",
                    !settings.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {format(settings.startDate, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={settings.startDate}
                  onSelect={(date) => date && onSettingsChange({ startDate: date })}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Fim:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal h-8",
                    !settings.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {format(settings.endDate, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={settings.endDate}
                  onSelect={(date) => date && onSettingsChange({ endDate: date })}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Current Date (for simulation) */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Hoje:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal h-8",
                    !settings.currentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {format(settings.currentDate, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={settings.currentDate}
                  onSelect={(date) => date && onSettingsChange({ currentDate: date })}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{daysElapsed} dias decorridos</span>
            <span>{daysRemaining} dias restantes</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="text-center text-xs text-muted-foreground mt-1">
            {progressPercent.toFixed(0)}% do período
          </div>
        </div>
      </div>
    </div>
  );
};
