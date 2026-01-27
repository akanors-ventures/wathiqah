import { cn } from "@/lib/utils";

export function AppLogo({
  className,
  strokeWidth = 2.5,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className)}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m11.996304 11.334728 1.622389 1.62239 3.24478-3.2447795" />
      <path d="M11.949088 11.388432 10.326702 13.010822 7.0819243 9.7660435" />
    </svg>
  );
}
