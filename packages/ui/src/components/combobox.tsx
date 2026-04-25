import { Command } from 'cmdk';
import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '../lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  sub?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  clearLabel?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = '—',
  searchPlaceholder,
  emptyLabel = 'אין תוצאות',
  clearLabel,
  disabled,
  id,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          aria-expanded={open}
          className={cn(
            'justify-between gap-2 font-normal w-full',
            !selected && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] min-w-[12rem]"
        align="start"
      >
        <Command className="bg-transparent">
          {searchPlaceholder && (
            <Command.Input
              placeholder={searchPlaceholder}
              className="flex h-9 w-full bg-transparent px-3 text-sm focus:outline-none placeholder:text-muted-foreground border-b"
            />
          )}
          <Command.List className="max-h-60 overflow-y-auto p-1">
            <Command.Empty className="py-4 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </Command.Empty>
            {clearLabel && selected && (
              <>
                <Command.Item
                  value="__clear__"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 rounded-sm px-2 py-1.5 text-xs cursor-pointer aria-selected:bg-muted text-muted-foreground"
                >
                  {clearLabel}
                </Command.Item>
                <div className="-mx-1 my-1 h-px bg-border" />
              </>
            )}
            {options.map((opt) => (
              <Command.Item
                key={opt.value}
                value={`${opt.label} ${opt.sub ?? ''} ${opt.value}`}
                onSelect={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-muted"
              >
                <Check
                  className={cn(
                    'h-4 w-4 shrink-0',
                    opt.value === value ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{opt.label}</div>
                  {opt.sub && (
                    <div className="text-xs text-muted-foreground truncate">{opt.sub}</div>
                  )}
                </div>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
