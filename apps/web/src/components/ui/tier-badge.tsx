import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sparkles, ShieldCheck } from "lucide-react";

interface TierBadgeProps {
  tier?: string;
  className?: string;
  showIcon?: boolean;
}

export function TierBadge({ tier, className, showIcon = true }: TierBadgeProps) {
  const isPro = tier === "PRO";

  if (isPro) {
    return (
      <Badge
        className={cn(
          "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-none px-3 py-1 gap-1.5 font-black uppercase tracking-widest text-[10px] shadow-sm animate-in fade-in zoom-in duration-500",
          className,
        )}
      >
        {showIcon && <Sparkles className="w-3 h-3" />}
        PRO
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        "bg-muted text-muted-foreground border-border px-3 py-1 gap-1.5 font-black uppercase tracking-widest text-[10px]",
        className,
      )}
    >
      {showIcon && <ShieldCheck className="w-3 h-3" />}
      BASIC
    </Badge>
  );
}
