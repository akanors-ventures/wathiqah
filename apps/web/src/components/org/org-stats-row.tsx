interface StatCellProps {
  label: string;
  value: string | number;
  sub?: string;
}

function StatCell({ label, value, sub }: StatCellProps) {
  return (
    <div className="px-5 py-4 border-r border-border last:border-r-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-black tracking-tight mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

interface OrgStatsRowProps {
  transactionCount: number;
  contactCount: number;
  upcomingEventCount: number;
  activeProjectCount: number;
}

export function OrgStatsRow({
  transactionCount,
  contactCount,
  upcomingEventCount,
  activeProjectCount,
}: OrgStatsRowProps) {
  return (
    <div className="grid grid-cols-4 bg-card border border-border rounded-xl overflow-hidden">
      <StatCell label="Transactions" value={transactionCount} />
      <StatCell label="Contacts" value={contactCount} />
      <StatCell
        label="Upcoming Events"
        value={upcomingEventCount}
        sub={upcomingEventCount > 0 ? "Check Events tab" : undefined}
      />
      <StatCell label="Active Projects" value={activeProjectCount} />
    </div>
  );
}
