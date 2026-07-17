import { ChevronLeft, ChevronRight } from "lucide-react";
import type * as React from "react";
import type { ChevronProps } from "react-day-picker";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CalendarChevron({
  orientation,
  className: chevronClassName,
  ...chevronProps
}: ChevronProps) {
  const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
  return <Icon className={cn("h-4 w-4", chevronClassName)} {...chevronProps} />;
}

/**
 * Wraps react-day-picker with this app's design tokens. Every day cell is a
 * real <button> (min touch target ~36px, comfortable on mobile) styled with
 * the same buttonVariants used everywhere else, so selected/today/outside
 * states read consistently with the rest of the UI in both themes.
 */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: cn(defaultClassNames.root, "w-fit"),
        // `relative` anchors nav's `absolute inset-x-0 top-0` to this box —
        // nav is rendered as months' child (a sibling of month, not nested
        // inside it), so without this nav positions relative to a further-up
        // ancestor and lands above month_caption instead of overlaying it.
        months: cn(defaultClassNames.months, "relative flex flex-col sm:flex-row gap-4"),
        month: cn(defaultClassNames.month, "flex flex-col gap-4"),
        // h-9 matches month_caption's own height so both boxes occupy the
        // exact same row; without it nav collapses to 0 height (its only
        // children are position:absolute) and `items-center` has nothing to
        // center the buttons within, so they land above the caption text
        // instead of vertically aligned with it.
        nav: cn(
          defaultClassNames.nav,
          "absolute inset-x-0 top-0 flex h-9 items-center justify-between",
        ),
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "absolute left-1 z-10 text-muted-foreground/80 hover:text-foreground",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "absolute right-1 z-10 text-muted-foreground/80 hover:text-foreground",
        ),
        month_caption: cn(
          defaultClassNames.month_caption,
          "flex items-center justify-center h-9 font-semibold text-sm",
        ),
        dropdowns: cn(defaultClassNames.dropdowns, "flex items-center gap-1.5 text-sm font-medium"),
        dropdown_root: cn(
          defaultClassNames.dropdown_root,
          "relative rounded-md border border-input has-focus:ring-2 has-focus:ring-ring/50",
        ),
        dropdown: cn(defaultClassNames.dropdown, "bg-popover absolute inset-0 opacity-0"),
        caption_label: cn(defaultClassNames.caption_label, "select-none font-semibold"),
        month_grid: "w-full border-collapse",
        weekdays: cn(defaultClassNames.weekdays, "flex"),
        weekday: cn(
          defaultClassNames.weekday,
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] select-none",
        ),
        week: cn(defaultClassNames.week, "flex w-full mt-1"),
        day: cn(defaultClassNames.day, "relative p-0 text-center h-9 w-9 shrink-0"),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md",
        ),
        range_start: "rounded-l-md",
        range_end: "rounded-r-md",
        range_middle: "rounded-none",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground [&>button]:focus:bg-primary [&>button]:focus:text-primary-foreground",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        outside: "text-muted-foreground/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground/40 opacity-50 cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: CalendarChevron,
      }}
      {...props}
    />
  );
}

export { Calendar };
