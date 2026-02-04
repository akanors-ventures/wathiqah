import { useMutation } from "@apollo/client/react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, User } from "lucide-react";
import { useMemo, useState } from "react";
import { ContactCard } from "@/components/contacts/ContactCard";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { useContacts } from "@/hooks/useContacts";
import { useItems } from "@/hooks/useItems"; // Import useItems
import { GET_CONTACTS, INVITE_CONTACT } from "@/lib/apollo/queries/contacts";
import type { GetContactsQuery } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/contacts/")({
  component: ContactsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function ContactsPage() {
  const { contacts: allContacts, loading, error, deleteContact } = useContacts();
  const { items } = useItems(); // Fetch items

  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<GetContactsQuery["contacts"][number] | null>(
    null,
  );
  const [deletingContact, setDeletingContact] = useState<
    GetContactsQuery["contacts"][number] | null
  >(null);

  const [inviteContact] = useMutation(INVITE_CONTACT, {
    refetchQueries: [{ query: GET_CONTACTS }],
  });

  const handleInvite = async (contactId: string) => {
    try {
      await inviteContact({ variables: { contactId } });
    } catch (err) {
      console.error("Failed to invite contact:", err);
    }
  };

  const contacts = useMemo(() => {
    if (!allContacts.length) return [];
    const q = searchQuery.toLowerCase();
    return allContacts.filter(
      (contact) =>
        (contact.name?.toLowerCase().includes(q) ?? false) ||
        (contact.email?.toLowerCase().includes(q) ?? false) ||
        (contact.phoneNumber?.includes(searchQuery) ?? false),
    );
  }, [allContacts, searchQuery]);

  const [_copiedId, _setCopiedId] = useState<string | null>(null);

  const _copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    _setCopiedId(id);
    setTimeout(() => _setCopiedId(null), 2000);
  };

  // Helper to get item status for a contact
  const _getContactItemsStatus = (contactId: string) => {
    const contactItems = items.filter((item) => item.contactId === contactId);
    const lentCount = contactItems.filter((i) => i.status === "LENT").length;
    const borrowedCount = contactItems.filter((i) => i.status === "BORROWED").length;

    if (lentCount === 0 && borrowedCount === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {lentCount > 0 && (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] px-2 py-0 h-5 font-semibold"
          >
            Lent: {lentCount}
          </Badge>
        )}
        {borrowedCount > 0 && (
          <Badge
            variant="outline"
            className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] px-2 py-0 h-5 font-semibold"
          >
            Borrowed: {borrowedCount}
          </Badge>
        )}
      </div>
    );
  };

  const handleEdit = (contact: GetContactsQuery["contacts"][number]) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingContact) {
      try {
        await deleteContact(deletingContact.id);
      } catch (err) {
        console.error("Failed to delete contact:", err);
      }
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingContact(null);
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal and professional connections.
          </p>
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name (e.g. Ahmad Sulaiman), email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 bg-background"
        />
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="p-8 text-center text-red-500 border border-red-200 bg-red-50 rounded-lg">
          Error loading contacts: {error.message}
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-xl bg-muted/50">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <User className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">No contacts found</h3>
          <p className="text-muted-foreground mt-1 mb-6">
            {searchQuery
              ? "Try adjusting your search terms."
              : "Get started by adding your first contact."}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsFormOpen(true)} variant="outline">
              Create Contact
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onEdit={handleEdit}
              onDelete={setDeletingContact}
              onInvite={handleInvite}
            />
          ))}
        </div>
      )}

      <ContactFormDialog isOpen={isFormOpen} onClose={handleCloseForm} contact={editingContact} />

      <AlertDialog
        open={!!deletingContact}
        onOpenChange={(open) => !open && setDeletingContact(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the contact
              <strong> {deletingContact?.name}</strong> and remove them from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
