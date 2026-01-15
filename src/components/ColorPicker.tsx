import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

// Predefined color palette with HSL values
const colorPalette = [
  { name: 'Vermelho', hsl: '0 84% 60%', hex: '#ef4444' },
  { name: 'Rosa', hsl: '330 81% 60%', hex: '#ec4899' },
  { name: 'Roxo', hsl: '270 76% 60%', hex: '#a855f7' },
  { name: 'Azul', hsl: '217 91% 60%', hex: '#3b82f6' },
  { name: 'Ciano', hsl: '189 94% 43%', hex: '#06b6d4' },
  { name: 'Verde', hsl: '142 71% 45%', hex: '#22c55e' },
  { name: 'Lima', hsl: '84 81% 44%', hex: '#84cc16' },
  { name: 'Amarelo', hsl: '48 96% 53%', hex: '#eab308' },
  { name: 'Laranja', hsl: '25 95% 53%', hex: '#f97316' },
  { name: 'Marrom', hsl: '20 50% 40%', hex: '#a16207' },
  { name: 'Cinza', hsl: '220 9% 46%', hex: '#6b7280' },
  { name: 'Preto', hsl: '0 0% 15%', hex: '#262626' },
];

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedColor = colorPalette.find(c => c.hsl === value) || colorPalette[0];

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <div
              className="mr-2 h-4 w-4 rounded-full border"
              style={{ backgroundColor: selectedColor.hex }}
            />
            {selectedColor.name}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 bg-popover border-border" align="start">
          <div className="grid grid-cols-4 gap-2">
            {colorPalette.map((color) => (
              <button
                key={color.hsl}
                onClick={() => {
                  onChange(color.hsl);
                  setIsOpen(false);
                }}
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition-all hover:scale-110",
                  value === color.hsl ? "border-foreground ring-2 ring-foreground/20" : "border-transparent"
                )}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
