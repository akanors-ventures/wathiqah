import { useMutation } from "@apollo/client/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type SelectedWitness, WitnessSelector } from "@/components/witnesses/WitnessSelector";
import { ADD_WITNESS, GET_TRANSACTION } from "@/lib/apollo/queries/transactions";

interface AddWitnessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
}

export function AddWitnessDialog({ isOpen, onClose, transactionId }: AddWitnessDialogProps) {
  const [selectedWitnesses, setSelectedWitnesses] = useState<SelectedWitness[]>([]);
  const [error, setError] = useState("");

  const [addWitness, { loading }] = useMutation(ADD_WITNESS, {
    refetchQueries: [{ query: GET_TRANSACTION, variables: { id: transactionId } }],
    onCompleted: () => {
      onClose();
      setSelectedWitnesses([]);
      setError("");
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWitnesses.length === 0) {
      setError("Please add at least one witness");
      return;
    }

    const witnessUserIds = selectedWitnesses.filter((w) => w.userId).map((w) => w.userId as string);
    const witnessInvites = selectedWitnesses
      .filter((w) => w.invite)
      .map((w) => w.invite as NonNullable<typeof w.invite>);

    try {
      await addWitness({
        variables: {
          input: {
            transactionId,
            witnessUserIds,
            witnessInvites,
          },
        },
      });
    } catch (_err) {
      // Error handled in onError
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Witnesses</DialogTitle>
          <DialogDescription>
            Search for existing users or invite new ones to witness this transaction.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          <WitnessSelector selectedWitnesses={selectedWitnesses} onChange={setSelectedWitnesses} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={loading}
              disabled={selectedWitnesses.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Add Witnesses
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
