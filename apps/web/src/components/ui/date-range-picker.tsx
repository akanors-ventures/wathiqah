import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";

interface DateRange {
  from: string | null;
  to: string | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleFromChange = (from: string) => {
    if (value.to && from > value.to) {
      setError("Start date must be before end date");
      return;
    }
    setError(null);
    onChange({ ...value, from: from || null });
  };

  const handleToChange = (to: string) => {
    if (value.from && to < value.from) {
      setError("End date must be after start date");
      return;
    }
    setError(null);
    onChange({ ...value, to: to || null });
  };

  const handleClear = () => {
    setError(null);
    onChange({ from: null, to: null });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground shrink-0 w-7">From</Label>
          <DatePicker
            value={value.from ?? ""}
            max={value.to ?? undefined}
            onChange={handleFromChange}
            className="h-8 flex-1 min-w-0 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground shrink-0 w-7">To</Label>
          <DatePicker
            value={value.to ?? ""}
            min={value.from ?? undefined}
            onChange={handleToChange}
            className="h-8 flex-1 min-w-0 text-xs"
          />
          {(value.from || value.to) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleClear}
              aria-label="Clear date range"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
