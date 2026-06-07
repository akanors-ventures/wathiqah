import { differenceInDays, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrgEvent } from "@/types/__generated__/graphql";

const CATEGORY_STYLES: Record<string, string> = {
  "Islamic Calendar": "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
  Breeding: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
  Vaccination: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
  Regulatory: "bg-violet-50 border-violet-200 dark:bg-violet-950 dark:border-violet-800",
  Commercial: "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800",
};

function getCategoryStyle(category: string): string {
  return (
    CATEGORY_STYLES[category] ??
    "bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700"
  );
}

interface EventCardProps {
  event: OrgEvent;
  onEdit?: (event: OrgEvent) => void;
}

export function EventCard({ event, onEdit }: EventCardProps) {
  const eventDate = new Date(event.date);
  const daysUntil = differenceInDays(eventDate, new Date());

  return (
    <button
      type="button"
      className={cn(
        "w-full text-left flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-150 hover:shadow-sm",
        getCategoryStyle(event.category),
      )}
      onClick={() => onEdit?.(event)}
    >
      {/* Date box */}
      <div className="flex-shrink-0 w-10 text-center bg-white dark:bg-slate-900 rounded-lg border border-white/60 dark:border-slate-700 py-1.5">
        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
          {format(eventDate, "MMM")}
        </p>
        <p className="text-lg font-black leading-tight">{format(eventDate, "d")}</p>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold">{event.title}</p>
        {event.notes && (
          <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">{event.notes}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wide h-5">
            {event.category}
          </Badge>
          {event.isRecurring && (
            <span className="text-[10px] text-muted-foreground">↻ {event.recurrence}</span>
          )}
        </div>
      </div>

      {/* Countdown */}
      <div className="flex-shrink-0 text-right">
        <span
          className={cn(
            "text-[12px] font-bold",
            daysUntil < 0
              ? "text-muted-foreground"
              : daysUntil <= 7
                ? "text-red-500"
                : daysUntil <= 30
                  ? "text-amber-600"
                  : "text-muted-foreground",
          )}
        >
          {daysUntil === 0
            ? "Today"
            : daysUntil < 0
              ? "Past"
              : daysUntil === 1
                ? "Tomorrow"
                : `${daysUntil}d`}
        </span>
      </div>
    </button>
  );
}
