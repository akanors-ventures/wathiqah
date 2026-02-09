import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { BrandLoader } from "@/components/ui/page-loader";
import { authGuard } from "@/utils/auth";
import type { ProjectFieldsFragment } from "@/types/__generated__/graphql";

export const Route = createFileRoute("/projects/")({
  component: ProjectsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function ProjectsPage() {
  const { projects, loading } = useProjects();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-8 space-y-8">
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

      {loading ? (
        <div className="flex justify-center py-10">
          <BrandLoader size="md" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-lg border border-dashed">
          <h3 className="text-lg font-medium">No projects yet</h3>
          <p className="text-muted-foreground mb-4">Create a project to start tracking funds.</p>
          <Button asChild variant="outline">
            <Link to="/projects/new">Create Project</Link>
          </Button>
        </div>
      ) : (
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
                    Budget: {formatCurrency(project.budget, project.currency)}
                  </p>
                )}
                <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min((project.budget ? project.balance / project.budget : 0) * 100, 100)}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
