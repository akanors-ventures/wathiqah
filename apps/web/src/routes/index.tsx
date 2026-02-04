import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowRightLeft,
  Eye,
  FileSignature,
  Handshake,
  History,
  Lock,
  Package,
  Users,
  Wallet,
} from "lucide-react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { AppLogo } from "@/components/ui/app-logo";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/page-loader";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            <FeatureCard
              icon={<Wallet className="w-8 h-8 text-primary" />}
              title="Smart Transactions"
              description="Record every penny given, received, or collected. Categorize expenses and incomes with ease."
              to="/transactions"
              search={{ tab: "funds" }}
            />
            <FeatureCard
              icon={<Package className="w-8 h-8 text-amber-500" />}
              title="Physical Items"
              description="Lend and borrow tools, books, or any object. Track quantities and return statuses with precision."
              to="/items"
            />
            <FeatureCard
              icon={<Handshake className="w-8 h-8 text-emerald-500" />}
              title="Promise Keeper"
              description="Track commitments and IOUs. Set due dates and priorities so you never forget a promise made."
              to="/promises"
            />
            <FeatureCard
              icon={<ArrowRightLeft className="w-8 h-8 text-cyan-500" />}
              title="Relationship Standing"
              description="See exactly where you stand with every contact. Know who owes you and who you owe at a glance."
              to="/contacts"
            />
            <FeatureCard
              icon={<Users className="w-8 h-8 text-blue-500" />}
              title="Verified Witnesses"
              description="Invite trusted third parties to digitally acknowledge and verify your transactions via secure email links."
              to="/witnesses"
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
                  title="Maintain Clarity"
                  description="Keep a clear view of your financial standing with everyone. Settle debts with a single click."
                />
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              <div className="relative z-10 bg-card border border-border rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-700">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileSignature className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Verification System</h3>
                    <p className="text-sm text-muted-foreground">Digital Accountability</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Status
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase">
                        Pending Witness
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-xs">
                        JD
                      </div>
                      <div>
                        <p className="text-sm font-medium">Lent $500 to Sarah Smith</p>
                        <p className="text-[10px] text-muted-foreground">
                          Waiting for witness: Ahmad Sulaiman
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Verified
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">
                        Acknowledged
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Professional Camera Lens</p>
                        <p className="text-[10px] text-muted-foreground">
                          Returned on Oct 24, 2023
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Built for Real Relationships Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16 max-w-7xl mx-auto">
            <div className="lg:w-1/2 relative order-2 lg:order-1">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-emerald-500/20 rounded-full blur-3xl -z-10"></div>
              <div className="relative z-10 grid grid-cols-2 gap-4">
                <div className="space-y-4 mt-8">
                  <div className="bg-card p-6 rounded-2xl shadow-lg border border-border animate-in slide-in-from-bottom-4 duration-700 delay-100">
                    <Users className="w-8 h-8 text-blue-500 mb-3" />
                    <h3 className="font-bold text-lg mb-1">Friends & Family</h3>
                    <p className="text-sm text-muted-foreground">
                      Keep money matters clear without awkward conversations.
                    </p>
                  </div>
                  <div className="bg-card p-6 rounded-2xl shadow-lg border border-border animate-in slide-in-from-bottom-4 duration-700 delay-300">
                    <Handshake className="w-8 h-8 text-emerald-500 mb-3" />
                    <h3 className="font-bold text-lg mb-1">Business Partners</h3>
                    <p className="text-sm text-muted-foreground">
                      Track shared expenses and profit splits transparently.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-card p-6 rounded-2xl shadow-lg border border-border animate-in slide-in-from-bottom-4 duration-700 delay-200">
                    <Package className="w-8 h-8 text-amber-500 mb-3" />
                    <h3 className="font-bold text-lg mb-1">Item Lending</h3>
                    <p className="text-sm text-muted-foreground">
                      Never lose track of books, tools, or equipment again.
                    </p>
                  </div>
                  <div className="bg-card p-6 rounded-2xl shadow-lg border border-border animate-in slide-in-from-bottom-4 duration-700 delay-400">
                    <FileSignature className="w-8 h-8 text-purple-500 mb-3" />
                    <h3 className="font-bold text-lg mb-1">Verified Trust</h3>
                    <p className="text-sm text-muted-foreground">
                      Add witnesses to important transactions for peace of mind.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2 order-1 lg:order-2">
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                Built for Real <br />
                <span className="text-primary">Relationships</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Money often complicates relationships. Wathȋqah simplifies them. Whether you're
                splitting a bill, lending a camera, or managing a shared project, our platform
                ensures everyone is on the same page.
              </p>
              <ul className="space-y-4">
                {[
                  "Eliminate misunderstandings about who owes what",
                  "Track return dates for physical items",
                  "Build a history of reliability and trust",
                  "Resolve debts with a single click",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <ArrowRight className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">The Wathȋqah Philosophy</h2>
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="p-6 rounded-2xl bg-background border border-border shadow-sm">
                <h3 className="text-lg font-bold text-blue-600 mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                  Asset-First Mindset
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We believe it's better to be a creditor than a debtor. Our system highlights
                  what's owed to you as assets, encouraging healthy financial giving and lending.
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-background border border-border shadow-sm">
                <h3 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-600" />
                  Accountability by Default
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Debt is a liability that should be resolved quickly. By making debts visible and
                  verified, we help maintain trust and clarity in every relationship.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && !loading && (
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/90"></div>
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')",
            }}
          ></div>
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
      <footer className="bg-background pt-24 pb-12 border-t border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center gap-3 group w-fit">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                  <AppLogo className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-2xl tracking-tight text-foreground leading-none">
                    Wathȋqah
                  </span>
                  <span className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    Ledger of Trust
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground max-w-sm text-base leading-relaxed">
                The digital standard for personal financial documentation and verification. Built to
                preserve trust and clarity in every relationship.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                  <Users className="h-4 w-4" />
                </div>
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer">
                  <Lock className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2 space-y-6">
              <h4 className="font-bold text-sm uppercase tracking-wider text-foreground">
                Product
              </h4>
              <ul className="space-y-4">
                <li>
                  <Link
                    to="/"
                    className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    to="/transactions"
                    search={{ tab: "funds" }}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
                  >
                    Transactions
                  </Link>
                </li>
                <li>
                  <Link
                    to="/witnesses"
                    className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
                  >
                    Witness System
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="lg:col-span-2 space-y-6">
              <h4 className="font-bold text-sm uppercase tracking-wider text-foreground">Legal</h4>
              <ul className="space-y-4">
                <li>
                  <a
                    href="/legal/privacy.html"
                    className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/legal/terms.html"
                    className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <Link
                    to="/"
                    className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="lg:col-span-3 space-y-6">
              <h4 className="font-bold text-sm uppercase tracking-wider text-foreground">
                Stay Connected
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Join our community to stay updated on new features and financial best practices.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" className="rounded-full px-6 border-primary/20">
                  Contact Support
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-20 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground font-medium">
            <p>&copy; {new Date().getFullYear()} Wathȋqah. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                System Operational
              </span>
              <span className="text-muted-foreground/30">|</span>
              <span>v1.2.0</span>
            </div>
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
      <p className="text-muted-foreground leading-relaxed">{description}</p>
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
      <span className="text-5xl font-black text-primary/20 group-hover:text-primary/40 transition-colors leading-none select-none">
        {number}
      </span>
      <div>
        <h4 className="text-lg font-bold mb-2 text-foreground">{title}</h4>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
