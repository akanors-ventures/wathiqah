import { useQuery } from "@apollo/client/react";
import { createFileRoute } from "@tanstack/react-router";
import { isThisMonth, isThisWeek } from "date-fns";
import { CalendarDays, PenLine, Plus } from "lucide-react";
import { useState } from "react";
import { EventCard } from "@/components/org/event-card";
import { NoteEntry } from "@/components/org/note-entry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrandLoader } from "@/components/ui/page-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ORG_EVENT_CATEGORY_SUGGESTIONS_QUERY,
  ORG_NOTES_QUERY,
  ORG_UPCOMING_EVENTS_QUERY,
} from "@/lib/apollo/queries/organisations";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/org/$slug/events")({
  component: EventsPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function EventsPage() {
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();

  const { data: eventsData, loading: eventsLoading } = useQuery(ORG_UPCOMING_EVENTS_QUERY, {
    variables: { category: categoryFilter },
  });
  const { data: notesData } = useQuery(ORG_NOTES_QUERY, {
    variables: { category: categoryFilter },
  });
  const { data: suggestionsData } = useQuery(ORG_EVENT_CATEGORY_SUGGESTIONS_QUERY);

  const upcomingEvents = eventsData?.orgUpcomingEvents ?? [];
  const notes = notesData?.orgNotes ?? [];
  const suggestions = suggestionsData?.orgEventCategorySuggestions ?? [];

  // Group events by time horizon
  const thisWeekEvents = upcomingEvents.filter((e) => isThisWeek(new Date(e.date)));
  const thisMonthEvents = upcomingEvents.filter(
    (e) => !isThisWeek(new Date(e.date)) && isThisMonth(new Date(e.date)),
  );
  const laterEvents = upcomingEvents.filter(
    (e) => !isThisWeek(new Date(e.date)) && !isThisMonth(new Date(e.date)),
  );

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
          <Button variant="outline" size="sm">
            <PenLine className="h-4 w-4 mr-1.5" />
            Add Note
          </Button>
          <Button size="sm">
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
                      <EventCard key={e.id} event={e} />
                    ))}
                  </div>
                </section>
              )}

              {thisMonthEvents.length > 0 && (
                <section>
                  <SectionLabel>This month</SectionLabel>
                  <div className="space-y-2">
                    {thisMonthEvents.map((e) => (
                      <EventCard key={e.id} event={e} />
                    ))}
                  </div>
                </section>
              )}

              {laterEvents.length > 0 && (
                <section>
                  <SectionLabel>Upcoming</SectionLabel>
                  <div className="space-y-2">
                    {laterEvents.map((e) => (
                      <EventCard key={e.id} event={e} />
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
                className="w-full text-left p-4 rounded-xl border border-dashed border-border bg-background hover:border-primary/30 mb-4 transition-all"
              >
                <p className="text-[12px] font-semibold text-muted-foreground">+ Write a note…</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  Observations, records, decisions, meeting summaries — anything worth keeping
                </p>
              </button>

              <div className="space-y-3">
                {notes.map((note) => (
                  <NoteEntry key={note.id} note={note} />
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
                count={upcomingEvents.length}
                active={!categoryFilter}
                onClick={() => setCategoryFilter(undefined)}
              />
              {suggestions.map((cat) => (
                <FilterOption
                  key={cat}
                  label={cat}
                  count={upcomingEvents.filter((e) => e.category === cat).length}
                  active={categoryFilter === cat}
                  onClick={() => setCategoryFilter(cat === categoryFilter ? undefined : cat)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
