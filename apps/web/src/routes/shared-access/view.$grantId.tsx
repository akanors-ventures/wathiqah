import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Eye, History, Lock, Package, User, Briefcase } from "lucide-react";
import { PromiseCard } from "@/components/promises/PromiseCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/ui/page-loader";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSharedData } from "@/hooks/useSharedData";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { AssetCategory, type Promise as PromiseType } from "@/types/__generated__/graphql";

export const Route = createFileRoute("/shared-access/view/$grantId")({
  component: SharedAccessView,
});

function SharedAccessView() {
  const { grantId } = Route.useParams();
  const { data, loading, error } = useSharedData(grantId);

  if (loading) return <PageLoader />;
  if (error)
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-6">
          {error.message || "You do not have permission to view this profile."}
        </p>
        <Button asChild>
          <Link to="/settings">Return to Settings</Link>
        </Button>
      </div>
    );

  if (!data) return <div className="p-8">No data found.</div>;

  const { user, transactions, promises, projects } = data;

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-6xl px-4">
      {/* Header Bar */}
      <div className="group relative bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 rounded-[32px] p-6 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(245,158,11,0.05)] overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 text-amber-800 dark:text-amber-200">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-2xl shadow-sm group-hover:rotate-3 transition-transform duration-500">
              <Eye className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="font-black text-xl uppercase tracking-tight">Read-Only View</h1>
              <p className="text-[11px] font-medium uppercase tracking-wider opacity-80">
                You are viewing{" "}
                <span className="font-black text-amber-900 dark:text-amber-100">
                  {user?.firstName} {user?.lastName}
                </span>
                's shared data
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-11 rounded-2xl px-6 bg-background/50 border-amber-200/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Link to="/settings">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Profile
            </Link>
          </Button>
        </div>
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors duration-500" />
      </div>

      <div className="grid gap-8 md:grid-cols-[320px_1fr]">
        {/* Sidebar / Profile Card */}
        <div className="space-y-6">
          <Card className="group relative overflow-hidden bg-card border border-border/50 rounded-[32px] p-8 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
            <CardHeader className="p-0 mb-8 relative z-10">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-3 text-muted-foreground group-hover:text-primary transition-colors">
                <div className="p-2 rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-sm group-hover:scale-110">
                  <User className="w-4 h-4" />
                </div>
                Profile Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-8 relative z-10">
              <div className="space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                  Full Name
                </div>
                <div className="text-lg font-black text-foreground tracking-tight group-hover:text-primary transition-colors">
                  {user?.firstName} {user?.lastName}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
                  Email
                </div>
                <div className="text-sm font-bold text-foreground/80 break-all">{user?.email}</div>
              </div>

              <div className="pt-6 border-t border-border/30">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] font-medium text-muted-foreground leading-relaxed uppercase tracking-wider">
                    This information is shared with you securely. You cannot edit or modify any of
                    these records.
                  </p>
                </div>
              </div>
            </CardContent>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="w-full justify-start bg-muted/20 p-1.5 rounded-2xl h-auto mb-8 border border-border/30">
              <TabsTrigger
                value="transactions"
                className="rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
              >
                Transactions
                <span className="ml-2.5 px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-black">
                  {transactions?.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="promises"
                className="rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
              >
                Promises
                <span className="ml-2.5 px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-black">
                  {promises?.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="projects"
                className="rounded-xl px-8 py-3 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all"
              >
                Projects
                <span className="ml-2.5 px-2 py-0.5 rounded-lg bg-primary/10 text-primary font-black">
                  {projects?.length || 0}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-0 focus-visible:outline-none">
              <div className="bg-card border border-border/50 rounded-[32px] overflow-hidden shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 group/table">
                <div className="p-8 border-b border-border/30 flex items-center justify-between">
                  <h3 className="text-base font-black uppercase tracking-widest text-foreground group-hover/table:text-primary transition-colors">
                    Transaction History
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <tr className="bg-muted/40 border-b border-border/30">
                        <th className="p-5 pl-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                          Date
                        </th>
                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                          Type
                        </th>
                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                          Contact
                        </th>
                        <th className="p-5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                          Description
                        </th>
                        <th className="p-5 pr-8 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                          Amount
                        </th>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {transactions?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-20 bg-muted/5">
                            <div className="flex flex-col items-center gap-3">
                              <div className="p-4 rounded-full bg-muted/20">
                                <History className="w-8 h-8 text-muted-foreground/40" />
                              </div>
                              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                                No transactions shared.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        transactions?.map((tx) => (
                          <TableRow
                            key={tx.id}
                            className="group/row hover:bg-primary/[0.02] transition-colors border-b border-border/10 last:border-0"
                          >
                            <TableCell className="p-5 pl-8">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-black text-foreground">
                                  {formatDate(tx.date as string)}
                                </span>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                  {new Date(tx.date as string).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="p-5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border-0 shadow-sm",
                                  tx.type === "GIVEN"
                                    ? "text-blue-600 bg-blue-500/10"
                                    : tx.type === "RECEIVED" || tx.type === "EXPENSE"
                                      ? "text-rose-600 bg-rose-500/10"
                                      : tx.type === "RETURNED"
                                        ? tx.returnDirection === "TO_ME"
                                          ? "text-emerald-600 bg-emerald-500/10"
                                          : "text-blue-600 bg-blue-500/10"
                                        : tx.type === "INCOME"
                                          ? "text-emerald-600 bg-emerald-500/10"
                                          : tx.type === "GIFT"
                                            ? tx.returnDirection === "TO_ME"
                                              ? "text-purple-600 bg-purple-500/10"
                                              : "text-pink-600 bg-pink-500/10"
                                            : "text-blue-600 bg-blue-500/10",
                                )}
                              >
                                {tx.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="p-5 font-bold text-xs tracking-tight text-foreground/80 group-hover/row:text-primary transition-colors">
                              {tx.contact?.name || "-"}
                            </TableCell>
                            <TableCell className="p-5">
                              {tx.category === AssetCategory.Item ? (
                                <div className="flex items-center gap-2 font-extrabold text-xs text-foreground tracking-tight">
                                  <div className="p-1.5 rounded-lg bg-primary/5 text-primary">
                                    <Package className="h-3.5 w-3.5" />
                                  </div>
                                  <span>
                                    {tx.quantity}x {tx.itemName}
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className="text-xs font-medium text-muted-foreground truncate block max-w-[200px]"
                                  title={tx.description as string}
                                >
                                  {tx.description || "-"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="p-5 pr-8 text-right">
                              {tx.category === AssetCategory.Item ? (
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">
                                  Physical Item
                                </span>
                              ) : (
                                <div
                                  className={cn(
                                    "text-sm font-black tracking-tight",
                                    tx.type === "RECEIVED" || tx.type === "EXPENSE"
                                      ? "text-rose-600"
                                      : tx.type === "GIVEN"
                                        ? "text-blue-600"
                                        : tx.type === "RETURNED"
                                          ? tx.returnDirection === "TO_ME"
                                            ? "text-emerald-600"
                                            : "text-blue-600"
                                          : tx.type === "INCOME"
                                            ? "text-emerald-600"
                                            : tx.type === "GIFT"
                                              ? tx.returnDirection === "TO_ME"
                                                ? "text-purple-600"
                                                : "text-pink-600"
                                              : "text-foreground",
                                  )}
                                >
                                  {tx.type === "GIVEN" ||
                                  (tx.type === "RETURNED" && tx.returnDirection === "TO_ME") ||
                                  tx.type === "INCOME" ||
                                  (tx.type === "GIFT" && tx.returnDirection === "TO_ME")
                                    ? "+"
                                    : "-"}
                                  {formatCurrency(tx.amount || 0, tx.currency)}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="promises" className="mt-0 focus-visible:outline-none">
              <div className="grid gap-6 md:grid-cols-2">
                {promises?.map((p) => (
                  <PromiseCard key={p.id} promise={p as PromiseType} readOnly />
                ))}
                {promises?.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-muted/5 rounded-[32px] border-2 border-dashed border-border/50">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-muted/20">
                        <Package className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                        No promises shared.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="projects" className="mt-0 focus-visible:outline-none">
              <div className="grid gap-6 md:grid-cols-2">
                {projects?.map((project) => (
                  <Card
                    key={project.id}
                    className="group hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500 rounded-[24px] overflow-hidden border-border/50"
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <div className="p-2 rounded-xl bg-muted/20 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                        <Briefcase className="w-4 h-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-black tracking-tight text-foreground">
                        {formatCurrency(project.balance, project.currency)}
                      </div>
                      {project.budget && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mt-1">
                          Budget: {formatCurrency(project.budget, project.currency)}
                        </p>
                      )}
                      {project.description && (
                        <p className="text-xs text-muted-foreground mt-4 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                      <div className="mt-6 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-1000 ease-out"
                          style={{
                            width: `${Math.min((project.budget ? project.balance / project.budget : 0) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {projects?.length === 0 && (
                  <div className="col-span-full text-center py-20 bg-muted/5 rounded-[32px] border-2 border-dashed border-border/50">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-muted/20">
                        <Briefcase className="w-8 h-8 text-muted-foreground/40" />
                      </div>
                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                        No projects shared.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
