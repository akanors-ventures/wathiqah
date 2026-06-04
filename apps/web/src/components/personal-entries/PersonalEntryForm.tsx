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
import type { PersonalEntryFieldsFragment } from "@/types/__generated__/graphql";
import { PersonalEntryType } from "@/types/__generated__/graphql";

interface PersonalEntryFormProps {
  defaultCurrency?: string;
  onSuccess?: () => void;
  entry?: PersonalEntryFieldsFragment;
}

export function PersonalEntryForm({
  defaultCurrency = "NGN",
  onSuccess,
  entry,
}: PersonalEntryFormProps) {
  const isEdit = !!entry;
  const { createEntry, updateEntry, mutating } = usePersonalEntries();

  const [type, setType] = useState<PersonalEntryType>(entry?.type ?? PersonalEntryType.Expense);
  const [amount, setAmount] = useState(entry?.amount ?? 0);
  const [currency, setCurrency] = useState(entry?.currency ?? defaultCurrency);
  const { amountDisplay, handleAmountChange, handleBlur, reset } = useAmountInput({
    initialValue: entry?.amount,
    currencyCode: currency,
    onChange: setAmount,
  });
  const [category, setCategory] = useState(entry?.category ?? "");
  const [date, setDate] = useState(
    entry ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState(entry?.description ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    if (isEdit) {
      await updateEntry({
        id: entry.id,
        type,
        amount,
        currency,
        category: category || undefined,
        date,
        description: description || undefined,
      });
    } else {
      await createEntry({
        type,
        amount,
        currency,
        category: category || undefined,
        date,
        description: description || undefined,
      });
      reset();
      setAmount(0);
      setCategory("");
      setDescription("");
    }
    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NGN">NGN (₦)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="CAD">CAD ($)</SelectItem>
              <SelectItem value="AED">AED (د.إ)</SelectItem>
              <SelectItem value="SAR">SAR (ر.س)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Amount</Label>
        <Input
          inputMode="decimal"
          value={amountDisplay}
          onChange={handleAmountChange}
          onBlur={() => handleBlur(amount)}
          placeholder="0.00"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a note"
          rows={3}
        />
      </div>

      <Button type="submit" disabled={mutating || !amount} className="w-full">
        {mutating ? "Saving..." : isEdit ? "Save Changes" : "Add Entry"}
      </Button>
    </form>
  );
}
