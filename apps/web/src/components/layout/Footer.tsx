import { Link } from "@tanstack/react-router";
import { AppLogo } from "@/components/ui/app-logo";

export function Footer() {
  return (
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
                    to="/pricing"
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                  >
                    Pricing
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
                  <a
                    href="https://wathiqah.akanors.com/legal/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    Privacy
                  </a>
                </li>
                <li>
                  <a
                    href="https://wathiqah.akanors.com/legal/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    Terms
                  </a>
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
            <a
              href="https://twitter.com/akanors-ventures"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Twitter
            </a>
            <a
              href="https://github.com/akanors-ventures"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Github
            </a>
            <a
              href="https://facebook.com/akanors-ventures"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Facebook
            </a>
            <a
              href="https://wa.me/2348086578680"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
