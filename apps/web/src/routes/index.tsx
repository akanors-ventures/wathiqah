import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowRightLeft,
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
    <div className="flex flex-col flex-1 bg-background text-foreground overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-40 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-bold text-primary mb-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-3 animate-pulse"></span>
              Verified Financial Documentation
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground mb-8 leading-[0.9]">
              The Ledger <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-500 to-primary/80">
                of Trust
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed font-medium opacity-80">
              Track funds, manage items, and verify records with a witness system built for
              real-world relationships.
            </p>
            {!user && !loading && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="rounded-md px-8 h-12 text-sm font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  asChild
                >
                  <Link to="/signup">Start Your Ledger</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-md px-8 h-12 text-sm font-bold hover:bg-muted/50 transition-all"
                  asChild
                >
                  <Link to="/login" search={{ redirectTo: undefined }}>
                    Sign In
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Hero Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] animate-pulse duration-[10s]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[900px] h-[900px] bg-emerald-500/10 rounded-full blur-[140px] animate-pulse duration-[12s]"></div>
          <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-blue-500/5 rounded-full blur-[100px]"></div>
        </div>
      </section>

      {/* Core Value Propositions */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <ValueCard
              icon={<Wallet className="w-8 h-8 text-primary" />}
              title="Funds"
              description="Record loans, gifts, and repayments with multi-currency support and real-time formatting."
              accent="primary"
            />
            <ValueCard
              icon={<Package className="w-8 h-8 text-amber-500" />}
              title="Items"
              description="Lend or borrow physical objects with quantity tracking and condition monitoring."
              accent="amber"
            />
            <ValueCard
              icon={<Users className="w-8 h-8 text-blue-500" />}
              title="Witness"
              description="Add digital accountability by inviting third parties to verify and acknowledge transactions."
              accent="blue"
            />
          </div>
        </div>
      </section>

      {/* Trust Philosophy Section - Simplified */}
      <section className="py-32 bg-muted/20 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-20 max-w-7xl mx-auto">
            <div className="lg:w-1/2 space-y-8">
              <div className="inline-block px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold mb-2">
                Our Philosophy
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-foreground leading-[0.95] tracking-tighter">
                Clarity Over <br />
                <span className="text-primary">Conflict</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl font-medium">
                We believe financial relationships thrive on documentation, not memory. Wathīqah
                replaces awkward conversations with verified records.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Button
                  size="lg"
                  className="rounded-md h-12 px-8 text-sm font-bold shadow-xl shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                  asChild
                >
                  <Link to="/features">See How It Works</Link>
                </Button>
              </div>
            </div>

            <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              <div className="space-y-6">
                <div className="p-8 bg-card border border-border/50 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-500 group">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                    <History className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold mb-3">Audit Logs</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    Permanent snapshots of every change, ensuring absolute transparency.
                  </p>
                </div>
                <div className="p-8 bg-card border border-border/50 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-500 group translate-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6 group-hover:scale-110 transition-transform">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold mb-3">Secure Access</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    Read-only sharing for partners without compromising your account.
                  </p>
                </div>
              </div>
              <div className="space-y-6 sm:mt-12">
                <div className="p-8 bg-card border border-border/50 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-500 group">
                  <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
                    <Handshake className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold mb-3">Verified IOUs</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    Promises with due dates and priorities that stay verified by both parties.
                  </p>
                </div>
                <div className="p-8 bg-card border border-border/50 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-500 group translate-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 mb-6 group-hover:scale-110 transition-transform">
                    <ArrowRightLeft className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold mb-3">Net Standing</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                    Automatically see who owes what across all your interactions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative background circles */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] -z-10 translate-y-1/2 -translate-x-1/2"></div>
      </section>

      {/* CTA Section */}
      {!user && !loading && (
        <section className="py-40 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary"></div>
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')",
            }}
          ></div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-5xl md:text-7xl font-black text-primary-foreground mb-10 tracking-tighter leading-[0.9]">
              Ready to Secure Your <br />
              <span className="opacity-60">Peace of Mind?</span>
            </h2>
            <p className="text-primary-foreground/70 text-lg mb-14 max-w-xl mx-auto font-medium tracking-wide">
              Join Wathīqah today. The digital standard for personal financial documentation.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button
                size="lg"
                className="rounded-md h-12 px-8 text-sm font-bold bg-background text-foreground hover:bg-white hover:scale-[1.02] active:scale-[0.98] shadow-2xl transition-all duration-500"
                asChild
              >
                <Link to="/signup">Create Free Account</Link>
              </Button>
            </div>
          </div>

          {/* Decorative CTA background elements */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-background pt-32 pb-16 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-16 lg:gap-8 max-w-7xl mx-auto">
            <div className="space-y-8 max-w-sm">
              <div className="flex items-center gap-4 group w-fit">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 transition-all group-hover:scale-110 group-hover:-rotate-3">
                  <AppLogo className="h-8 w-8" />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-3xl tracking-tighter text-foreground leading-none">
                    Wathīqah
                  </span>
                  <span className="text-xs font-bold text-muted-foreground mt-2 opacity-60">
                    Ledger of Trust
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                Documenting financial trust for real-world relationships. Built to preserve clarity
                and integrity in every interaction.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-12 sm:gap-24">
              <div className="space-y-6">
                <h4 className="text-xs font-bold text-foreground">Platform</h4>
                <ul className="space-y-4">
                  <li>
                    <Link
                      to="/features"
                      className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/login"
                      search={{ redirectTo: undefined }}
                      className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/signup"
                      className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      Sign Up
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-6">
                <h4 className="text-xs font-bold text-foreground">Legal</h4>
                <ul className="space-y-4">
                  <li>
                    <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                      Privacy
                    </span>
                  </li>
                  <li>
                    <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                      Terms
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-24 pt-8 border-t border-border/30 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs font-medium text-muted-foreground">
              © {new Date().getFullYear()} Wathīqah. All rights reserved.
            </p>
            <div className="flex gap-8">
              <span className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                Twitter
              </span>
              <span className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                Github
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  description,
  accent = "primary",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent?: "primary" | "amber" | "blue" | "emerald" | "purple";
}) {
  const accentClasses = {
    primary: "bg-primary/5 text-primary border-primary/20",
    amber: "bg-amber-500/5 text-amber-500 border-amber-500/20",
    blue: "bg-blue-500/5 text-blue-500 border-blue-500/20",
    emerald: "bg-emerald-500/5 text-emerald-500 border-emerald-500/20",
    purple: "bg-purple-500/5 text-purple-500 border-purple-500/20",
  };

  return (
    <div className="group relative p-8 rounded-[32px] bg-card border border-border/50 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2 overflow-hidden">
      {/* Background Glow */}
      <div
        className={`absolute -right-20 -bottom-20 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${accentClasses[accent].split(" ")[0]}`}
      ></div>

      <div
        className={`relative mb-8 h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 ${accentClasses[accent]}`}
      >
        {icon}
      </div>

      <h3 className="relative text-2xl font-black tracking-tighter mb-4 text-foreground group-hover:text-primary transition-colors">
        {title}
      </h3>

      <p className="relative text-lg text-muted-foreground leading-relaxed font-medium">
        {description}
      </p>

      <div className="relative mt-8 flex items-center text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
        Explore Detail
        <ArrowRight className="ml-2 w-4 h-4" />
      </div>
    </div>
  );
}
