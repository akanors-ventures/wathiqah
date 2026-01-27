import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppLogo } from "./app-logo";

interface BrandLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function BrandLoader({ className, size = "lg" }: BrandLoaderProps) {
  const sizeConfig = {
    sm: { outer: "h-6 w-6", inner: "h-2.5 w-2.5" }, // 24px
    md: { outer: "h-8 w-8", inner: "h-3.5 w-3.5" }, // 32px
    lg: { outer: "h-16 w-16", inner: "h-6 w-6" }, // 64px
  };

  const { outer, inner } = sizeConfig[size];

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <Loader2 className={cn("animate-spin text-primary/50", outer)} />
      <AppLogo className={cn("absolute animate-pulse text-primary", inner)} />
    </div>
  );
}

export function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-[50vh] w-full items-center justify-center", className)}>
      <BrandLoader size="lg" />
    </div>
  );
}
