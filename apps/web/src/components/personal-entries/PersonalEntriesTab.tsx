import { format } from "date-fns";
import { useState } from "react";
import { PersonalEntryForm } from "@/components/personal-entries/PersonalEntryForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePersonalEntries, usePersonalEntrySummary } from "@/hooks/usePersonalEntries";
import { formatCurrency } from "@/lib/utils/formatters";
import { PersonalEntryType } from "@/types/__generated__/graphql";

export function PersonalEntriesTab({ currency = "NGN" }: { currency?: string }) {
  const [showForm, setShowForm] = useState(false);
  const { entries, loading, deleteEntry } = usePersonalEntries();
  const { summary } = usePersonalEntrySummary();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Income</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold text-emerald-600">
            {formatCurrency(summary?.totalIncome ?? 0, currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold text-rose-600">
            {formatCurrency(summary?.totalExpenses ?? 0, currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Cash Position</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {formatCurrency(summary?.netCashPosition ?? 0, currency)}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Close" : "Add Entry"}</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6">
            <PersonalEntryForm defaultCurrency={currency} onSuccess={() => setShowForm(false)} />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No personal entries yet. Track your income and expenses here.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium">{entry.description || entry.category || "Entry"}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(entry.date), "PP")}
                  {entry.category ? ` · ${entry.category}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={
                    entry.type === PersonalEntryType.Income
                      ? "font-semibold text-emerald-600"
                      : "font-semibold text-rose-600"
                  }
                >
                  {entry.type === PersonalEntryType.Income ? "+" : "-"}
                  {formatCurrency(entry.amount, entry.currency)}
                </span>
                <Button variant="ghost" size="sm" onClick={() => deleteEntry(entry.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
