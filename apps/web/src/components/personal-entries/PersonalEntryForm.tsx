import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAmountInput } from "@/hooks/useAmountInput";
import { usePersonalEntries } from "@/hooks/usePersonalEntries";
import { PersonalEntryType } from "@/types/__generated__/graphql";

interface PersonalEntryFormProps {
  defaultCurrency?: string;
  onSuccess?: () => void;
}

export function PersonalEntryForm({ defaultCurrency = "NGN", onSuccess }: PersonalEntryFormProps) {
  const { createEntry, mutating } = usePersonalEntries();
  const [type, setType] = useState<PersonalEntryType>(PersonalEntryType.Expense);
  const [amount, setAmount] = useState(0);
  const { amountDisplay, handleAmountChange, handleBlur, reset } = useAmountInput({
    currencyCode: defaultCurrency,
    onChange: setAmount,
  });
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    await createEntry({
      type,
      amount,
      currency: defaultCurrency,
      category: category || undefined,
      date,
      description: description || undefined,
    });
    reset();
    setAmount(0);
    setCategory("");
    setDescription("");
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as PersonalEntryType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PersonalEntryType.Income}>Income</SelectItem>
            <SelectItem value={PersonalEntryType.Expense}>Expense</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Amount ({defaultCurrency})</Label>
        <Input
          inputMode="decimal"
          value={amountDisplay}
          onChange={handleAmountChange}
          onBlur={() => handleBlur(amount)}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-2">
        <Label>Category (optional)</Label>
        <Input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. food, salary, rent"
        />
      </div>

      <div className="space-y-2">
        <Label>Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a note"
        />
      </div>

      <Button type="submit" disabled={mutating || !amount} className="w-full">
        {mutating ? "Saving..." : "Add Entry"}
      </Button>
    </form>
  );
}
