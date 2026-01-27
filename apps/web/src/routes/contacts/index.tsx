import { useMutation } from "@apollo/client/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  History,
  Mail,
  MoreVertical,
  Package,
  Pencil,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { BalanceIndicator } from "@/components/ui/balance-indicator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to get item status for a contact
  const getContactItemsStatus = (contactId: string) => {
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
            <div
              key={contact.id}
              className="group relative bg-card border border-border/50 rounded-3xl transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-primary/40 overflow-hidden flex flex-col"
            >
              <div className="p-4 flex-1 flex flex-col relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4 items-center min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg shadow-primary/20 group-hover:scale-105 group-hover:-rotate-3 transition-all duration-500">
                        {contact.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div className="absolute -bottom-1.5 -right-1.5 p-1 rounded-full bg-background border border-border/50 shadow-md">
                        <div
                          className={`w-3 h-3 rounded-full ${contact.balance >= 0 ? "bg-emerald-500" : "bg-rose-500"} ring-4 ring-background shadow-inner`}
                        />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <Link
                        to="/contacts/$contactId"
                        params={{ contactId: contact.id }}
                        className="block group/name"
                      >
                        <h3 className="font-extrabold text-xl text-foreground truncate group-hover/name:text-primary transition-colors flex items-center gap-2 tracking-tight">
                          {contact.name ?? "Unnamed"}
                          <ArrowRight className="w-5 h-5 opacity-0 -translate-x-3 group-hover/name:opacity-100 group-hover/name:translate-x-0 transition-all duration-300 text-primary/60" />
                        </h3>
                      </Link>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {contact.isOnPlatform ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold py-0.5 px-2 flex items-center gap-1 shadow-sm"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            Platform Member
                          </Badge>
                        ) : contact.hasPendingInvitation ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold py-0.5 px-2 flex items-center gap-1 shadow-sm"
                          >
                            <Clock className="w-3 h-3" />
                            Invitation Sent
                          </Badge>
                        ) : contact.email ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleInvite(contact.id);
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-white transition-all bg-primary/10 hover:bg-primary py-0.5 px-2 rounded-full border border-primary/20 hover:border-primary shadow-sm active:scale-95"
                          >
                            <UserPlus className="w-3 h-3" />
                            Invite to Platform
                          </button>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-muted/50 text-muted-foreground border-border/50 text-[10px] font-medium py-0.5 px-2 flex items-center gap-1 italic opacity-60"
                          >
                            No Email Added
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-2xl transition-all"
                      >
                        <MoreVertical className="h-6 w-6" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-60 p-2 rounded-2xl border-border/40 shadow-2xl backdrop-blur-xl bg-background/95"
                    >
                      <DropdownMenuItem
                        asChild
                        className="rounded-xl py-3 cursor-pointer focus:bg-primary/5"
                      >
                        <Link
                          to="/contacts/$contactId"
                          params={{ contactId: contact.id }}
                          className="flex items-center w-full"
                        >
                          <History className="w-5 h-5 mr-3 text-primary/70" />
                          <span className="font-semibold">View History</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEdit(contact)}
                        className="rounded-xl py-3 cursor-pointer focus:bg-primary/5"
                      >
                        <Pencil className="w-5 h-5 mr-3 text-primary/70" />
                        <span className="font-semibold">Edit Contact</span>
                      </DropdownMenuItem>
                      <div className="h-px bg-border/50 my-1.5 mx-2" />
                      <DropdownMenuItem
                        onClick={() => setDeletingContact(contact)}
                        className="rounded-xl py-3 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                      >
                        <Trash2 className="w-5 h-5 mr-3" />
                        <span className="font-bold">Delete Profile</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mb-4 p-3 rounded-3xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/30 backdrop-blur-sm relative overflow-hidden group/balance transition-all hover:border-primary/20">
                  <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-1000" />
                  <div className="relative flex justify-between items-center">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5 text-primary/60" /> Net Standing
                      </span>
                      <BalanceIndicator
                        amount={contact.balance}
                        className="text-2xl font-black py-0 px-0 h-auto shadow-none border-none bg-transparent dark:bg-transparent w-fit"
                      />
                    </div>
                    <div
                      className={`p-2 rounded-2xl ${contact.balance >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"} transition-all duration-500 group-hover/balance:scale-110 group-hover/balance:rotate-3 shadow-sm`}
                    >
                      <Wallet className="w-5 h-5 opacity-60 group-hover/balance:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mt-auto">
                  <div className="grid grid-cols-1 gap-3">
                    {contact.email && (
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(contact.email as string, `email-${contact.id}`)
                        }
                        className="flex items-center gap-4 text-sm text-muted-foreground hover:text-primary transition-all group/item text-left w-full"
                      >
                        <div className="w-9 h-9 rounded-2xl bg-muted/30 border border-transparent group-hover/item:border-primary/30 group-hover/item:bg-primary/5 flex items-center justify-center transition-all shadow-sm shrink-0">
                          {copiedId === `email-${contact.id}` ? (
                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                          ) : (
                            <Mail className="w-4.5 h-4.5" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 group-hover/item:text-primary/60">
                            Email Address
                          </span>
                          <span className="truncate font-semibold tracking-tight">
                            {contact.email}
                          </span>
                        </div>
                        <Copy className="w-4 h-4 ml-auto opacity-0 group-hover/item:opacity-40 transition-opacity" />
                      </button>
                    )}
                    {contact.phoneNumber && (
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(contact.phoneNumber as string, `phone-${contact.id}`)
                        }
                        className="flex items-center gap-4 text-sm text-muted-foreground hover:text-primary transition-all group/item text-left w-full"
                      >
                        <div className="w-9 h-9 rounded-2xl bg-muted/30 border border-transparent group-hover/item:border-primary/30 group-hover/item:bg-primary/5 flex items-center justify-center transition-all shadow-sm shrink-0">
                          {copiedId === `phone-${contact.id}` ? (
                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                          ) : (
                            <Phone className="w-4.5 h-4.5" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 group-hover/item:text-primary/60">
                            Phone Number
                          </span>
                          <span className="font-semibold tracking-tight">
                            {contact.phoneNumber}
                          </span>
                        </div>
                        <Copy className="w-4 h-4 ml-auto opacity-0 group-hover/item:opacity-40 transition-opacity" />
                      </button>
                    )}
                  </div>

                  {getContactItemsStatus(contact.id) && (
                    <div className="pt-4 border-t border-border/30 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-muted/30 border border-transparent flex items-center justify-center shrink-0 shadow-sm">
                        <Package className="w-5 h-5 text-primary/60" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-1.5">
                          Asset Inventory
                        </span>
                        {getContactItemsStatus(contact.id)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0">
                <div className="bg-muted/30 rounded-2xl p-1.5 flex gap-1.5 border border-border/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="flex-1 h-10 rounded-xl hover:bg-primary hover:text-primary-foreground font-black text-[10px] uppercase tracking-[0.15em] transition-all shadow-none group/btn"
                  >
                    <Link to="/transactions/new" search={{ contactId: contact.id }}>
                      <Send className="w-4 h-4 mr-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                      Send Funds
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="flex-1 h-10 rounded-xl hover:bg-primary hover:text-primary-foreground font-black text-[10px] uppercase tracking-[0.15em] transition-all shadow-none group/btn"
                  >
                    <Link to="/items/new" search={{ contactId: contact.id }}>
                      <Package className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                      New Asset
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
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
