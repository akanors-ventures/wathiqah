import { useMutation } from "@apollo/client/react";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CREATE_CONTACT, GET_CONTACTS, UPDATE_CONTACT } from "@/lib/apollo/queries/contacts";
import { useSubscription } from "@/hooks/useSubscription";
import { useContacts } from "@/hooks/useContacts";
import type { Contact } from "@/types/__generated__/graphql";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type ContactMinimal = Pick<Contact, "id" | "name" | "email" | "phoneNumber">;

interface ContactFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: ContactMinimal | null;
}

export function ContactFormDialog({ isOpen, onClose, contact }: ContactFormDialogProps) {
  const { maxContacts } = useSubscription();
  const { contacts } = useContacts();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const nameId = useId();
  const emailId = useId();
  const phoneId = useId();

  const isEditing = !!contact;
  const isAtLimit =
    !isEditing && maxContacts !== Infinity && contacts.length >= maxContacts && maxContacts > 0;

  useEffect(() => {
    if (isOpen) {
      if (contact) {
        setName(contact.name);
        setEmail(contact.email || "");
        setPhoneNumber(contact.phoneNumber || "");
      } else {
        setName("");
        setEmail("");
        setPhoneNumber("");
      }
      setError("");
    }
  }, [contact, isOpen]);

  const [createContact, { loading: creating }] = useMutation(CREATE_CONTACT, {
    refetchQueries: [{ query: GET_CONTACTS }],
    onCompleted: () => onClose(),
    onError: (err) => setError(err.message),
  });

  const [updateContact, { loading: updating }] = useMutation(UPDATE_CONTACT, {
    refetchQueries: [{ query: GET_CONTACTS }],
    onCompleted: () => onClose(),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (isAtLimit) {
      setError(
        `You have reached your limit of ${maxContacts} contacts. Upgrade to PRO for unlimited contacts.`,
      );
      return;
    }

    try {
      if (isEditing) {
        await updateContact({
          variables: {
            updateContactInput: {
              id: contact.id,
              name,
              email: email?.trim().toLowerCase() || null,
              phoneNumber: phoneNumber || null,
            },
          },
        });
      } else {
        await createContact({
          variables: {
            createContactInput: {
              name,
              email: email?.trim().toLowerCase() || null,
              phoneNumber: phoneNumber || null,
            },
          },
        });
      }
    } catch (_err) {
      // Error handled in onError
    }
  };

  const loading = creating || updating;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Contact" : "Add New Contact"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the contact details below."
              : isAtLimit
                ? "You have reached your contact limit. Upgrade to add more."
                : "Enter the details for your new contact."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-2 rounded border border-red-200 dark:border-red-900 flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor={nameId}>
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ahmad Sulaiman"
              required
              disabled={isAtLimit}
            />
            <p className="text-[0.8rem] text-muted-foreground">First name first, last name last.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ahmad.sulaiman@example.com"
              disabled={isAtLimit}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={phoneId}>Phone Number</Label>
            <Input
              id={phoneId}
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+234..."
              disabled={isAtLimit}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={loading}
              disabled={isAtLimit}
              className={cn("bg-emerald-600 hover:bg-emerald-700", isAtLimit && "opacity-50")}
            >
              {isAtLimit && <Lock className="w-4 h-4 mr-2" />}
              {isEditing ? "Save Changes" : "Create Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
