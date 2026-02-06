import { format } from "date-fns";
import html2canvas from "html2canvas";
import {
  BarChart3,
  ChevronDown,
  FileSpreadsheet,
  Image as ImageIcon,
  PieChart as PieChartIcon,
  Table as TableIcon,
} from "lucide-react";
import Papa from "papaparse";
import { useId, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  Rectangle,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { BrandLoader } from "@/components/ui/page-loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactions } from "@/hooks/useTransactions";
import { useTransactionsGroupedByContact } from "@/hooks/useTransactionsGrouped";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  type FilterTransactionInput,
  type TransactionsGroupedByContactQuery,
  TransactionType,
} from "@/types/__generated__/graphql";

export function TransactionCharts() {
  const [filter, setFilter] = useState<FilterTransactionInput>({});
  const [viewMode, setViewMode] = useState<"total" | "contact">("total");
  const chartRef = useRef<HTMLDivElement>(null);

  const startDateId = useId();
  const endDateId = useId();
  const currencyId = useId();
  const summaryCurrencyId = useId();
  const minAmountId = useId();
  const typeId = useId();

  const {
    summary: totalSummary,
    loading: totalLoading,
    error: totalError,
  } = useTransactions(filter);
  const {
    groupedData,
    loading: groupedLoading,
    error: groupedError,
  } = useTransactionsGroupedByContact(filter);

  const isLoading = totalLoading || groupedLoading;
  const error = totalError || groupedError;

  const totalChartData = useMemo(() => {
    if (!totalSummary) return [];
    return [
      {
        name: "Income",
        value: totalSummary.totalIncome,
        fill: "#10b981",
        gradientId: "colorIncome",
      },
      {
        name: "Expense",
        value: totalSummary.totalExpense,
        fill: "#ef4444",
        gradientId: "colorExpense",
      },
      { name: "Given", value: totalSummary.totalGiven, fill: "#3b82f6", gradientId: "colorGiven" },
      {
        name: "Received",
        value: totalSummary.totalReceived,
        fill: "#f43f5e",
        gradientId: "colorReceived",
      },
      {
        name: "Gift Given",
        value: totalSummary.totalGiftGiven,
        fill: "#ec4899",
        gradientId: "colorGiftGiven",
      },
      {
        name: "Gift Received",
        value: totalSummary.totalGiftReceived,
        fill: "#8b5cf6",
        gradientId: "colorGiftReceived",
      },
      {
        name: "Returned (Me)",
        value: totalSummary.totalReturnedToMe,
        fill: "#10b981",
        gradientId: "colorRetMe",
      },
      {
        name: "Returned (Other)",
        value: totalSummary.totalReturnedToOther,
        fill: "#3b82f6",
        gradientId: "colorRetOther",
      },
    ]
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [totalSummary]);

  const toggleType = (type: TransactionType) => {
    const currentTypes = filter.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    setFilter({ ...filter, types: newTypes.length > 0 ? newTypes : undefined });
  };

  const contactChartData = useMemo(() => {
    return (groupedData as TransactionsGroupedByContactQuery["transactionsGroupedByContact"])
      .filter((d) => d.contact)
      .map((d) => ({
        name: d.contact?.name || "Unknown",
        net: d.summary.netBalance,
        given: d.summary.totalGiven,
        received: d.summary.totalReceived,
      }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
      .slice(0, 10); // Top 10 contacts
  }, [groupedData]);

  const handleExportImage = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current);
    const link = document.createElement("a");
    link.download = `transaction-summary-${format(new Date(), "yyyy-MM-dd")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleExportCSV = () => {
    const data =
      viewMode === "total"
        ? [totalSummary]
        : (groupedData as TransactionsGroupedByContactQuery["transactionsGroupedByContact"]).map(
            (d) => ({
              contact: d.contact?.name || "Unknown",
              ...d.summary,
            }),
          );

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transaction-data-${viewMode}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const handleExportExcel = () => {
    const data =
      viewMode === "total"
        ? [totalSummary]
        : (groupedData as TransactionsGroupedByContactQuery["transactionsGroupedByContact"]).map(
            (d) => ({
              contact: d.contact?.name || "Unknown",
              ...d.summary,
            }),
          );

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `transaction-data-${viewMode}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                Analytics Dashboard
              </CardTitle>
              <CardDescription>
                Visualize your financial standing and transaction patterns
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportImage}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Image
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <TableIcon className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <label htmlFor={startDateId} className="text-sm font-medium">
                Start Date
              </label>
              <Input
                id={startDateId}
                type="date"
                className="w-full"
                onChange={(e) => setFilter({ ...filter, startDate: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={endDateId} className="text-sm font-medium">
                End Date
              </label>
              <Input
                id={endDateId}
                type="date"
                className="w-full"
                onChange={(e) => setFilter({ ...filter, endDate: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={currencyId} className="text-sm font-medium">
                Filter Currency
              </label>
              <Select
                value={filter.currency || "ALL"}
                onValueChange={(value) =>
                  setFilter({ ...filter, currency: value === "ALL" ? undefined : value })
                }
              >
                <SelectTrigger id={currencyId} className="w-full">
                  <SelectValue placeholder="All Currencies" />
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
            </div>
            <div className="space-y-2">
              <label htmlFor={summaryCurrencyId} className="text-sm font-medium">
                Summary Currency
              </label>
              <Select
                value={filter.summaryCurrency || "NGN"}
                onValueChange={(value) => setFilter({ ...filter, summaryCurrency: value })}
              >
                <SelectTrigger id={summaryCurrencyId} className="w-full">
                  <SelectValue placeholder="Summary Currency" />
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
            <div className="space-y-2">
              <label htmlFor={minAmountId} className="text-sm font-medium">
                Min Amount
              </label>
              <Input
                id={minAmountId}
                type="number"
                placeholder="0"
                className="w-full"
                onChange={(e) =>
                  setFilter({
                    ...filter,
                    minAmount: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={typeId} className="text-sm font-medium">
                Transaction Types
              </label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                    id={typeId}
                  >
                    {filter.types && filter.types.length > 0
                      ? `${filter.types.length} Types Selected`
                      : "All Types"}
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {Object.values(TransactionType).map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={filter.types?.includes(type)}
                      onCheckedChange={() => toggleType(type)}
                    >
                      {type}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Tabs defaultValue="total" onValueChange={(v) => setViewMode(v as "total" | "contact")}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="total" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Aggregate Summary
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4" />
                By Contact
              </TabsTrigger>
            </TabsList>

            <div
              ref={chartRef}
              className="p-4 bg-background rounded-lg border border-border/50 min-h-[500px] flex flex-col items-center justify-center relative"
            >
              {isLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
                  <BrandLoader />
                </div>
              )}
              {error && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/90 rounded-lg p-6 text-center">
                  <p className="text-destructive font-medium mb-2">Failed to load analytics data</p>
                  <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              )}
              <TabsContent value="total" className="mt-0 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="h-[400px] bg-muted/20 p-4 rounded-xl border border-border/50">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Financial Volume
                    </h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={totalChartData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
                      >
                        <defs>
                          {totalChartData.map((entry) => (
                            <linearGradient
                              key={entry.gradientId}
                              id={entry.gradientId}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="5%" stopColor={entry.fill} stopOpacity={0.8} />
                              <stop offset="95%" stopColor={entry.fill} stopOpacity={0.3} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="hsl(var(--border))"
                          opacity={0.5}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "currentColor", fontSize: 12, fontWeight: 500 }}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                          className="text-foreground"
                          label={{
                            value: "Transaction Type",
                            position: "insideBottom",
                            offset: -20,
                            fill: "currentColor",
                            fontSize: 12,
                            fontWeight: 600,
                            className: "fill-muted-foreground",
                          }}
                        />
                        <YAxis
                          tick={{ fill: "currentColor", fontSize: 12, fontWeight: 500 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(val) => {
                            const currencySymbol =
                              filter.currency === "USD"
                                ? "$"
                                : filter.currency === "GBP"
                                  ? "£"
                                  : filter.currency === "EUR"
                                    ? "€"
                                    : "₦";
                            return `${currencySymbol}${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`;
                          }}
                          className="text-foreground"
                          label={{
                            value: `Amount (${filter.currency || "NGN"})`,
                            angle: -90,
                            position: "insideLeft",
                            offset: -5,
                            fill: "currentColor",
                            fontSize: 12,
                            fontWeight: 600,
                            className: "fill-muted-foreground",
                          }}
                        />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "12px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            padding: "12px",
                            color: "hsl(var(--foreground))",
                          }}
                          labelStyle={{
                            color: "hsl(var(--foreground))",
                            fontWeight: "bold",
                            marginBottom: "4px",
                          }}
                          itemStyle={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "hsl(var(--foreground))",
                          }}
                          formatter={(value: number | string | undefined) => [
                            formatCurrency(value ?? 0, filter.currency || "NGN"),
                            "Amount",
                          ]}
                        />
                        <Bar
                          dataKey="value"
                          radius={[6, 6, 0, 0]}
                          animationDuration={1500}
                          animationEasing="ease-in-out"
                          shape={(props) => {
                            const { x, y, width, height, payload } = props;
                            return (
                              <Rectangle
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                                fill={`url(#${payload.gradientId})`}
                                radius={[6, 6, 0, 0]}
                              />
                            );
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-[400px] bg-muted/20 p-4 rounded-xl border border-border/50">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                      <PieChartIcon className="w-5 h-5 text-primary" />
                      Asset Allocation
                    </h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={totalChartData}
                          cx="50%"
                          cy="45%"
                          innerRadius={85}
                          outerRadius={120}
                          paddingAngle={8}
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={1500}
                          stroke="none"
                          shape={(props) => {
                            return <Sector {...props} fill={props.payload.fill} />;
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "12px",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                            padding: "12px",
                            color: "hsl(var(--foreground))",
                          }}
                          labelStyle={{
                            color: "hsl(var(--foreground))",
                            fontWeight: "bold",
                            marginBottom: "4px",
                          }}
                          itemStyle={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "hsl(var(--foreground))",
                          }}
                          formatter={(value: number | string | undefined) => [
                            formatCurrency(value ?? 0, filter.currency || "NGN"),
                            "Total",
                          ]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          className="text-foreground"
                          wrapperStyle={{
                            paddingTop: "20px",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="mt-0 w-full">
                <div className="h-[500px] bg-muted/20 p-6 rounded-xl border border-border/50">
                  <h3 className="text-lg font-semibold mb-8 flex items-center gap-2">
                    <TableIcon className="w-5 h-5 text-primary" />
                    Top 10 Contacts by Activity
                  </h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={contactChartData}
                      layout="vertical"
                      margin={{ left: 60, right: 40, top: 20, bottom: 50 }}
                      barSize={20}
                      barGap={8}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="hsl(var(--border))"
                        opacity={0.4}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "currentColor", fontSize: 12, fontWeight: 500 }}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) =>
                          `${filter.currency === "USD" ? "$" : filter.currency === "EUR" ? "€" : filter.currency === "GBP" ? "£" : "₦"}${val >= 1000 ? `${val / 1000}k` : val}`
                        }
                        className="text-foreground"
                        label={{
                          value: `Amount (${filter.currency || "NGN"})`,
                          position: "bottom",
                          offset: 40,
                          fill: "currentColor",
                          fontSize: 12,
                          fontWeight: 600,
                          className: "fill-muted-foreground",
                        }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fill: "currentColor", fontSize: 12, fontWeight: 500 }}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={120}
                        className="text-foreground"
                        label={{
                          value: "Contact",
                          angle: -90,
                          position: "left",
                          offset: 0,
                          fill: "currentColor",
                          fontSize: 12,
                          fontWeight: 600,
                          className: "fill-muted-foreground",
                        }}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "12px",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                          padding: "12px",
                          color: "hsl(var(--foreground))",
                        }}
                        labelStyle={{
                          color: "hsl(var(--foreground))",
                          fontWeight: "bold",
                          marginBottom: "4px",
                        }}
                        itemStyle={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number | string | undefined) => [
                          formatCurrency(value ?? 0, filter.currency || "NGN"),
                          "Amount",
                        ]}
                      />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        iconType="circle"
                        className="text-foreground"
                        wrapperStyle={{
                          paddingBottom: "20px",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      />
                      <Bar dataKey="given" name="Given" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      <Bar
                        dataKey="received"
                        name="Received"
                        fill="#f43f5e"
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar dataKey="net" name="Net Standing" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
