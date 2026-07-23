import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDateOnly, parseDateOnly } from "@/lib/utils/dates";

export interface DatePickerProps
  extends Omit<React.ComponentProps<"button">, "value" | "onChange" | "onBlur" | "type"> {
  /** yyyy-MM-dd, matching the format a native `<input type="date">` used. */
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** yyyy-MM-dd — days before this are disabled. */
  min?: string;
  /** yyyy-MM-dd — days after this are disabled. */
  max?: string;
  placeholder?: string;
}

/**
 * Button-triggered calendar popover replacing native `<input type="date">`
 * everywhere in the app — the native control renders a different, often
 * clunky picker UI per browser/OS (especially fragmented on mobile), where
 * this renders identically and with proper touch targets on every device.
 *
 * Drop-in for the react-hook-form Controller pattern: `<DatePicker {...field} />`
 * works as-is since RHF's `field.onChange` accepts a raw value, not just an
 * event. For `register()`-based (uncontrolled) forms, wrap in a `Controller`
 * instead — this is a controlled component, it has no DOM value to register.
 */
export function DatePicker({
  value,
  onChange,
  onBlur,
  min,
  max,
  placeholder = "Pick a date",
  disabled,
  className,
  id,
  ref,
  ...buttonProps
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDateOnly(value);
  const minDate = parseDateOnly(min);
  const maxDate = parseDateOnly(max);

  const disabledMatchers = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onBlur?.();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          {...buttonProps}
          ref={ref}
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start gap-2 px-3 text-left text-sm font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
          <span className="truncate">
            {selected ? format(selected, "MMM d, yyyy") : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" collisionPadding={16}>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? maxDate ?? new Date()}
          onSelect={(date) => {
            onChange(formatDateOnly(date));
            setOpen(false);
          }}
          disabled={disabledMatchers.length > 0 ? disabledMatchers : undefined}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
