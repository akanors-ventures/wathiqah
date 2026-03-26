import { useMutation } from "@apollo/client/react";
import { createFileRoute } from "@tanstack/react-router";
import { Filter, Plus, Search, User } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/page-loader";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContactFilters } from "@/hooks/useContactFilters";
import { useContacts } from "@/hooks/useContacts";
import { useItems } from "@/hooks/useItems";
import { GET_CONTACTS, INVITE_CONTACT } from "@/lib/apollo/queries/contacts";
import type { GetContactsQuery } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";
import { useState } from "react";

export const Route = createFileRoute("/contacts/")({
  component: ContactsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

type ContactItem = GetContactsQuery["contacts"]["items"][number];

function ContactsPage() {
  const {
    search,
    setSearch,
    balanceStanding,
    setBalanceStanding,
    page,
    setPage,
    limit,
    setLimit,
    variables,
  } = useContactFilters();

  const { contacts, total, loading, error, deleteContact } = useContacts(variables.filter);

  const { items } = useItems();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [deletingContact, setDeletingContact] = useState<ContactItem | null>(null);

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

  const handleEdit = (contact: ContactItem) => {
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

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-background"
          />
        </div>
        <Select
          value={balanceStanding}
          onValueChange={(v) => setBalanceStanding(v as typeof balanceStanding)}
        >
          <SelectTrigger className="sm:w-[200px]">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Balance Standing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Contacts</SelectItem>
            <SelectItem value="OWED_TO_ME">They Owe Me</SelectItem>
            <SelectItem value="I_OWE">I Owe Them</SelectItem>
          </SelectContent>
        </Select>
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
            {search || balanceStanding !== "ALL"
              ? "Try adjusting your filters."
              : "Get started by adding your first contact."}
          </p>
          {!search && balanceStanding === "ALL" && (
            <Button onClick={() => setIsFormOpen(true)} variant="outline">
              Create Contact
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => {
              const contactItems = items.filter((item) => item.contactId === contact.id);
              const lentCount = contactItems.filter((i) => i.status === "LENT").length;
              const borrowedCount = contactItems.filter((i) => i.status === "BORROWED").length;

              return (
                <ContactCard
                  key={contact.id}
                  contact={{
                    ...contact,
                    lentCount,
                    borrowedCount,
                  }}
                  onEdit={handleEdit}
                  onDelete={(c) => setDeletingContact(c as ContactItem)}
                  onInvite={handleInvite}
                />
              );
            })}
          </div>
          <Pagination
            total={total}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </>
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
