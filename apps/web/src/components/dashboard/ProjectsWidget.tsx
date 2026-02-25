import { Link } from "@tanstack/react-router";
import { ArrowRight, FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";
import { useProjects } from "@/hooks/useProjects";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectsWidget() {
  const { projects, loading } = useProjects();

  if (loading) {
    return (
      <Card className="h-full rounded-[24px] border-border/50">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const activeProjects = projects.slice(0, 3);

  return (
    <Card className="h-full rounded-[24px] border-border/50 overflow-hidden group/projects transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
      <CardHeader className="flex flex-row items-center justify-between pb-4 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover/projects:bg-indigo-500 group-hover/projects:text-white transition-all duration-500 shadow-sm">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold capitalize tracking-tight text-foreground">
              Active Projects
            </CardTitle>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-8 w-8 p-0 rounded-full hover:bg-indigo-500/10 hover:text-indigo-600 transition-colors"
        >
          <Link to="/projects/new">
            <Plus className="w-4 h-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-5">
        {activeProjects.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs font-medium text-muted-foreground mb-4">
              Track funds for trips, renovations, or goals.
            </p>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-md font-bold text-xs h-8 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-all"
            >
              <Link to="/projects/new">Create First Project</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {activeProjects.map((project) => {
              const percentage = project.budget
                ? Math.min((project.balance / project.budget) * 100, 100)
                : 0;

              return (
                <Link
                  key={project.id}
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="block group/item"
                >
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover/item:text-indigo-600 transition-colors">
                        {project.name}
                      </h4>
                      <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                        {formatCurrency(project.balance, project.currency)}
                        {project.budget && (
                          <span className="opacity-70">
                            {" "}
                            / {formatCurrency(project.budget, project.currency)}
                          </span>
                        )}
                      </p>
                    </div>
                    {project.budget && (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                        {Math.round(percentage)}%
                      </span>
                    )}
                  </div>
                  {project.budget ? (
                    <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out group-hover/item:bg-indigo-600"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  ) : (
                    <div className="h-1.5 w-full bg-secondary/30 rounded-full overflow-hidden relative">
                      <div className="absolute inset-0 bg-indigo-500/20 w-1/2 animate-shimmer" />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
        {activeProjects.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="w-full h-8 text-xs font-bold text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-all mt-2"
          >
            <Link to="/projects">
              View All Projects <ArrowRight className="ml-1 w-3 h-3" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
