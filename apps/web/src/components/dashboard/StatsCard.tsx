import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | React.ReactNode;
  icon: React.ReactNode;
  description: string;
  descriptionSlot?: React.ReactNode;
  link?: string;
  extra?: React.ReactNode;
  className?: string;
  variant?: "default" | "primary";
  compact?: boolean;
}

export function StatsCard({
  title,
  value,
  icon,
  description,
  descriptionSlot,
  link,
  extra,
  className,
  variant = "default",
  compact = false,
}: StatsCardProps) {
  const isPrimary = variant === "primary";

  const content = (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.98] rounded-[20px] sm:rounded-[24px]",
        isPrimary
          ? "bg-primary/5 border-primary/10 hover:border-primary/30"
          : "bg-card border-border/50 hover:border-primary/40",
        className,
      )}
    >
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between space-y-0 relative z-10",
          compact ? "pb-1 p-3 sm:p-4" : "pb-1.5 sm:pb-2 p-4 sm:p-5",
        )}
      >
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle
              className={cn(
                "font-bold transition-colors uppercase leading-tight",
                compact
                  ? "text-[9px] tracking-wide truncate"
                  : "text-[10px] sm:text-[11px] tracking-wider line-clamp-2 break-words",
                isPrimary ? "text-primary/60" : "text-muted-foreground group-hover:text-primary",
              )}
            >
              {title}
            </CardTitle>
            {extra && <div className="flex-shrink-0">{extra}</div>}
          </div>
        </div>
        <div
          className={cn(
            "rounded-lg transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:-rotate-6 shrink-0",
            compact ? "p-1.5" : "p-2 sm:p-2.5 sm:rounded-xl",
            isPrimary
              ? "bg-primary text-primary-foreground group-hover:shadow-primary/20"
              : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-primary/20",
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className={cn("relative z-10 pt-0", compact ? "p-3 sm:p-4" : "p-4 sm:p-5")}>
        <div
          className={cn(
            "font-black tracking-tight mb-1 group-hover:scale-[1.02] transition-transform origin-left duration-500",
            compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
            isPrimary ? "text-primary" : "text-foreground",
          )}
        >
          {value}
        </div>
        <p
          className={cn(
            "text-muted-foreground font-medium opacity-70 group-hover:text-foreground/70 transition-colors",
            compact ? "text-[9px] line-clamp-1" : "text-[10px] sm:text-[11px]",
          )}
        >
          {description}
        </p>
        {descriptionSlot}
      </CardContent>

      {/* Decorative background element */}
      <div
        className={cn(
          "absolute -right-8 -bottom-8 w-32 h-32 rounded-full blur-3xl transition-colors duration-500",
          isPrimary
            ? "bg-primary/10 group-hover:bg-primary/20"
            : "bg-primary/5 group-hover:bg-primary/10",
        )}
      />
    </Card>
  );

  if (link) {
    return (
      <Link to={link} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
