import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OrgHeroOrg {
  name: string;
  slug: string;
  description: string | null;
  industry: string | null;
  logoUrl: string | null;
}

interface OrgHeroProps {
  org: OrgHeroOrg;
  isAdmin: boolean;
}

export function OrgHero({ org, isAdmin }: OrgHeroProps) {
  const initials = org.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-950 dark:to-slate-800 rounded-xl p-6 flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white text-xl font-black border-2 border-white/10 flex-shrink-0">
          {initials}
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">{org.name}</h1>
          {org.description && <p className="text-sm text-blue-200 mt-0.5">{org.description}</p>}
          <div className="flex items-center gap-2 mt-2">
            <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] font-black uppercase">
              PRO
            </Badge>
            {org.industry && (
              <Badge variant="outline" className="border-white/20 text-white/70 text-[10px]">
                {org.industry}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        // Hidden on mobile — Settings is in the bottom nav, New Transaction is
        // in Quick Actions below. Only shown on desktop where there's room.
        <Button
          asChild
          size="sm"
          className="hidden md:inline-flex bg-white text-slate-900 hover:bg-white/90 font-semibold flex-shrink-0"
        >
          <Link to="/transactions/new">
            <Plus className="h-4 w-4 mr-1.5" />
            New Transaction
          </Link>
        </Button>
      )}
    </div>
  );
}
