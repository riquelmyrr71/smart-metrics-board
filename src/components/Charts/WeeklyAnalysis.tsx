import React, { useRef, useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Calendar, Diamond, Users, Loader2, TrendingUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek, getDay, subWeeks, isWeekend, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts';

interface DailyEntry {
  id: string;
  date: string;
  diamonds: number;
  creators: number;
}

interface WeekData {
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  weekdays: DailyEntry[];
  weekends: DailyEntry[];
  totalDiamondsWeekdays: number;
  totalCreatorsWeekdays: number;
  totalDiamondsWeekend: number;
  totalCreatorsWeekend: number;
  avgDiamondsWeekdays: number;
  avgCreatorsWeekdays: number;
  avgDiamondsWeekend: number;
  avgCreatorsWeekend: number;
}

interface WeeklyAnalysisProps {
  entries: DailyEntry[];
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const WeeklyAnalysis: React.FC<WeeklyAnalysisProps> = ({ entries }) => {
  const weekdaysReportRef = useRef<HTMLDivElement>(null);
  const weekendsReportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Group entries by week
  const getWeeksData = useCallback((): WeekData[] => {
    if (entries.length === 0) return [];

    const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    const firstDate = parseISO(sortedEntries[0].date);
    const lastDate = parseISO(sortedEntries[sortedEntries.length - 1].date);

    const weeks: WeekData[] = [];
    let currentWeekStart = startOfWeek(firstDate, { weekStartsOn: 1 }); // Monday start

    while (currentWeekStart <= lastDate) {
      const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      
      const weekEntries = entries.filter(entry => {
        const entryDate = parseISO(entry.date);
        return entryDate >= currentWeekStart && entryDate <= currentWeekEnd;
      });

      const weekdays = weekEntries.filter(entry => {
        const dayOfWeek = getDay(parseISO(entry.date));
        return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
      });

      const weekends = weekEntries.filter(entry => {
        const dayOfWeek = getDay(parseISO(entry.date));
        return dayOfWeek === 0 || dayOfWeek === 6; // Saturday and Sunday
      });

      if (weekEntries.length > 0) {
        const totalDiamondsWeekdays = weekdays.reduce((sum, e) => sum + e.diamonds, 0);
        const totalCreatorsWeekdays = weekdays.reduce((sum, e) => sum + e.creators, 0);
        const totalDiamondsWeekend = weekends.reduce((sum, e) => sum + e.diamonds, 0);
        const totalCreatorsWeekend = weekends.reduce((sum, e) => sum + e.creators, 0);

        weeks.push({
          weekLabel: `Sem. ${format(currentWeekStart, 'dd/MM', { locale: ptBR })} - ${format(currentWeekEnd, 'dd/MM', { locale: ptBR })}`,
          weekStart: format(currentWeekStart, 'yyyy-MM-dd'),
          weekEnd: format(currentWeekEnd, 'yyyy-MM-dd'),
          weekdays,
          weekends,
          totalDiamondsWeekdays,
          totalCreatorsWeekdays,
          totalDiamondsWeekend,
          totalCreatorsWeekend,
          avgDiamondsWeekdays: weekdays.length > 0 ? totalDiamondsWeekdays / weekdays.length : 0,
          avgCreatorsWeekdays: weekdays.length > 0 ? totalCreatorsWeekdays / weekdays.length : 0,
          avgDiamondsWeekend: weekends.length > 0 ? totalDiamondsWeekend / weekends.length : 0,
          avgCreatorsWeekend: weekends.length > 0 ? totalCreatorsWeekend / weekends.length : 0,
        });
      }

      currentWeekStart = new Date(currentWeekStart);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return weeks.slice(-8); // Last 8 weeks
  }, [entries]);

  const weeksData = getWeeksData();

  // Chart data for weekdays consolidated
  const weekdaysChartData = weeksData.map(week => ({
    name: week.weekLabel,
    diamonds: week.totalDiamondsWeekdays,
    creators: week.totalCreatorsWeekdays,
    avgDiamonds: week.avgDiamondsWeekdays,
    avgCreators: week.avgCreatorsWeekdays,
  }));

  // Chart data for weekends consolidated
  const weekendsChartData = weeksData.map(week => ({
    name: week.weekLabel,
    diamonds: week.totalDiamondsWeekend,
    creators: week.totalCreatorsWeekend,
    avgDiamonds: week.avgDiamondsWeekend,
    avgCreators: week.avgCreatorsWeekend,
  }));

  // Individual days data for current week
  const getCurrentWeekDays = useCallback(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const days = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const entry = entries.find(e => e.date === dateStr);
      const dayOfWeek = getDay(date);
      
      days.push({
        date: dateStr,
        dayName: DAY_NAMES[dayOfWeek],
        fullDate: format(date, 'dd/MM', { locale: ptBR }),
        diamonds: entry?.diamonds || 0,
        creators: entry?.creators || 0,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    return days;
  }, [entries]);

  const currentWeekDays = getCurrentWeekDays();
  const weekdaysDays = currentWeekDays.filter(d => !d.isWeekend);
  const weekendDays = currentWeekDays.filter(d => d.isWeekend);

  // Totals for current week
  const currentWeekWeekdaysTotals = {
    diamonds: weekdaysDays.reduce((sum, d) => sum + d.diamonds, 0),
    creators: weekdaysDays.reduce((sum, d) => sum + d.creators, 0),
  };
  const currentWeekWeekendTotals = {
    diamonds: weekendDays.reduce((sum, d) => sum + d.diamonds, 0),
    creators: weekendDays.reduce((sum, d) => sum + d.creators, 0),
  };

  // Export functions
  const handleExport = useCallback(async (type: 'weekdays-consolidated' | 'weekdays-individual' | 'weekends-consolidated' | 'weekends-individual') => {
    setIsExporting(type);
    
    try {
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);
      
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;

      // Generate HTML content based on type
      const container = document.createElement('div');
      container.style.cssText = 'position: absolute; left: -9999px; top: 0; background: #fafafa; padding: 32px; width: 800px;';
      
      let title = '';
      let content = '';

      if (type === 'weekdays-consolidated') {
        title = 'Análise Consolidada - Dias Úteis (Seg-Sex)';
        content = weeksData.map(week => `
          <div style="margin-bottom: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #b91c1c;">
            <h3 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 16px;">${week.weekLabel}</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
              <div>
                <p style="margin: 0; color: #525252; font-size: 12px;">💎 Diamantes</p>
                <p style="margin: 4px 0 0 0; color: #b91c1c; font-size: 20px; font-weight: bold;">${week.totalDiamondsWeekdays.toLocaleString('pt-BR')}</p>
                <p style="margin: 0; color: #737373; font-size: 11px;">Média: ${week.avgDiamondsWeekdays.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/dia</p>
              </div>
              <div>
                <p style="margin: 0; color: #525252; font-size: 12px;">👥 Criadores</p>
                <p style="margin: 4px 0 0 0; color: #374151; font-size: 20px; font-weight: bold;">${week.totalCreatorsWeekdays.toLocaleString('pt-BR')}</p>
                <p style="margin: 0; color: #737373; font-size: 11px;">Média: ${week.avgCreatorsWeekdays.toFixed(1)}/dia</p>
              </div>
            </div>
          </div>
        `).join('');
      } else if (type === 'weekdays-individual') {
        title = 'Análise Individual - Dias Úteis da Semana Atual';
        content = weekdaysDays.map(day => `
          <div style="display: inline-block; width: 18%; margin: 1%; padding: 16px; background: #f5f5f5; border-radius: 8px; text-align: center; vertical-align: top;">
            <p style="margin: 0; color: #525252; font-size: 14px; font-weight: bold;">${day.dayName}</p>
            <p style="margin: 4px 0 8px 0; color: #737373; font-size: 12px;">${day.fullDate}</p>
            <div style="border-top: 1px solid #e5e5e5; padding-top: 8px;">
              <p style="margin: 0; color: #b91c1c; font-size: 18px; font-weight: bold;">💎 ${day.diamonds.toLocaleString('pt-BR')}</p>
              <p style="margin: 4px 0 0 0; color: #374151; font-size: 16px;">👥 ${day.creators}</p>
            </div>
          </div>
        `).join('');
        content += `
          <div style="margin-top: 24px; padding: 16px; background: #fecaca; border-radius: 8px;">
            <h4 style="margin: 0 0 8px 0; color: #1a1a1a;">Total da Semana (Dias Úteis)</h4>
            <p style="margin: 0; font-size: 18px;"><strong style="color: #b91c1c;">💎 ${currentWeekWeekdaysTotals.diamonds.toLocaleString('pt-BR')}</strong> diamantes | <strong style="color: #374151;">👥 ${currentWeekWeekdaysTotals.creators}</strong> criadores</p>
          </div>
        `;
      } else if (type === 'weekends-consolidated') {
        title = 'Análise Consolidada - Finais de Semana (Sáb-Dom)';
        content = weeksData.map(week => `
          <div style="margin-bottom: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #374151;">
            <h3 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 16px;">${week.weekLabel}</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
              <div>
                <p style="margin: 0; color: #525252; font-size: 12px;">💎 Diamantes</p>
                <p style="margin: 4px 0 0 0; color: #b91c1c; font-size: 20px; font-weight: bold;">${week.totalDiamondsWeekend.toLocaleString('pt-BR')}</p>
                <p style="margin: 0; color: #737373; font-size: 11px;">Média: ${week.avgDiamondsWeekend.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}/dia</p>
              </div>
              <div>
                <p style="margin: 0; color: #525252; font-size: 12px;">👥 Criadores</p>
                <p style="margin: 4px 0 0 0; color: #374151; font-size: 20px; font-weight: bold;">${week.totalCreatorsWeekend.toLocaleString('pt-BR')}</p>
                <p style="margin: 0; color: #737373; font-size: 11px;">Média: ${week.avgCreatorsWeekend.toFixed(1)}/dia</p>
              </div>
            </div>
          </div>
        `).join('');
      } else {
        title = 'Análise Individual - Finais de Semana da Semana Atual';
        content = weekendDays.map(day => `
          <div style="display: inline-block; width: 45%; margin: 2%; padding: 24px; background: #f5f5f5; border-radius: 8px; text-align: center; vertical-align: top;">
            <p style="margin: 0; color: #525252; font-size: 16px; font-weight: bold;">${day.dayName}</p>
            <p style="margin: 4px 0 12px 0; color: #737373; font-size: 14px;">${day.fullDate}</p>
            <div style="border-top: 1px solid #e5e5e5; padding-top: 12px;">
              <p style="margin: 0; color: #b91c1c; font-size: 24px; font-weight: bold;">💎 ${day.diamonds.toLocaleString('pt-BR')}</p>
              <p style="margin: 8px 0 0 0; color: #374151; font-size: 20px;">👥 ${day.creators}</p>
            </div>
          </div>
        `).join('');
        content += `
          <div style="margin-top: 24px; padding: 16px; background: #e5e5e5; border-radius: 8px;">
            <h4 style="margin: 0 0 8px 0; color: #1a1a1a;">Total do Fim de Semana</h4>
            <p style="margin: 0; font-size: 18px;"><strong style="color: #b91c1c;">💎 ${currentWeekWeekendTotals.diamonds.toLocaleString('pt-BR')}</strong> diamantes | <strong style="color: #374151;">👥 ${currentWeekWeekendTotals.creators}</strong> criadores</p>
          </div>
        `;
      }

      container.innerHTML = `
        <div style="font-family: system-ui, -apple-system, sans-serif;">
          <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #b91c1c;">
            <h1 style="margin: 0; color: #1a1a1a; font-size: 24px;">${title}</h1>
            <p style="margin: 8px 0 0 0; color: #737373; font-size: 14px;">Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
          ${content}
        </div>
      `;

      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#fafafa',
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`analise-${type}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    } catch (error) {
      console.error('Erro ao exportar:', error);
    } finally {
      setIsExporting(null);
    }
  }, [weeksData, weekdaysDays, weekendDays, currentWeekWeekdaysTotals, currentWeekWeekendTotals]);

  if (weeksData.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Adicione entradas para ver a análise semanal</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekdays Analysis Card */}
      <Card className="border-destructive/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-destructive" />
                Análise Dias Úteis (Seg - Sex)
              </CardTitle>
              <CardDescription>Estimativas semana a semana para dias úteis</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('weekdays-consolidated')}
                disabled={isExporting !== null}
                className="gap-2"
              >
                {isExporting === 'weekdays-consolidated' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Consolidado
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('weekdays-individual')}
                disabled={isExporting !== null}
                className="gap-2"
              >
                {isExporting === 'weekdays-individual' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Individual
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Week Individual Days */}
          <div className="grid grid-cols-5 gap-2">
            {weekdaysDays.map((day) => (
              <div
                key={day.date}
                className="text-center p-4 rounded-lg bg-muted/30 border border-border"
              >
                <p className="text-sm font-medium text-muted-foreground">{day.dayName}</p>
                <p className="text-xs text-muted-foreground/70 mb-2">{day.fullDate}</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <Diamond className="w-3 h-3 text-destructive" />
                    <span className="text-sm font-bold text-destructive">
                      {day.diamonds >= 1000 ? (day.diamonds / 1000).toFixed(1) + 'k' : day.diamonds}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-bold">{day.creators}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Weekdays Totals */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Semana (Dias Úteis)</p>
              <p className="text-2xl font-bold text-destructive flex items-center justify-center gap-2">
                <Diamond className="w-5 h-5" />
                {currentWeekWeekdaysTotals.diamonds.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Criadores</p>
              <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                {currentWeekWeekdaysTotals.creators}
              </p>
            </div>
          </div>

          {/* Weekly Comparison Chart */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weekdaysChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={60} />
                <YAxis yAxisId="diamonds" orientation="left" fontSize={10} stroke="#dc2626" tickFormatter={(v) => (v/1000).toFixed(0) + 'k'} />
                <YAxis yAxisId="creators" orientation="right" fontSize={10} stroke="#374151" />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    value.toLocaleString('pt-BR'), 
                    name === 'diamonds' ? 'Diamantes' : 'Criadores'
                  ]}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar yAxisId="diamonds" dataKey="diamonds" fill="#dc2626" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Line yAxisId="creators" type="monotone" dataKey="creators" stroke="#374151" strokeWidth={2} dot={{ fill: '#374151' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Weekends Analysis Card */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-foreground" />
                Análise Finais de Semana (Sáb - Dom)
              </CardTitle>
              <CardDescription>Performance nos finais de semana</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('weekends-consolidated')}
                disabled={isExporting !== null}
                className="gap-2"
              >
                {isExporting === 'weekends-consolidated' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Consolidado
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('weekends-individual')}
                disabled={isExporting !== null}
                className="gap-2"
              >
                {isExporting === 'weekends-individual' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Individual
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Week Weekend Days */}
          <div className="grid grid-cols-2 gap-4">
            {weekendDays.map((day) => (
              <div
                key={day.date}
                className="text-center p-6 rounded-lg bg-muted/30 border border-border"
              >
                <p className="text-lg font-medium text-muted-foreground">{day.dayName}</p>
                <p className="text-sm text-muted-foreground/70 mb-3">{day.fullDate}</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Diamond className="w-4 h-4 text-destructive" />
                    <span className="text-xl font-bold text-destructive">
                      {day.diamonds.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-lg font-bold">{day.creators}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Weekend Totals */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30 border border-border">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Fim de Semana</p>
              <p className="text-2xl font-bold text-destructive flex items-center justify-center gap-2">
                <Diamond className="w-5 h-5" />
                {currentWeekWeekendTotals.diamonds.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Criadores</p>
              <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                {currentWeekWeekendTotals.creators}
              </p>
            </div>
          </div>

          {/* Weekend Weekly Comparison Chart */}
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weekendsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={10} stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={60} />
                <YAxis yAxisId="diamonds" orientation="left" fontSize={10} stroke="#dc2626" tickFormatter={(v) => (v/1000).toFixed(0) + 'k'} />
                <YAxis yAxisId="creators" orientation="right" fontSize={10} stroke="#374151" />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    value.toLocaleString('pt-BR'), 
                    name === 'diamonds' ? 'Diamantes' : 'Criadores'
                  ]}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar yAxisId="diamonds" dataKey="diamonds" fill="#991b1b" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Line yAxisId="creators" type="monotone" dataKey="creators" stroke="#374151" strokeWidth={2} dot={{ fill: '#374151' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-border">
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground mb-1">Média Semanal (Dias Úteis)</p>
              <p className="text-lg font-bold text-destructive">
                {weeksData.length > 0 
                  ? Math.round(weeksData.reduce((s, w) => s + w.totalDiamondsWeekdays, 0) / weeksData.length).toLocaleString('pt-BR')
                  : 0}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground mb-1">Média Semanal (Fim Sem.)</p>
              <p className="text-lg font-bold text-destructive">
                {weeksData.length > 0 
                  ? Math.round(weeksData.reduce((s, w) => s + w.totalDiamondsWeekend, 0) / weeksData.length).toLocaleString('pt-BR')
                  : 0}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground mb-1">Melhor Semana (Dias Úteis)</p>
              <p className="text-lg font-bold text-destructive">
                {Math.max(...weeksData.map(w => w.totalDiamondsWeekdays)).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground mb-1">Melhor Fim Semana</p>
              <p className="text-lg font-bold text-destructive">
                {Math.max(...weeksData.map(w => w.totalDiamondsWeekend)).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
