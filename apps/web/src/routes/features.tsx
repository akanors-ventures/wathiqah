import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  Eye,
  Handshake,
  History,
  Package,
  Users,
  Wallet,
  Shield,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
});

function FeaturesPage() {
  return (
    <div className="flex flex-col flex-1 bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden bg-primary/5">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6">
              Features Built for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500">
                Absolute Financial Clarity
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Explore the tools we've built to help you manage your personal financial relationships
              with transparency and trust.
            </p>
          </div>
        </div>

        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]"></div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <FeatureCard
              icon={<Wallet className="w-8 h-8 text-primary" />}
              title="Smart Transactions"
              description="Record every penny given, received, or collected. Categorize expenses and incomes with ease. Supports multiple currencies with real-time formatting."
              to="/transactions"
              search={{ tab: "funds" }}
            />
            <FeatureCard
              icon={<Package className="w-8 h-8 text-amber-500" />}
              title="Physical Items"
              description="Lend and borrow tools, books, or any object. Track quantities, conditions, and return statuses with precision. Never lose an item again."
              to="/items"
            />
            <FeatureCard
              icon={<Handshake className="w-8 h-8 text-emerald-500" />}
              title="Promise Keeper"
              description="Track commitments and IOUs. Set due dates, priorities, and reminders so you never forget a promise made or received."
              to="/promises"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8 text-blue-500" />}
              title="Verified Witnesses"
              description="Invite trusted third parties to digitally acknowledge and verify your transactions. Adds a layer of accountability that traditional ledgers lack."
              to="/witnesses"
            />
            <FeatureCard
              icon={<ArrowRightLeft className="w-8 h-8 text-cyan-500" />}
              title="Relationship Standing"
              description="See exactly where you stand with every contact. Dynamic net debt logic shows who owes you and who you owe across all categories."
              to="/contacts"
            />
            <FeatureCard
              icon={<History className="w-8 h-8 text-orange-500" />}
              title="Immutable Audit Trail"
              description="Every modification creates a permanent history log. Snapshots preserve the state of records at the time of change for complete transparency."
            />
            <FeatureCard
              icon={<Eye className="w-8 h-8 text-purple-500" />}
              title="Shared Access"
              description="Grant secure, read-only access to partners or family members. Keep everyone on the same page without sharing your credentials."
            />
            <FeatureCard
              icon={<Shield className="w-8 h-8 text-red-500" />}
              title="Bank-Grade Security"
              description="Your data is encrypted and secure. We use industry-standard authentication and data protection practices to keep your records safe."
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-yellow-500" />}
              title="Real-time Analytics"
              description="Visualize your financial trends with beautiful charts. Understand your cash position and asset allocation at a glance."
            />
          </div>
        </div>
      </section>

      {/* Detailed Highlights */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
              <div>
                <h2 className="text-3xl font-bold mb-6">The Witness System</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  The cornerstone of Wathȋqah is accountability. When you record a transaction, you
                  can add a witness who receives a secure link to verify the details.
                </p>
                <ul className="space-y-4">
                  {[
                    "Secure, non-account-holder verification",
                    "Email-based invitation system",
                    "Digital acknowledgment status tracking",
                    "Audit trail preservation for verified records",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
                {/* Mock UI for Witness */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-border/50">
                    <span className="font-bold">Transaction Details</span>
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-600 text-[10px] font-bold rounded-full capitalize">
                      Pending verification
                    </span>
                  </div>
                  <div className="py-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium">$1,200.00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recipient</span>
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

            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div className="order-2 md:order-1 bg-card border border-border rounded-3xl p-8 shadow-xl">
                {/* Mock UI for Relationship */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                      SJ
                    </div>
                    <div>
                      <h4 className="font-bold">Sarah Johnson</h4>
                      <p className="text-xs text-muted-foreground">Last activity: 2 days ago</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] text-emerald-600 font-bold capitalize mb-1">
                        She owes you
                      </p>
                      <p className="text-xl font-bold text-emerald-700">$1,200</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                      <p className="text-[10px] text-red-600 font-bold capitalize mb-1">
                        You owe her
                      </p>
                      <p className="text-xl font-bold text-red-700">$0</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-muted-foreground">Net Relationship Standing</span>
                      <span className="text-emerald-600 font-bold">+$1,200.00</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[100%]" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-3xl font-bold mb-6">Relationship Intelligence</h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Wathȋqah doesn't just list transactions; it understands your relationships. Our
                  system automatically calculates your standing with every contact.
                </p>
                <ul className="space-y-4">
                  {[
                    "Automated net debt calculation",
                    "Asset vs Liability visualization",
                    "Detailed activity history per contact",
                    "Quick-settle transaction shortcuts",
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

      {/* Final CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to experience these features?</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            Join thousands of users who have found peace of mind through documented financial trust.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              className="rounded-full h-12 px-8 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              asChild
            >
              <Link to="/signup">Get Started Free</Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-full h-12 px-8 font-bold border-primary/20 hover:bg-primary/5 hover:scale-[1.02] active:scale-[0.98] transition-all"
              asChild
            >
              <Link to="/login" search={{ redirectTo: undefined }}>
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </section>
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
      <Link to={to} search={search} className="block h-full">
        {content}
      </Link>
    );
  }

  return content;
}
