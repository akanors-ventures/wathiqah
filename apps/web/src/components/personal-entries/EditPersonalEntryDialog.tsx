import { PersonalEntryForm } from "@/components/personal-entries/PersonalEntryForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PersonalEntryFieldsFragment } from "@/types/__generated__/graphql";

interface EditPersonalEntryDialogProps {
  entry: PersonalEntryFieldsFragment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPersonalEntryDialog({
  entry,
  open,
  onOpenChange,
}: EditPersonalEntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Personal Entry</DialogTitle>
        </DialogHeader>
        <PersonalEntryForm entry={entry} onSuccess={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
