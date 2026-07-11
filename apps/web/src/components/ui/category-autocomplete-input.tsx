import { useId } from "react";
import { Input } from "@/components/ui/input";

interface CategoryAutocompleteInputProps extends Omit<React.ComponentProps<"input">, "list"> {
  suggestions: string[];
  /** Shown when suggestions exist. Falls back to `placeholder` when omitted. */
  emptyPlaceholder?: string;
}

/**
 * A plain `<input>` paired with a `<datalist>` of prior values — the
 * select-or-type-a-new-value autocomplete pattern used for every
 * category field in the app (org events, project transactions).
 */
export function CategoryAutocompleteInput({
  suggestions,
  placeholder,
  emptyPlaceholder = placeholder,
  ...inputProps
}: CategoryAutocompleteInputProps) {
  const listId = useId();

  return (
    <>
      <Input
        list={`${listId}-list`}
        autoComplete="off"
        placeholder={suggestions.length > 0 ? placeholder : emptyPlaceholder}
        {...inputProps}
      />
      {suggestions.length > 0 && (
        <datalist id={`${listId}-list`}>
          {suggestions.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
      )}
    </>
  );
}
