import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ProjectTransactionType } from "@/types/__generated__/graphql";
import { ProjectTransactionForm } from "./ProjectTransactionForm";

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
  /** External open state — when provided, the dialog is fully controlled by the caller */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProjectTransactionDialog({
  projectId,
  trigger,
  editTransaction,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ProjectTransactionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? setInternalOpen) : setInternalOpen;

  const isEditMode = !!editTransaction;

  const defaultTrigger = isEditMode ? (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Pencil className="w-3.5 h-3.5" />
    </Button>
  ) : (
    <Button>
      <Plus className="w-4 h-4 mr-2" /> Log Transaction
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>}
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
