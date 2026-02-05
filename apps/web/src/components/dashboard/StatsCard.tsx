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
}

export function StatsCard({
  title,
  value,
  icon,
  description,
  link,
  extra,
  className,
}: StatsCardProps) {
  const content = (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-primary/40 border-border/50 rounded-[24px] bg-card",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 p-5">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors">
            {title}
          </CardTitle>
          {extra}
        </div>
        <div className="p-2.5 rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:shadow-primary/20 group-hover:-rotate-6">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-0 p-5">
        <div className="text-2xl font-bold tracking-tight mb-1 group-hover:scale-[1.02] transition-transform origin-left duration-500">
          {value}
        </div>
        <p className="text-[11px] text-muted-foreground font-medium opacity-70 group-hover:text-foreground/70 transition-colors">
          {description}
        </p>
      </CardContent>

      {/* Decorative background element */}
      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
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
