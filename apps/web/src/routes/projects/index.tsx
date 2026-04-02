import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Filter, Plus, Search } from "lucide-react";
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
import { useProjectFilters } from "@/hooks/useProjectFilters";
import { useProjects } from "@/hooks/useProjects";
import { formatCurrency } from "@/lib/utils/formatters";
import type { ProjectFieldsFragment } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/projects/")({
  component: ProjectsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function ProjectsPage() {
  const {
    search,
    setSearch,
    status,
    setStatus,
    balanceStanding,
    setBalanceStanding,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  } = useProjectFilters();

  const { projects, total, loading } = useProjects(variables.filter);

  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your project funds and expenses.</p>
        </div>
        <Button asChild>
          <Link to="/projects/new">
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="sm:w-[160px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={balanceStanding}
          onValueChange={(v) => setBalanceStanding(v as typeof balanceStanding)}
        >
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder="Budget Standing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Projects</SelectItem>
            <SelectItem value="UNDER_BUDGET">Under Budget</SelectItem>
            <SelectItem value="OVER_BUDGET">Over Budget</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <BrandLoader size="md" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
          <h3 className="text-lg font-medium">No projects found</h3>
          <p className="text-muted-foreground mb-4">
            {search || status !== "ALL" || balanceStanding !== "ALL"
              ? "Try adjusting your filters."
              : "Create a project to start tracking funds."}
          </p>
          {!search && status === "ALL" && balanceStanding === "ALL" && (
            <Button asChild variant="outline">
              <Link to="/projects/new">Create Project</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: ProjectFieldsFragment) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() =>
                  navigate({ to: "/projects/$projectId", params: { projectId: project.id } })
                }
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{project.name}</CardTitle>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(project.balance, project.currency)}
                  </div>
                  {project.budget && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(
                        project.budget - (project.totalExpenses ?? 0),
                        project.currency,
                      )}{" "}
                      remaining of {formatCurrency(project.budget, project.currency)}
                    </p>
                  )}
                  <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${Math.min((project.budget ? (project.totalExpenses ?? 0) / project.budget : 0) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination
            total={total}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
      )}
    </div>
  );
}
