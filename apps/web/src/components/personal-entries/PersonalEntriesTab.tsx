import { format } from "date-fns";
import { Download, Filter, Plus, Search, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import { EditPersonalEntryDialog } from "@/components/personal-entries/EditPersonalEntryDialog";
import { PersonalEntryForm } from "@/components/personal-entries/PersonalEntryForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BrandLoader } from "@/components/ui/page-loader";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePersonalEntries, usePersonalEntrySummary } from "@/hooks/usePersonalEntries";
import { formatCurrency } from "@/lib/utils/formatters";
import type {
  FilterPersonalEntryInput,
  PersonalEntryFieldsFragment,
} from "@/types/__generated__/graphql";
import { PersonalEntryType } from "@/types/__generated__/graphql";

export function PersonalEntriesTab() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PersonalEntryType | "ALL">("ALL");
  const [currency, setCurrency] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PersonalEntryFieldsFragment | null>(null);

  const baseFilter = {
    ...(search && { search }),
    ...(typeFilter !== "ALL" && { type: typeFilter }),
    ...(currency !== "ALL" && { currency }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const listFilter: FilterPersonalEntryInput = { ...baseFilter, page, limit };
  const summaryFilter: FilterPersonalEntryInput = baseFilter;

  const { entries, total, loading, deleteEntry } = usePersonalEntries(listFilter);
  const { summary } = usePersonalEntrySummary(summaryFilter);

  const displayCurrency = currency !== "ALL" ? currency : (summary?.currency ?? "NGN");

  const handleFilterChange =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPage(1);
    };

  const handleExport = () => {
    const headers = ["Date", "Type", "Category", "Description", "Amount", "Currency"];
    const csvContent = [
      headers.join(","),
      ...entries.map((entry) =>
        [
          format(new Date(entry.date), "yyyy-MM-dd"),
          entry.type,
          entry.category ?? "",
          `"${entry.description ?? ""}"`,
          entry.amount,
          entry.currency,
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `personal_entries_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-[24px] border-border/50 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Income</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(summary?.totalIncome ?? 0, displayCurrency)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[24px] border-border/50 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-rose-600">
              {formatCurrency(summary?.totalExpenses ?? 0, displayCurrency)}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[24px] border-border/50 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash Position
            </CardTitle>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${(summary?.netCashPosition ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}
            >
              {formatCurrency(summary?.netCashPosition ?? 0, displayCurrency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Inline add form */}
      {showForm && (
        <Card className="rounded-[24px] border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">New Personal Entry</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <PersonalEntryForm
              defaultCurrency={currency !== "ALL" ? currency : "NGN"}
              onSuccess={() => setShowForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Main ledger card */}
      <Card className="rounded-[32px] border-border/50 overflow-hidden shadow-sm">
        <CardHeader className="p-6 border-b border-border/30 space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-black tracking-tight uppercase opacity-60">
              Personal Ledger
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[10px] font-bold uppercase tracking-wider"
                onClick={handleExport}
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Export
              </Button>
              <Button
                size="sm"
                className="h-8 text-[10px] font-bold uppercase tracking-wider"
                onClick={() => setShowForm((s) => !s)}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                {showForm ? "Cancel" : "Add Entry"}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by description or category..."
                className="pl-8 w-full"
                value={search}
                onChange={(e) => handleFilterChange(setSearch)(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
              <Select
                value={typeFilter}
                onValueChange={handleFilterChange(setTypeFilter) as (v: string) => void}
              >
                <SelectTrigger className="flex-1 sm:w-[140px]">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value={PersonalEntryType.Income}>Income</SelectItem>
                  <SelectItem value={PersonalEntryType.Expense}>Expense</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={currency}
                onValueChange={handleFilterChange(setCurrency) as (v: string) => void}
              >
                <SelectTrigger className="flex-1 sm:w-[140px]">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">$</span>
                    <SelectValue placeholder="Currency" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Currencies</SelectItem>
                  <SelectItem value="NGN">NGN (₦)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="AED">AED (د.إ)</SelectItem>
                  <SelectItem value="SAR">SAR (ر.س)</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                className="flex-1 sm:w-[140px]"
                value={startDate}
                title="From date"
                onChange={(e) => handleFilterChange(setStartDate)(e.target.value)}
              />
              <Input
                type="date"
                className="flex-1 sm:w-[140px]"
                value={endDate}
                title="To date"
                onChange={(e) => handleFilterChange(setEndDate)(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-b border-border/30">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12 pl-6">
                    Date
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12">
                    Type
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12">
                    Category
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12">
                    Description
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 h-12 text-right pr-6">
                    Amount
                  </TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20">
                      <div className="flex justify-center">
                        <BrandLoader size="sm" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
                          <Wallet className="w-8 h-8" />
                        </div>
                        <p className="font-bold text-sm">No personal entries found.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Track your income and expenses here.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className="border-b border-border/30 last:border-0 hover:bg-muted/50 transition-colors group cursor-pointer"
                      onClick={() => setEditingEntry(entry)}
                    >
                      <TableCell className="font-medium text-xs text-muted-foreground/80 pl-6">
                        {format(new Date(entry.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            entry.type === PersonalEntryType.Income
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                          }`}
                        >
                          {entry.type === PersonalEntryType.Income ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {entry.type === PersonalEntryType.Income ? "Income" : "Expense"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {entry.category ?? <span className="opacity-40">—</span>}
                      </TableCell>
                      <TableCell
                        className="max-w-[220px] truncate text-xs text-muted-foreground/90"
                        title={entry.description ?? undefined}
                      >
                        {entry.description ?? <span className="opacity-40">—</span>}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span
                          className={`font-semibold ${
                            entry.type === PersonalEntryType.Income
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {entry.type === PersonalEntryType.Income ? "+" : "−"}
                          {formatCurrency(entry.amount, entry.currency)}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] font-bold text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEntry(entry.id);
                          }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3 p-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <BrandLoader size="sm" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
                  <Wallet className="w-8 h-8" />
                </div>
                <p className="font-bold text-sm">No personal entries found.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Track your income and expenses here.
                </p>
              </div>
            ) : (
              entries.map((entry) => (
                <Card
                  key={entry.id}
                  className="overflow-hidden border-border/50 hover:border-primary/30 transition-all cursor-pointer active:scale-[0.98]"
                  onClick={() => setEditingEntry(entry)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {format(new Date(entry.date), "MMM d, yyyy")}
                        </p>
                        <p className="font-semibold text-foreground">
                          {entry.description || entry.category || "Entry"}
                        </p>
                        {entry.category && entry.description && (
                          <p className="text-xs text-muted-foreground">{entry.category}</p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          entry.type === PersonalEntryType.Income
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                        }`}
                      >
                        {entry.type === PersonalEntryType.Income ? "Income" : "Expense"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/30">
                      <span
                        className={`font-bold text-lg ${
                          entry.type === PersonalEntryType.Income
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {entry.type === PersonalEntryType.Income ? "+" : "−"}
                        {formatCurrency(entry.amount, entry.currency)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] font-bold text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEntry(entry.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Pagination
            total={total}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </CardContent>
      </Card>

      {editingEntry && (
        <EditPersonalEntryDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => {
            if (!open) setEditingEntry(null);
          }}
        />
      )}
    </div>
  );
}
