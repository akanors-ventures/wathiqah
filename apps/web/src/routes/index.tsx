import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Eye,
  FileSignature,
  Handshake,
  History,
  Lock,
  Users,
  Wallet,
} from "lucide-react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <Dashboard />;
  }

  return (
    <div className="flex flex-col flex-1 bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2.5 animate-pulse"></span>
              Now with Verified Witness Invitations
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-8 leading-[1.1]">
              The Ledger of Trust for <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500">
                People and Items
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed font-light">
              Track funds given and owed, manage lent or borrowed items, and verify records with
              witnesses.
            </p>
            {!user && !loading && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all"
                  asChild
                >
                  <Link to="/signup">Start Your Trust Ledger</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted/50"
                  asChild
                >
                  <Link to="/login" search={{ redirectTo: undefined }}>
                    Sign In
                  </Link>
                </Button>
                <div className="sm:ml-2 mt-2 sm:mt-0 text-sm text-muted-foreground">
                  Returning user?
                  <Link
                    to="/transactions"
                    search={{ tab: "funds" }}
                    className="inline-flex items-center ml-2 font-medium text-primary hover:underline"
                  >
                    Explore transactions
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hero Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]"></div>
          <div className="absolute top-[20%] right-[15%] w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]"></div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Everything You Need for Financial Clarity
            </h2>
            <p className="text-lg text-muted-foreground">
              Wathȋqah provides a suite of tools designed to bring transparency to your personal
              financial relationships.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <FeatureCard
              icon={<Wallet className="w-8 h-8 text-primary" />}
              title="Smart Transactions"
              description="Record every penny given, received, or collected. Categorize expenses and incomes with ease."
            />
            <FeatureCard
              icon={<Handshake className="w-8 h-8 text-emerald-500" />}
              title="Promise Keeper"
              description="Track commitments and IOUs. Set due dates and priorities so you never forget a promise made."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8 text-blue-500" />}
              title="Verified Witnesses"
              description="Invite trusted third parties to digitally acknowledge and verify your transactions via secure email links."
            />
            <FeatureCard
              icon={<History className="w-8 h-8 text-orange-500" />}
              title="Audit Trail"
              description="Every action creates a permanent, unalterable history log. Transparency that builds trust."
            />
            <FeatureCard
              icon={<Eye className="w-8 h-8 text-purple-500" />}
              title="Shared Access"
              description="Grant read-only access to partners, accountants, or family members to keep everyone on the same page."
            />
            <FeatureCard
              icon={<Lock className="w-8 h-8 text-red-500" />}
              title="Bank-Grade Security"
              description="Your data is encrypted and secure. We prioritize your privacy and data protection above all."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-20 max-w-7xl mx-auto">
            <div className="lg:w-1/2 space-y-10">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                  Simple Steps to <br />
                  <span className="text-primary">Unbreakable Trust</span>
                </h2>
                <p className="text-lg text-muted-foreground">
                  Our process is designed to be as frictionless as possible while providing maximum
                  security and verification.
                </p>
              </div>

              <div className="space-y-8">
                <Step
                  number="01"
                  title="Record the Detail"
                  description="Log the transaction or promise details, including amount, date, and the other party involved."
                />
                <Step
                  number="02"
                  title="Invite Verification"
                  description="Optionally add a witness. We'll send them a secure link to review and acknowledge the record."
                />
                <Step
                  number="03"
                  title="Secure & Share"
                  description="The record is locked in your history. Share access with relevant parties for total transparency."
                />
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-emerald-500/20 rounded-3xl transform rotate-3 scale-105 blur-lg opacity-70"></div>
              <div className="relative bg-card border border-border/50 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
                {/* Abstract UI Mockup */}
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-border pb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <FileSignature size={24} />
                      </div>
                      <div>
                        <div className="h-5 w-32 bg-foreground/10 rounded mb-2"></div>
                        <div className="h-4 w-24 bg-foreground/5 rounded"></div>
                      </div>
                    </div>
                    <div className="h-9 w-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center text-xs font-bold">
                      VERIFIED
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-20 bg-foreground/5 rounded"></div>
                      <div className="h-4 w-32 bg-foreground/10 rounded"></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-24 bg-foreground/5 rounded"></div>
                      <div className="h-4 w-16 bg-foreground/10 rounded"></div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg border border-border/50 mt-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                          <Users size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="h-4 w-full bg-foreground/5 rounded mb-2"></div>
                          <div className="h-3 w-2/3 bg-foreground/5 rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="h-12 w-full bg-primary rounded-xl opacity-90 shadow-lg"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Built for Real Relationships
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Wathȋqah is designed to solve the delicate balance between trust and accountability in
              personal finance.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <UseCaseCard
              title="Family Loans"
              description="Lending to a sibling? Document the terms clearly to prevent misunderstandings and keep family dinners awkward-free."
              icon={<Users className="w-6 h-6" />}
            />
            <UseCaseCard
              title="Shared Living"
              description="Track shared expenses with roommates or partners. Keep a running tally and settle up with a clear, undisputed record."
              icon={<Wallet className="w-6 h-6" />}
            />
            <UseCaseCard
              title="Small Business & Gigs"
              description="For informal agreements and quick jobs, create a lightweight, verified record of work and payment terms instantly."
              icon={<Handshake className="w-6 h-6" />}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && !loading && (
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/90"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-8">
              Ready to Secure Your Peace of Mind?
            </h2>
            <p className="text-primary-foreground/80 text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
              Join Wathȋqah today. It's free to start, simple to use, and invaluable for your
              personal relationships.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button
                size="lg"
                className="h-16 px-12 text-lg rounded-full bg-background text-foreground hover:bg-white/90 font-bold shadow-xl transition-transform hover:scale-105"
                asChild
              >
                <Link to="/signup">
                  Create Free Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-background py-16 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="m11.996304 11.334728 1.622389 1.62239 3.24478-3.2447795" />
                    <path d="M11.949088 11.388432 10.326702 13.010822 7.0819243 9.7660435" />
                  </svg>
                </div>
                <span className="font-bold text-2xl tracking-tight text-foreground">Wathȋqah</span>
              </div>
              <p className="text-muted-foreground max-w-xs text-sm">
                The standard for personal financial documentation and verification.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm text-muted-foreground font-medium">
              <Link to="/" className="hover:text-primary transition-colors">
                Features
              </Link>
              <Link to="/" className="hover:text-primary transition-colors">
                Pricing
              </Link>
              <a href="/legal/privacy.html" className="hover:text-primary transition-colors">
                Privacy Policy
              </a>
              <a href="/legal/terms.html" className="hover:text-primary transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Wathȋqah. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-8 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300 hover:-translate-y-1 group">
      <div className="mb-6 bg-muted w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-6 group">
      <div className="flex-shrink-0 w-14 h-14 rounded-2xl border-2 border-primary/20 bg-primary/5 flex items-center justify-center text-xl font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
        {number}
      </div>
      <div>
        <h4 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
          {title}
        </h4>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function UseCaseCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="p-8 rounded-2xl bg-card border border-border shadow-sm flex flex-col items-center text-center">
      <div className="mb-6 p-4 rounded-full bg-primary/10 text-primary">{icon}</div>
      <h3 className="text-xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
