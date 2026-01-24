import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Users,
  History,
  ArrowRight,
  FileSignature,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-neutral-950">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600 mr-2"></span>
              New: Witness Invitation System Live
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-neutral-900 dark:text-white mb-8">
              Financial Trust, <br />
              <span className="text-emerald-600 dark:text-emerald-500">
                Digitally Verified.
              </span>
            </h1>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Wathiqah bridges the gap between informal agreements and legal
              contracts. Document loans, shared expenses, and payments with
              verified witnesses for peace of mind.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-12 px-8 text-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                asChild
              >
                <Link to="/signup">Start for Free</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-lg"
                asChild
              >
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-200/20 dark:bg-emerald-900/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
              Why Choose Wathiqah?
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Built for relationships that matter. We provide the tools to
              ensure transparency without the complexity of traditional legal
              frameworks.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <FeatureCard
              icon={<Users className="w-10 h-10 text-emerald-600" />}
              title="Verified Witnesses"
              description="Invite trusted third parties to digitally acknowledge and verify your transactions via secure links."
            />
            <FeatureCard
              icon={<History className="w-10 h-10 text-emerald-600" />}
              title="Digital Audit Trail"
              description="Keep a permanent, unalterable history of every action, modification, and acknowledgment."
            />
            <FeatureCard
              icon={<ShieldCheck className="w-10 h-10 text-emerald-600" />}
              title="Secure & Private"
              description="Your financial data is encrypted and visible only to the parties involved in the transaction."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16 max-w-6xl mx-auto">
            <div className="lg:w-1/2 space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white">
                Simple Steps to{" "}
                <span className="text-emerald-600">Secure Agreements</span>
              </h2>

              <div className="space-y-6">
                <Step
                  number="01"
                  title="Create a Transaction"
                  description="Log details about the loan, payment, or shared expense, including amount and date."
                />
                <Step
                  number="02"
                  title="Invite a Witness"
                  description="Send a secure invitation link to a neutral third party via email."
                />
                <Step
                  number="03"
                  title="Get Verification"
                  description="The witness reviews and digitally acknowledges the transaction, creating a permanent record."
                />
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-2xl transform rotate-3"></div>
              <div className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-8">
                {/* Abstract UI Mockup */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600">
                        <FileSignature size={20} />
                      </div>
                      <div>
                        <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded mb-2"></div>
                        <div className="h-3 w-16 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
                      </div>
                    </div>
                    <div className="h-8 w-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 w-full bg-neutral-100 dark:bg-neutral-800 rounded"></div>
                    <div className="h-4 w-5/6 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
                    <div className="h-4 w-4/6 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <div className="h-10 w-full bg-emerald-600 rounded-md opacity-90"></div>
                    <div className="h-10 w-full bg-neutral-100 dark:bg-neutral-800 rounded-md"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-emerald-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to secure your financial promises?
          </h2>
          <p className="text-emerald-100 text-lg mb-10 max-w-2xl mx-auto">
            Join thousands of users who trust Wathiqah to keep their personal
            finances transparent and dispute-free.
          </p>
          <Button
            size="lg"
            className="h-14 px-10 text-lg bg-white text-emerald-900 hover:bg-emerald-50 font-semibold"
            asChild
          >
            <Link to="/signup">
              Create Your Account
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-50 dark:bg-neutral-950 py-12 border-t border-neutral-200 dark:border-neutral-800">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Lock className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-lg text-neutral-900 dark:text-white">
                Wathiqah
              </span>
            </div>
            <div className="flex gap-8 text-sm text-neutral-500">
              <Link to="/" className="hover:text-emerald-600 transition-colors">
                Privacy
              </Link>
              <Link to="/" className="hover:text-emerald-600 transition-colors">
                Terms
              </Link>
              <Link to="/" className="hover:text-emerald-600 transition-colors">
                Contact
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center text-xs text-neutral-400">
            &copy; {new Date().getFullYear()} Wathiqah. All rights reserved.
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
    <div className="p-8 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 w-16 h-16 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
        {title}
      </h3>
      <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
        {description}
      </p>
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
    <div className="flex gap-6">
      <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-lg font-bold text-emerald-600 dark:text-emerald-500">
        {number}
      </div>
      <div>
        <h4 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
          {title}
        </h4>
        <p className="text-neutral-600 dark:text-neutral-400">{description}</p>
      </div>
    </div>
  );
}
