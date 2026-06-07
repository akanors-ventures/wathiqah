import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  Eye,
  FolderKanban,
  Gift,
  Globe,
  Handshake,
  Lock,
  Package,
  RefreshCw,
  Users,
} from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
});

function FeaturesPage() {
  return (
    <div className="flex flex-col flex-1 bg-background text-foreground">
      {/* Hero */}
      <section className="relative pt-20 pb-16 overflow-hidden bg-primary/5">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6">
              Every Tool You Need for
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500">
                Financial Accountability
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              From personal loans to team ledgers — Wathīqah gives every financial relationship a
              clear, witnessed, and permanent record.
            </p>
          </div>
        </div>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <FeatureCard
              icon={<ArrowRightLeft className="w-8 h-8 text-primary" />}
              title="Transaction Ledger"
              description="12 distinct types — loans, repayments, gifts, advances, deposits, and escrow — so every financial relationship has a precise, unambiguous record."
              to="/transactions"
              search={{ tab: "funds" }}
            />
            <FeatureCard
              icon={<Package className="w-8 h-8 text-amber-500" />}
              title="Physical Items"
              description="Lend and borrow objects with the same rigor as cash. Track item name, quantity, and return status so nothing falls through the cracks."
              to="/items"
            />
            <FeatureCard
              icon={<Eye className="w-8 h-8 text-purple-500" />}
              title="Witness Verification"
              description="Attach a trusted third party to any transaction. They receive a secure link to acknowledge or dispute the details — permanently on record."
              to="/witnesses"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8 text-blue-500" />}
              title="Contact Standing"
              description="See your net position with every person at a glance. Who owes you, what you owe, and the full history behind every figure."
              to="/contacts"
            />
            <FeatureCard
              icon={<RefreshCw className="w-8 h-8 text-cyan-500" />}
              title="Shared Ledger"
              description="When your contact is also on Wathīqah, the record appears on both sides automatically — perspective flipped, no double entry required."
            />
            <FeatureCard
              icon={<Handshake className="w-8 h-8 text-emerald-500" />}
              title="Promises & IOUs"
              description="Capture informal commitments before they become transactions. Set due dates and convert to a formal record once fulfilled."
              to="/promises"
            />
            <FeatureCard
              icon={<Lock className="w-8 h-8 text-red-500" />}
              title="Shared Access"
              description="Grant time-limited, read-only access to a partner, accountant, or family member — no credentials shared, access revoked in one click."
              to="/settings"
            />
            <FeatureCard
              icon={<FolderKanban className="w-8 h-8 text-orange-500" />}
              title="Projects"
              description="Group transactions under a named project, set a budget, and watch income vs expenses update in real time as records are added."
              to="/projects"
            />
            <FeatureCard
              icon={<Building2 className="w-8 h-8 text-indigo-500" />}
              title="Organisations"
              description="Create a shared workspace for your team or business. Invite members, assign roles, and manage records collaboratively in a dedicated ledger."
              to="/org/create"
            />
            <FeatureCard
              icon={<Gift className="w-8 h-8 text-pink-500" />}
              title="Debt Forgiveness"
              description="Convert any loan into a gift in one step. The obligation is cleared, the record is preserved, and relationship standing updates instantly."
            />
            <FeatureCard
              icon={<Globe className="w-8 h-8 text-teal-500" />}
              title="Multi-Currency"
              description="Record transactions in NGN, USD, EUR, GBP, CAD, AED, or SAR. View your total balance in any supported currency with a single selector."
              to="/transactions"
              search={{ tab: "funds" }}
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8 text-yellow-500" />}
              title="Financial Dashboard"
              description="Period-filtered snapshot of inflows, outflows, total balance, contact obligations, and active commitments. Filter by month, year, or all time."
            />
          </div>
        </div>
      </section>

      {/* Detailed Highlights */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            {/* Witness System */}
            <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
              <div>
                <h2 className="text-3xl font-bold mb-6">The Witness System</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Accountability is the core of Wathīqah. Attach a witness to any transaction and
                  they receive a secure invitation link — no account required to verify.
                </p>
                <ul className="space-y-4">
                  {[
                    "Works for both registered and unregistered users",
                    "Invitation links pre-fill details and link accounts automatically",
                    "Four states: Pending, Acknowledged, Declined, Modified",
                    "Transactions with witnesses cannot be deleted — only cancelled",
                    "Status resets to Modified whenever a witnessed record is changed",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-border/50">
                    <span className="font-bold">Transaction Details</span>
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-600 text-[10px] font-bold rounded-full">
                      Pending verification
                    </span>
                  </div>
                  <div className="py-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium">Loan Given</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium">₦50,000.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Contact</span>
                      <span className="font-medium">Sarah Johnson</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Witness</span>
                      <span className="font-medium">Michael Chen</span>
                    </div>
                  </div>
                  <Button className="w-full bg-primary" disabled>
                    Acknowledge Record
                  </Button>
                </div>
              </div>
            </div>

            {/* Organisations */}
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="order-2 md:order-1 bg-card border border-border rounded-3xl p-8 shadow-xl">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-border/50">
                    <div>
                      <p className="font-bold">Akanors Ventures</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Technology · 3 members</p>
                    </div>
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded-full">
                      Admin
                    </span>
                  </div>
                  <div className="space-y-1 py-2">
                    {[
                      {
                        initials: "FA",
                        name: "Fawaz A.",
                        role: "Admin",
                        bg: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400",
                      },
                      {
                        initials: "SJ",
                        name: "Sarah J.",
                        role: "Operator",
                        bg: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400",
                      },
                      {
                        initials: "MC",
                        name: "Michael C.",
                        role: "Viewer",
                        bg: "bg-muted text-muted-foreground",
                      },
                    ].map(({ initials, name, role, bg }) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/50"
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${bg}`}
                        >
                          {initials}
                        </div>
                        <span className="text-sm font-medium flex-1">{name}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                          {role}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full text-sm" disabled>
                    Invite Member
                  </Button>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-3xl font-bold mb-6">Organisations & Teams</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Run a business or manage a team's finances together. Organisations give each
                  member their own scoped view — separate from their personal ledger.
                </p>
                <ul className="space-y-4">
                  {[
                    "Three roles: Admin (full control), Operator (create records), Viewer (read-only)",
                    "Member attribution with configurable display mode",
                    "Events calendar for scheduling key dates within the org",
                    "Org ledger is fully isolated from personal transactions",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            Every financial relationship deserves a clear record. Start yours today — it's free.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              className="rounded-md h-12 px-8 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              asChild
            >
              <Link to="/signup">Get Started Free</Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-md h-12 px-8 font-bold border-primary/20 hover:bg-primary/5 hover:scale-[1.02] active:scale-[0.98] transition-all"
              asChild
            >
              <Link to="/login" search={{ redirectTo: undefined }}>
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  to,
  search,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  to?: string;
  search?: Record<string, unknown>;
}) {
  const content = (
    <div className="group p-8 rounded-3xl bg-card border border-border hover:border-primary/20 hover:shadow-xl transition-all duration-300 h-full">
      <div className="mb-6 p-3 rounded-2xl bg-muted group-hover:bg-primary/10 transition-colors inline-block">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
    </div>
  );

  if (to) {
    return (
      <Link to={to as never} search={search as never} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
