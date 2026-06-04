import { useQuery } from "@apollo/client/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Plus, UserPlus, Users } from "lucide-react";
import { OrgHero } from "@/components/org/org-hero";
import { OrgStatsRow } from "@/components/org/org-stats-row";
import { Button } from "@/components/ui/button";
import { BrandLoader } from "@/components/ui/page-loader";
import { useAuth } from "@/hooks/use-auth";
import {
  MY_ORGANISATIONS_QUERY,
  ORG_UPCOMING_EVENTS_QUERY,
} from "@/lib/apollo/queries/organisations";
import { OrgRole } from "@/types/__generated__/graphql";
import { authGuard } from "@/utils/auth";

export const Route = createFileRoute("/org/$slug/")({
  component: OrgDashboardPage,
  beforeLoad: (ctx) => authGuard({ location: ctx.location }),
});

function OrgDashboardPage() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const { data: orgsData } = useQuery(MY_ORGANISATIONS_QUERY);
  const org = orgsData?.myOrganisations.find((o) => o.slug === slug);

  const { data: eventsData } = useQuery(ORG_UPCOMING_EVENTS_QUERY, {
    skip: !org,
  });

  if (!org) return <BrandLoader />;

  const isAdmin = org.members.find((m) => m.userId === user?.id)?.role === OrgRole.Admin;

  const upcomingEvents = eventsData?.orgUpcomingEvents ?? [];

  const quickActions = [
    {
      icon: Plus,
      label: "Record transaction",
      sub: "Log a sale, payment or loan",
      href: "/transactions/new",
    },
    {
      icon: CalendarDays,
      label: "Add event",
      sub: "Vaccination, Eid, breeding",
      href: `/org/${slug}/events`,
    },
    {
      icon: UserPlus,
      label: "Add contact",
      sub: "Buyer, vet, partner",
      href: "/contacts/new",
    },
    {
      icon: Users,
      label: "Invite member",
      sub: "Add staff or operator",
      href: `/org/${slug}/members`,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <OrgHero org={org} isAdmin={isAdmin} />
      <OrgStatsRow
        transactionCount={org.transactionCount}
        contactCount={org.contactCount}
        upcomingEventCount={upcomingEvents.length}
        activeProjectCount={org.activeProjectCount}
      />

      {/* Quick actions */}
      <div>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map(({ icon: Icon, label, sub, href }) => (
            <Link
              key={label}
              to={href as never}
              className="flex flex-col gap-1 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-150"
            >
              <Icon className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-[13px] font-semibold">{label}</span>
              <span className="text-[11px] text-muted-foreground">{sub}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming events preview */}
      {upcomingEvents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Upcoming events
            </h2>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to={`/org/${slug}/events` as never}>View all →</Link>
            </Button>
          </div>
          <div className="space-y-2">
            {upcomingEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex-shrink-0 w-10 text-center">
                  <p className="text-[9px] font-bold uppercase text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("en-NG", {
                      month: "short",
                    })}
                  </p>
                  <p className="text-lg font-black leading-tight">
                    {new Date(event.date).getDate()}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">{event.title}</p>
                  <p className="text-[11px] text-muted-foreground">{event.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
