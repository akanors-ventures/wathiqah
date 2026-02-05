import { format } from "date-fns";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Edit,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePromises } from "@/hooks/usePromises";
import { cn } from "@/lib/utils";
import {
  Priority,
  PromiseStatus,
  type Promise as PromiseType,
} from "@/types/__generated__/graphql";
import { PromiseFormDialog } from "./PromiseFormDialog";

interface PromiseCardProps {
  promise: PromiseType;
  readOnly?: boolean;
}

export function PromiseCard({ promise, readOnly = false }: PromiseCardProps) {
  const { updatePromise, deletePromise } = usePromises();
  const [editOpen, setEditOpen] = useState(false);

  const statusColors = {
    [PromiseStatus.Pending]: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    [PromiseStatus.Fulfilled]: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    [PromiseStatus.Overdue]: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  };

  const priorityColors = {
    [Priority.Low]: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    [Priority.Medium]: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    [Priority.High]: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };

  const priorityGradients = {
    [Priority.Low]: "from-blue-500 via-blue-500/80 to-blue-500/60",
    [Priority.Medium]: "from-amber-500 via-amber-500/80 to-amber-500/60",
    [Priority.High]: "from-rose-500 via-rose-500/80 to-rose-500/60",
  };

  const handleStatusChange = async (status: PromiseStatus) => {
    await updatePromise({
      id: promise.id,
      status,
    });
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this promise?")) {
      await deletePromise(promise.id);
    }
  };

  const priority = promise.priority as Priority;

  return (
    <>
      <div className="group relative bg-card border border-border/50 rounded-[32px] transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-primary/30 overflow-hidden flex flex-col p-6">
        <div className="flex flex-col gap-6 relative z-10 h-full">
          <div className="flex justify-between items-start">
            <div className="flex gap-4 items-center min-w-0">
              <div className="relative shrink-0">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg transition-all duration-700 group-hover:scale-110 group-hover:-rotate-6 bg-gradient-to-br",
                    priorityGradients[priority],
                    `shadow-${priorityColors[priority].split("-")[1]}-500/30`,
                  )}
                >
                  {promise.promiseTo?.charAt(0)?.toUpperCase() ?? "P"}
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background border border-border/50 shadow-md">
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full ring-2 ring-background shadow-inner",
                      promise.status === PromiseStatus.Fulfilled
                        ? "bg-emerald-500"
                        : promise.status === PromiseStatus.Overdue
                          ? "bg-rose-500"
                          : "bg-amber-500 animate-pulse",
                    )}
                  />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xl text-foreground truncate group-hover:text-primary transition-colors tracking-tight mb-1">
                  {promise.promiseTo}
                </h3>
                <div
                  className={cn(
                    "w-fit px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize tracking-tight border shadow-sm transition-all",
                    statusColors[promise.status as PromiseStatus],
                  )}
                >
                  {promise.status.toLowerCase().replace(/_/g, " ")}
                </div>
              </div>
            </div>

            {!readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl transition-all border border-transparent hover:border-border/50 active:scale-95"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 p-1.5 rounded-2xl border-border/40 shadow-2xl backdrop-blur-xl bg-background/95"
                >
                  <DropdownMenuItem
                    onClick={() => setEditOpen(true)}
                    className="rounded-xl py-2.5 cursor-pointer focus:bg-primary/5 px-4"
                  >
                    <Edit className="h-4 w-4 mr-3 text-primary/60" />{" "}
                    <span className="font-bold text-sm">Edit Promise</span>
                  </DropdownMenuItem>
                  {promise.status !== PromiseStatus.Fulfilled && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(PromiseStatus.Fulfilled)}
                      className="rounded-xl py-2.5 cursor-pointer focus:bg-emerald-50 px-4"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-3 text-emerald-500" />{" "}
                      <span className="font-bold text-sm text-emerald-600">Mark Fulfilled</span>
                    </DropdownMenuItem>
                  )}
                  {promise.status === PromiseStatus.Fulfilled && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(PromiseStatus.Pending)}
                      className="rounded-xl py-2.5 cursor-pointer focus:bg-amber-50 px-4"
                    >
                      <Clock className="h-4 w-4 mr-3 text-amber-500" />{" "}
                      <span className="font-bold text-sm text-amber-600">Mark Pending</span>
                    </DropdownMenuItem>
                  )}
                  <div className="h-px bg-border/50 my-1 mx-2" />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="rounded-xl py-2.5 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50 px-4"
                  >
                    <Trash2 className="h-4 w-4 mr-3" />{" "}
                    <span className="font-bold text-sm">Delete Promise</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 relative overflow-hidden group-hover:bg-muted/30 transition-all duration-700 backdrop-blur-sm">
            <p className="text-base text-muted-foreground font-medium leading-relaxed italic relative z-10 pl-4 border-l-2 border-primary/20 line-clamp-2 group-hover:text-foreground/80 transition-colors">
              "{promise.description}"
            </p>
          </div>

          <div className="mt-auto flex items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-primary/60" />
              <span className="text-sm font-bold tracking-tight text-foreground/80">
                {format(new Date(promise.dueDate as string), "MMM d, yyyy")}
              </span>
            </div>

            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold capitalize transition-all",
                priorityColors[priority],
              )}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {priority.toLowerCase()}
            </div>
          </div>
        </div>

        {/* Decorative background elements */}
        <div
          className={cn(
            "absolute -right-20 -bottom-20 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-10 transition-all duration-1000",
            priorityColors[priority].split(" ")[1] === "blue-500"
              ? "bg-blue-500"
              : priorityColors[priority].split(" ")[1] === "amber-500"
                ? "bg-amber-500"
                : "bg-rose-500",
          )}
        />
      </div>

      <PromiseFormDialog promise={promise} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
