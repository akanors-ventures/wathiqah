import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | React.ReactNode;
  icon: React.ReactNode;
  description: string;
  link?: string;
  extra?: React.ReactNode;
  className?: string;
  variant?: "default" | "primary";
}

export function StatsCard({
  title,
  value,
  icon,
  description,
  link,
  extra,
  className,
  variant = "default",
}: StatsCardProps) {
  const isPrimary = variant === "primary";

  const content = (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1 rounded-[20px] sm:rounded-[24px]",
        isPrimary
          ? "bg-primary/5 border-primary/10 hover:border-primary/30"
          : "bg-card border-border/50 hover:border-primary/40",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 relative z-10 p-4 sm:p-5">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle
              className={cn(
                "text-[10px] sm:text-[11px] font-bold transition-colors whitespace-nowrap uppercase tracking-wider truncate",
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
            "p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:-rotate-6",
            isPrimary
              ? "bg-primary text-primary-foreground group-hover:shadow-primary/20"
              : "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-primary/20",
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-0 p-4 sm:p-5">
        <div
          className={cn(
            "text-xl sm:text-2xl font-black tracking-tight mb-1 group-hover:scale-[1.02] transition-transform origin-left duration-500",
            isPrimary ? "text-primary" : "text-foreground",
          )}
        >
          {value}
        </div>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium opacity-70 group-hover:text-foreground/70 transition-colors">
          {description}
        </p>
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
