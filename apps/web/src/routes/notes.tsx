import { useMutation, useQuery } from "@apollo/client/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { PenLine, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { NoteFormValues } from "@/components/notes/NoteForm";
import { NoteForm } from "@/components/notes/NoteForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSubscription } from "@/hooks/useSubscription";
import { CREATE_NOTE, GET_USER_NOTES, REMOVE_NOTE, UPDATE_NOTE } from "@/lib/apollo/queries/notes";
import type { CreateNoteInput, Note, UpdateNoteInput } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/notes")({
  component: PersonalNotesPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function PersonalNotesPage() {
  const { isPro, maxNotes, loading: subLoading } = useSubscription();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const { data, refetch } = useQuery(GET_USER_NOTES);
  const [createNote] = useMutation(CREATE_NOTE);
  const [updateNote] = useMutation(UPDATE_NOTE);
  const [removeNote] = useMutation(REMOVE_NOTE);

  const notes = data?.userNotes ?? [];
  const atLimit = !subLoading && !isPro && maxNotes !== Infinity && notes.length >= maxNotes;

  function openCreate() {
    setEditingNote(null);
    setDialogOpen(true);
  }

  function openEdit(note: Note) {
    setEditingNote(note);
    setDialogOpen(true);
  }

  function handleDialogClose(open: boolean) {
    if (!open) {
      setDialogOpen(false);
      setEditingNote(null);
    }
  }

  async function handleSubmit(formData: NoteFormValues) {
    try {
      if (editingNote) {
        const input: UpdateNoteInput = {
          title: formData.title || undefined,
          body: formData.body,
          category: formData.category || undefined,
        };
        await updateNote({ variables: { id: editingNote.id, input } });
        toast.success("Note updated");
      } else {
        const input: CreateNoteInput = {
          title: formData.title || undefined,
          body: formData.body,
          category: formData.category || undefined,
        };
        await createNote({ variables: { input } });
        toast.success("Note saved");
      }
      await refetch();
      setDialogOpen(false);
      setEditingNote(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save note");
      throw err;
    }
  }

  async function handleDelete(id: string) {
    try {
      await removeNote({ variables: { id } });
      await refetch();
      setDialogOpen(false);
      setEditingNote(null);
      toast.success("Note deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Private notes on your financial interactions
          </p>
        </div>
        <Button size="sm" onClick={openCreate} disabled={atLimit}>
          <PenLine className="h-4 w-4 mr-1.5" />
          New Note
        </Button>
      </div>

      {/* Usage indicator for Free users */}
      {!isPro && maxNotes !== Infinity && (
        <div className="mb-5">
          {atLimit ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <Zap className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground">
                  Free note limit reached ({notes.length} / {maxNotes})
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Upgrade to Pro for unlimited notes.
                </p>
              </div>
              <Button asChild size="sm" className="shrink-0">
                <Link to="/pricing" search={{ reason: undefined }}>
                  Go Pro
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {notes.length} / {maxNotes} notes used
            </p>
          )}
        </div>
      )}

      {/* Write prompt */}
      {!atLimit && (
        <button
          type="button"
          onClick={openCreate}
          className="w-full text-left p-4 rounded-xl border border-dashed border-border bg-background hover:border-primary/30 mb-4 transition-all"
        >
          <p className="text-[12px] font-semibold text-muted-foreground">+ Write a note…</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            Observations, context, reminders — anything worth keeping
          </p>
        </button>
      )}

      <div className="space-y-3">
        {notes.map((note) => (
          <PersonalNoteEntry key={note.id} note={note} onEdit={openEdit} />
        ))}
      </div>

      {notes.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <PenLine className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No notes yet</p>
          <p className="text-xs mt-1">Add your first note to get started</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Note" : "New Note"}</DialogTitle>
          </DialogHeader>
          <NoteForm
            key={editingNote?.id ?? "new-note"}
            defaultValues={
              editingNote
                ? {
                    title: editingNote.title ?? "",
                    body: editingNote.body,
                    category: editingNote.category ?? "",
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            onDelete={editingNote ? () => handleDelete(editingNote.id) : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── PersonalNoteEntry ────────────────────────────────────────────────────────

function PersonalNoteEntry({ note, onEdit }: { note: Note; onEdit: (note: Note) => void }) {
  return (
    <button
      type="button"
      className="w-full text-left p-4 rounded-xl bg-muted/30 border border-border cursor-pointer hover:border-border/80 hover:shadow-sm transition-all duration-150"
      onClick={() => onEdit(note)}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-bold text-foreground/70">
          {format(new Date(note.createdAt), "EEE, d MMM yyyy")}
        </p>
      </div>
      {note.title && <p className="text-[13px] font-bold text-foreground mb-1">{note.title}</p>}
      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{note.body}</p>
      {note.category && (
        <div className="mt-3">
          <Badge variant="secondary" className="text-[10px] font-bold uppercase">
            {note.category}
          </Badge>
        </div>
      )}
    </button>
  );
}
