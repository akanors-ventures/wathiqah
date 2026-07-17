import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

interface CategoryAutocompleteInputProps extends Omit<React.ComponentProps<"input">, "list"> {
  suggestions: string[];
  /** Shown when suggestions exist. Falls back to `placeholder` when omitted. */
  emptyPlaceholder?: string;
}

/**
 * A text input paired with a filterable dropdown of prior values — the
 * select-or-type-a-new-value autocomplete pattern used for every category
 * field in the app (org events, project transactions).
 *
 * Built on Radix Popover instead of `<input list>` + `<datalist>` because
 * datalist renders no dropdown at all on iOS Safari and is unreliable on
 * other mobile browsers. Uses PopoverAnchor (not PopoverTrigger) since open
 * state is driven by focus/typing on the input, not a click on the anchor —
 * Popover already solves outside-click/Escape dismissal and collision-aware
 * positioning, so this component only owns the combobox interaction model:
 * focus stays on the input, ArrowUp/ArrowDown move a virtual highlight
 * (aria-activedescendant) over non-tabbable options, Enter/click commit.
 */
export function CategoryAutocompleteInput({
  suggestions,
  placeholder,
  emptyPlaceholder = placeholder,
  className,
  onFocus,
  onChange,
  onBlur,
  onKeyDown,
  ref,
  ...inputProps
}: CategoryAutocompleteInputProps) {
  const listboxId = useId();
  const innerRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  // Selecting a suggestion re-focuses the input as its very last step (it's
  // typically already focused — options are tabIndex={-1} and clicks are
  // pointerdown-guarded below — but this covers any focus loss defensively).
  // That focus() call fires a synchronous "focus" event; without this guard
  // the onFocus handler would see suggestions.length > 0 and immediately
  // reopen the dropdown we just closed.
  const suppressReopenOnFocusRef = useRef(false);

  // Suggestions typically arrive from a query that's still in flight when the
  // field is first focused (e.g. empty result while the field is skipped on
  // an unset parent id). Re-open once they land, if the field is still focused.
  useEffect(() => {
    if (suggestions.length > 0 && innerRef.current && document.activeElement === innerRef.current) {
      setOpen(true);
    }
  }, [suggestions]);

  const filtered = query.trim()
    ? suggestions.filter((s) => s.toLowerCase().includes(query.trim().toLowerCase()))
    : suggestions;
  const isExpanded = open && filtered.length > 0;

  const assignRef = useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.RefObject<HTMLInputElement | null>).current = node;
    },
    [ref],
  );

  const closePopover = () => {
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const selectSuggestion = (suggestion: string) => {
    const input = innerRef.current;
    if (input) {
      // Keep the native DOM value in sync (uncontrolled `register()` callers
      // read it directly), but call the caller's onChange ourselves instead
      // of dispatching a synthetic "input" event: dispatching would re-enter
      // this component's own onChange wrapper below, which reopens the
      // dropdown (suggestions.length > 0) right after we close it here.
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeSetter?.call(input, suggestion);
      onChange?.({ target: input, currentTarget: input } as React.ChangeEvent<HTMLInputElement>);
    }
    setQuery(suggestion);
    closePopover();
    suppressReopenOnFocusRef.current = true;
    innerRef.current?.focus();
    suppressReopenOnFocusRef.current = false;
  };

  return (
    <Popover open={isExpanded} onOpenChange={(next) => !next && closePopover()}>
      <PopoverAnchor asChild>
        <Input
          {...inputProps}
          ref={assignRef}
          autoComplete="off"
          role="combobox"
          aria-expanded={isExpanded}
          aria-controls={listboxId}
          aria-activedescendant={
            isExpanded && highlightedIndex >= 0
              ? `${listboxId}-option-${highlightedIndex}`
              : undefined
          }
          placeholder={suggestions.length > 0 ? placeholder : emptyPlaceholder}
          className={className}
          onFocus={(e) => {
            setQuery(e.target.value);
            if (!suppressReopenOnFocusRef.current && suggestions.length > 0) setOpen(true);
            onFocus?.(e);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedIndex(-1);
            if (suggestions.length > 0) setOpen(true);
            onChange?.(e);
          }}
          onBlur={(e) => {
            // Safe to close unconditionally: option buttons are tabIndex={-1}
            // (never receive focus themselves) and use onPointerDown
            // preventDefault to stop a mouse/touch selection from blurring
            // the input before its click fires, so this never races a
            // real select.
            closePopover();
            onBlur?.(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              closePopover();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!open && suggestions.length > 0) {
                setOpen(true);
                setHighlightedIndex(0);
              } else if (filtered.length > 0) {
                setHighlightedIndex((i) => (i + 1) % filtered.length);
              }
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              if (open && filtered.length > 0) {
                setHighlightedIndex((i) => (i <= 0 ? filtered.length - 1 : i - 1));
              }
            } else if (e.key === "Enter" && isExpanded && highlightedIndex >= 0) {
              e.preventDefault();
              selectSuggestion(filtered[highlightedIndex]);
            }
            onKeyDown?.(e);
          }}
        />
      </PopoverAnchor>
      <PopoverContent
        id={listboxId}
        role="listbox"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // The input is the Anchor, not a descendant of this portaled
          // Content, so Radix would otherwise treat clicking/focusing back
          // into it as an "outside" interaction and close the popover.
          if (innerRef.current && e.target instanceof Node && innerRef.current.contains(e.target)) {
            e.preventDefault();
          }
        }}
        className="w-[var(--radix-popover-trigger-width)] max-h-56 overflow-auto p-1"
      >
        {filtered.map((suggestion, index) => (
          <button
            key={suggestion}
            id={`${listboxId}-option-${index}`}
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={index === highlightedIndex}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => selectSuggestion(suggestion)}
            onPointerEnter={() => setHighlightedIndex(index)}
            className="block w-full truncate rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground data-[highlighted=true]:bg-accent data-[highlighted=true]:text-accent-foreground"
            data-highlighted={index === highlightedIndex}
          >
            {suggestion}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
