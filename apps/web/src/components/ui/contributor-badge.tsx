import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

interface ContributorBadgeProps {
  className?: string;
  showIcon?: boolean;
}

export function ContributorBadge({ className, showIcon = true }: ContributorBadgeProps) {
  return (
    <Badge
      className={cn(
        "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800 hover:bg-pink-200 dark:hover:bg-pink-900/50 px-2 py-0.5 gap-1 font-bold text-[10px] shadow-sm animate-in fade-in zoom-in duration-500",
        className,
      )}
      variant="outline"
    >
      {showIcon && <Heart className="w-3 h-3 fill-current" />}
      SUPPORTER
    </Badge>
  );
}
