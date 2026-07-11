import { useMutation, useQuery, useSubscription } from "@apollo/client/react";
import { createFileRoute } from "@tanstack/react-router";
import { isThisMonth, isThisWeek } from "date-fns";
import { CalendarDays, PenLine, Plus } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { NoteFormValues } from "@/components/notes/NoteForm";
import { NoteForm } from "@/components/notes/NoteForm";
import { EventCard } from "@/components/org/event-card";
import { NoteEntry } from "@/components/org/note-entry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLoader } from "@/components/ui/page-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useOrgFromSlug } from "@/hooks/use-org-from-slug";
import { removeById, replaceById, upsertById } from "@/lib/apollo/org-live-updates";
import {
  CREATE_ORG_EVENT_MUTATION,
  CREATE_ORG_NOTE_MUTATION,
  ORG_EVENT_CATEGORY_SUGGESTIONS_QUERY,
  ORG_EVENT_CREATED_SUBSCRIPTION,
  ORG_EVENT_REMOVED_SUBSCRIPTION,
  ORG_EVENT_UPDATED_SUBSCRIPTION,
  ORG_NOTE_CREATED_SUBSCRIPTION,
  ORG_NOTE_REMOVED_SUBSCRIPTION,
  ORG_NOTE_UPDATED_SUBSCRIPTION,
  ORG_NOTES_QUERY,
  ORG_UPCOMING_EVENTS_QUERY,
  REMOVE_ORG_EVENT_MUTATION,
  REMOVE_ORG_NOTE_MUTATION,
  UPDATE_ORG_EVENT_MUTATION,
  UPDATE_ORG_NOTE_MUTATION,
} from "@/lib/apollo/queries/organisations";
import type {
  CreateNoteInput,
  CreateOrgEventInput,
  Note,
  OrgEvent,
  UpdateNoteInput,
  UpdateOrgEventInput,
} from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/org/$slug/events")({
  component: EventsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

// ─── Event form types ────────────────────────────────────────────────────────

type EventFormValues = {
  title: string;
  date: string;
  category: string;
  notes: string;
  isRecurring: boolean;
  recurrence: string;
};

// ─── Helper: format DateTime string to YYYY-MM-DD ────────────────────────────

function toDateInputValue(isoString: string): string {
  // isoString may be "2026-06-01T00:00:00.000Z" or "2026-06-01"
  return isoString.split("T")[0];
}

// ─── EventsPage ──────────────────────────────────────────────────────────────

function EventsPage() {
  const { slug } = Route.useParams();
  const { isSyncing } = useOrgFromSlug(slug);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();

  // ── Dialog state ──
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<OrgEvent | null>(null);

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // ── Queries ──
  // Note: category filtering is done client-side so sidebar counts remain accurate across
  // all categories. The backend scopes results to the active org via JWT (@ActiveOrg()).
  const {
    data: eventsData,
    loading: eventsLoading,
    refetch: refetchEvents,
  } = useQuery(ORG_UPCOMING_EVENTS_QUERY);
  const { data: notesData, refetch: refetchNotes } = useQuery(ORG_NOTES_QUERY);
  const { data: suggestionsData, refetch: refetchCategorySuggestions } = useQuery(
    ORG_EVENT_CATEGORY_SUGGESTIONS_QUERY,
  );

  // ── Live updates ──
  // Another org member's create/update/delete arrives here and is merged
  // directly into the cache so this page updates without a manual refresh.
  // The acting member already sees their own change via the refetch in each
  // handler below; these merges are id-deduped so a redundant delivery of
  // the actor's own event (the server broadcasts to all org subscribers,
  // including the sender) is a harmless no-op.
  useSubscription(ORG_NOTE_CREATED_SUBSCRIPTION, {
    onData: ({ client, data }) => {
      const note = data.data?.orgNoteCreated;
      if (!note) return;
      client.cache.updateQuery({ query: ORG_NOTES_QUERY }, (existing) =>
        existing ? { orgNotes: upsertById(existing.orgNotes, note) } : existing,
      );
    },
  });
  useSubscription(ORG_NOTE_UPDATED_SUBSCRIPTION, {
    onData: ({ client, data }) => {
      const note = data.data?.orgNoteUpdated;
      if (!note) return;
      client.cache.updateQuery({ query: ORG_NOTES_QUERY }, (existing) =>
        existing ? { orgNotes: replaceById(existing.orgNotes, note) } : existing,
      );
    },
  });
  useSubscription(ORG_NOTE_REMOVED_SUBSCRIPTION, {
    onData: ({ client, data }) => {
      const id = data.data?.orgNoteRemoved;
      if (!id) return;
      client.cache.updateQuery({ query: ORG_NOTES_QUERY }, (existing) =>
        existing ? { orgNotes: removeById(existing.orgNotes, id) } : existing,
      );
    },
  });
  useSubscription(ORG_EVENT_CREATED_SUBSCRIPTION, {
    onData: ({ client, data }) => {
      const event = data.data?.orgEventCreated;
      if (!event) return;
      client.cache.updateQuery({ query: ORG_UPCOMING_EVENTS_QUERY }, (existing) =>
        existing ? { orgUpcomingEvents: upsertById(existing.orgUpcomingEvents, event) } : existing,
      );
    },
  });
  useSubscription(ORG_EVENT_UPDATED_SUBSCRIPTION, {
    onData: ({ client, data }) => {
      const event = data.data?.orgEventUpdated;
      if (!event) return;
      client.cache.updateQuery({ query: ORG_UPCOMING_EVENTS_QUERY }, (existing) =>
        existing ? { orgUpcomingEvents: replaceById(existing.orgUpcomingEvents, event) } : existing,
      );
    },
  });
  useSubscription(ORG_EVENT_REMOVED_SUBSCRIPTION, {
    onData: ({ client, data }) => {
      const id = data.data?.orgEventRemoved;
      if (!id) return;
      client.cache.updateQuery({ query: ORG_UPCOMING_EVENTS_QUERY }, (existing) =>
        existing ? { orgUpcomingEvents: removeById(existing.orgUpcomingEvents, id) } : existing,
      );
    },
  });

  // ── Mutations ──
  const [createOrgEvent] = useMutation(CREATE_ORG_EVENT_MUTATION);
  const [updateOrgEvent] = useMutation(UPDATE_ORG_EVENT_MUTATION);
  const [removeOrgEvent] = useMutation(REMOVE_ORG_EVENT_MUTATION);
  const [createOrgNote] = useMutation(CREATE_ORG_NOTE_MUTATION);
  const [updateOrgNote] = useMutation(UPDATE_ORG_NOTE_MUTATION);
  const [removeOrgNote] = useMutation(REMOVE_ORG_NOTE_MUTATION);

  // Keep full lists for sidebar counts; apply category filter only for display
  const allUpcomingEvents = eventsData?.orgUpcomingEvents ?? [];
  const allNotes = notesData?.orgNotes ?? [];
  const suggestions = suggestionsData?.orgEventCategorySuggestions ?? [];

  const upcomingEvents = categoryFilter
    ? allUpcomingEvents.filter((e) => e.category === categoryFilter)
    : allUpcomingEvents;
  const notes = categoryFilter ? allNotes.filter((n) => n.category === categoryFilter) : allNotes;

  // Group events by time horizon
  const thisWeekEvents = upcomingEvents.filter((e) => isThisWeek(new Date(e.date)));
  const thisMonthEvents = upcomingEvents.filter(
    (e) => !isThisWeek(new Date(e.date)) && isThisMonth(new Date(e.date)),
  );
  const laterEvents = upcomingEvents.filter(
    (e) => !isThisWeek(new Date(e.date)) && !isThisMonth(new Date(e.date)),
  );

  // ── Event dialog handlers ──

  function openCreateEvent() {
    setEditingEvent(null);
    setEventDialogOpen(true);
  }

  function openEditEvent(event: OrgEvent) {
    setEditingEvent(event);
    setEventDialogOpen(true);
  }

  function handleEventDialogClose(open: boolean) {
    if (!open) {
      setEventDialogOpen(false);
      setEditingEvent(null);
    }
  }

  async function handleEventSubmit(formData: EventFormValues) {
    try {
      if (editingEvent) {
        const updateInput: UpdateOrgEventInput = {
          title: formData.title,
          date: formData.date,
          category: formData.category,
          notes: formData.notes || undefined,
          isRecurring: formData.isRecurring,
          recurrence: formData.isRecurring && formData.recurrence ? formData.recurrence : undefined,
        };
        await updateOrgEvent({ variables: { id: editingEvent.id, input: updateInput } });
        toast.success("Event updated");
      } else {
        const createInput: CreateOrgEventInput = {
          title: formData.title,
          date: formData.date,
          category: formData.category,
          notes: formData.notes || undefined,
          isRecurring: formData.isRecurring,
          recurrence: formData.isRecurring && formData.recurrence ? formData.recurrence : undefined,
        };
        await createOrgEvent({ variables: { input: createInput } });
        toast.success("Event added");
      }
      await Promise.all([refetchEvents(), refetchCategorySuggestions()]);
      setEventDialogOpen(false);
      setEditingEvent(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save event");
      throw err;
    }
  }

  async function handleDeleteEvent(id: string) {
    try {
      await removeOrgEvent({ variables: { id } });
      await Promise.all([refetchEvents(), refetchCategorySuggestions()]);
      setEventDialogOpen(false);
      setEditingEvent(null);
      toast.success("Event deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete event");
    }
  }

  // ── Note dialog handlers ──

  function openCreateNote() {
    setEditingNote(null);
    setNoteDialogOpen(true);
  }

  function openEditNote(note: Note) {
    setEditingNote(note);
    setNoteDialogOpen(true);
  }

  function handleNoteDialogClose(open: boolean) {
    if (!open) {
      setNoteDialogOpen(false);
      setEditingNote(null);
    }
  }

  async function handleNoteSubmit(formData: NoteFormValues) {
    try {
      if (editingNote) {
        const updateInput: UpdateNoteInput = {
          title: formData.title || undefined,
          body: formData.body,
          category: formData.category || undefined,
        };
        await updateOrgNote({ variables: { id: editingNote.id, input: updateInput } });
        toast.success("Note updated");
      } else {
        const createInput: CreateNoteInput = {
          title: formData.title || undefined,
          body: formData.body,
          category: formData.category || undefined,
        };
        await createOrgNote({ variables: { input: createInput } });
        toast.success("Note saved");
      }
      await refetchNotes();
      setNoteDialogOpen(false);
      setEditingNote(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save note");
      throw err;
    }
  }

  async function handleDeleteNote(id: string) {
    try {
      await removeOrgNote({ variables: { id } });
      await refetchNotes();
      setNoteDialogOpen(false);
      setEditingNote(null);
      toast.success("Note deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    }
  }

  if (isSyncing) return <BrandLoader />;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Events &amp; Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Important dates, schedules, and organisation records
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openCreateNote}>
            <PenLine className="h-4 w-4 mr-1.5" />
            Add Note
          </Button>
          <Button size="sm" onClick={openCreateEvent}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Event
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-6">
        {/* Main content */}
        <div>
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">
                Upcoming
                <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">
                  {upcomingEvents.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="notes">
                Notes
                <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">
                  {notes.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-4 space-y-6">
              {eventsLoading && <BrandLoader />}

              {thisWeekEvents.length > 0 && (
                <section>
                  <SectionLabel>This week</SectionLabel>
                  <div className="space-y-2">
                    {thisWeekEvents.map((e) => (
                      <EventCard key={e.id} event={e} onEdit={openEditEvent} />
                    ))}
                  </div>
                </section>
              )}

              {thisMonthEvents.length > 0 && (
                <section>
                  <SectionLabel>This month</SectionLabel>
                  <div className="space-y-2">
                    {thisMonthEvents.map((e) => (
                      <EventCard key={e.id} event={e} onEdit={openEditEvent} />
                    ))}
                  </div>
                </section>
              )}

              {laterEvents.length > 0 && (
                <section>
                  <SectionLabel>Upcoming</SectionLabel>
                  <div className="space-y-2">
                    {laterEvents.map((e) => (
                      <EventCard key={e.id} event={e} onEdit={openEditEvent} />
                    ))}
                  </div>
                </section>
              )}

              {upcomingEvents.length === 0 && !eventsLoading && (
                <div className="text-center py-16 text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No upcoming events</p>
                  <p className="text-xs mt-1">Add your first event to get started</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              {/* Write prompt */}
              <button
                type="button"
                onClick={openCreateNote}
                className="w-full text-left p-4 rounded-xl border border-dashed border-border bg-background hover:border-primary/30 mb-4 transition-all"
              >
                <p className="text-[12px] font-semibold text-muted-foreground">+ Write a note…</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  Observations, records, decisions, meeting summaries — anything worth keeping
                </p>
              </button>

              <div className="space-y-3">
                {notes.map((note) => (
                  <NoteEntry key={note.id} note={note} onEdit={openEditNote} />
                ))}
              </div>

              {notes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <PenLine className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No notes yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar filters */}
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Filter by category
            </p>
            <div className="space-y-0.5">
              <FilterOption
                label="All"
                count={allUpcomingEvents.length}
                active={!categoryFilter}
                onClick={() => setCategoryFilter(undefined)}
              />
              {suggestions.map((cat) => (
                <FilterOption
                  key={cat}
                  label={cat}
                  count={allUpcomingEvents.filter((e) => e.category === cat).length}
                  active={categoryFilter === cat}
                  onClick={() => setCategoryFilter(cat === categoryFilter ? undefined : cat)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Event Dialog ── */}
      <Dialog open={eventDialogOpen} onOpenChange={handleEventDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "New Event"}</DialogTitle>
          </DialogHeader>
          <EventForm
            key={editingEvent?.id ?? "new-event"}
            suggestions={suggestions}
            defaultValues={
              editingEvent
                ? {
                    title: editingEvent.title,
                    date: toDateInputValue(editingEvent.date),
                    category: editingEvent.category,
                    notes: editingEvent.notes ?? "",
                    isRecurring: editingEvent.isRecurring,
                    recurrence: editingEvent.recurrence ?? "",
                  }
                : undefined
            }
            onSubmit={handleEventSubmit}
            onDelete={editingEvent ? () => handleDeleteEvent(editingEvent.id) : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* ── Note Dialog ── */}
      <Dialog open={noteDialogOpen} onOpenChange={handleNoteDialogClose}>
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
            onSubmit={handleNoteSubmit}
            onDelete={editingNote ? () => handleDeleteNote(editingNote.id) : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── EventForm ───────────────────────────────────────────────────────────────

function EventForm({
  defaultValues,
  suggestions,
  onSubmit,
  onDelete,
}: {
  defaultValues?: Partial<EventFormValues>;
  suggestions: string[];
  onSubmit: (values: EventFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    defaultValues: {
      title: "",
      date: "",
      category: "",
      notes: "",
      isRecurring: false,
      recurrence: "",
      ...defaultValues,
    },
  });

  const isRecurring = watch("isRecurring");

  const titleId = useId();
  const dateId = useId();
  const categoryId = useId();
  const notesId = useId();
  const recurringId = useId();
  const recurrenceId = useId();

  async function handleFormSubmit(values: EventFormValues) {
    await onSubmit(values);
    reset();
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label htmlFor={titleId}>Title</Label>
        <Input
          id={titleId}
          placeholder="Event title"
          {...register("title", { required: "Title is required" })}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={dateId}>Date</Label>
        <input
          id={dateId}
          type="date"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          {...register("date", { required: "Date is required" })}
        />
        {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={categoryId}>Category</Label>
        <Input
          id={categoryId}
          list={`${categoryId}-list`}
          placeholder={
            suggestions.length > 0
              ? "Select or type a category"
              : "e.g. Vaccination, Islamic Calendar, Breeding"
          }
          autoComplete="off"
          {...register("category", { required: "Category is required" })}
        />
        {suggestions.length > 0 && (
          <datalist id={`${categoryId}-list`}>
            {suggestions.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        )}
        {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={notesId}>Notes</Label>
        <Textarea
          id={notesId}
          placeholder="Optional notes about this event"
          {...register("notes")}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id={recurringId}
          type="checkbox"
          checked={isRecurring}
          onChange={(e) => setValue("isRecurring", e.target.checked)}
          className="h-4 w-4 rounded border border-input accent-primary cursor-pointer"
        />
        <Label htmlFor={recurringId} className="cursor-pointer font-normal">
          Recurring event
        </Label>
      </div>

      {isRecurring && (
        <div className="space-y-1.5">
          <Label htmlFor={recurrenceId}>Recurrence</Label>
          <Input
            id={recurrenceId}
            placeholder="e.g. WEEKLY, ANNUALLY"
            {...register("recurrence")}
          />
        </div>
      )}

      <DialogFooter className="gap-2 pt-2">
        {onDelete && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive border-destructive hover:bg-destructive/10 mr-auto"
            onClick={onDelete}
            disabled={isSubmitting}
          >
            Delete
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : defaultValues?.title ? "Save changes" : "Add Event"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {children}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─── FilterOption ─────────────────────────────────────────────────────────────

function FilterOption({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors text-[12px] font-medium ${
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          : "text-muted-foreground hover:bg-muted/50"
      }`}
    >
      <span>{label}</span>
      <span className="text-[10px] font-bold">{count}</span>
    </button>
  );
}
