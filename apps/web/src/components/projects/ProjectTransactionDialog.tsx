import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProjectTransactionForm } from "./ProjectTransactionForm";

interface ProjectTransactionDialogProps {
  projectId: string;
  trigger?: React.ReactNode;
}

export function ProjectTransactionDialog({
  projectId,
  trigger,
}: ProjectTransactionDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Log Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Transaction</DialogTitle>
          <DialogDescription>
            Add income or expense to this project.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <ProjectTransactionForm
            projectId={projectId}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
