import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
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
import type { ProjectTransactionType } from "@/types/__generated__/graphql";

interface EditableTransaction {
  id: string;
  amount: number;
  type: ProjectTransactionType;
  category?: string | null;
  description?: string | null;
  date: string | Date;
}

interface ProjectTransactionDialogProps {
  projectId: string;
  trigger?: React.ReactNode;
  /** Pre-filled transaction for edit mode */
  editTransaction?: EditableTransaction;
}

export function ProjectTransactionDialog({
  projectId,
  trigger,
  editTransaction,
}: ProjectTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const isEditMode = !!editTransaction;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          isEditMode ? (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Log Transaction
            </Button>
          )
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Transaction" : "Log Transaction"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the details of this transaction."
              : "Add income or expense to this project."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <ProjectTransactionForm
            projectId={projectId}
            editTransaction={editTransaction}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
