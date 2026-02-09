import { Link } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  ChevronDown,
  FileSignature,
  FolderKanban,
  Handshake,
  History,
  LayoutGrid,
  Users,
  Zap,
} from "lucide-react";
import { AppLogo } from "@/components/ui/app-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSubscription } from "@/hooks/useSubscription";
import HeaderUser from "../auth/header-user";

export default function Header() {
  const { isPro, loading: subLoading } = useSubscription();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm transition-colors duration-300">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 lg:gap-8 min-w-0">
          <Link
            to="/"
            className="group flex items-center gap-2.5 transition-transform duration-200 hover:scale-[1.02]"
            aria-label="Wathȋqah Home"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground shadow-sm group-hover:shadow-md">
              <AppLogo className="h-5 w-5" />
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-primary/20 group-hover:ring-transparent transition-all duration-300" />
            </div>
            <div className="hidden lg:grid grid-cols-1 grid-rows-1 h-9 items-center overflow-hidden text-left pr-1 w-max">
              <span className="col-start-1 row-start-1 font-bold text-xl leading-none tracking-tight text-primary transition-all duration-300 group-hover:-translate-y-2 group-hover:text-primary whitespace-nowrap">
                Wathȋqah
              </span>
              <span className="col-start-1 row-start-1 self-end text-[0.6rem] font-medium tracking-normal text-muted-foreground uppercase opacity-0 translate-y-full group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out text-nowrap">
                Ledger of Trust
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 min-w-0">
            <NavDropdown label="Ledger" icon={<ArrowRightLeft className="w-4 h-4" />}>
              <DropdownMenuItem asChild>
                <Link to="/transactions" search={{ tab: "funds" }} className="flex items-center gap-2 cursor-pointer">
                  <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                  <span>Transactions</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/transactions/my-contact-transactions" className="flex items-center gap-2 cursor-pointer">
                  <History className="w-4 h-4 text-orange-500" />
                  <span>My Records</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/projects" className="flex items-center gap-2 cursor-pointer">
                  <FolderKanban className="w-4 h-4 text-violet-500" />
                  <span>Projects</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/promises" className="flex items-center gap-2 cursor-pointer">
                  <Handshake className="w-4 h-4 text-emerald-500" />
                  <span>Promises</span>
                </Link>
              </DropdownMenuItem>
            </NavDropdown>

            <NavDropdown label="Network" icon={<Users className="w-4 h-4" />}>
              <DropdownMenuItem asChild>
                <Link to="/contacts" className="flex items-center gap-2 cursor-pointer">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>Contacts</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/witnesses" className="flex items-center gap-2 cursor-pointer">
                  <FileSignature className="w-4 h-4 text-purple-500" />
                  <span>Witness Requests</span>
                </Link>
              </DropdownMenuItem>
            </NavDropdown>

            <NavLink to="/features">Features</NavLink>
          </nav>

          {/* Mobile Navigation (Dropdown) */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="group flex items-center gap-2 px-3 data-[state=open]:bg-muted"
                >
                  <LayoutGrid className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="font-medium">Menu</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60 mt-2">
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-2 py-1.5">
                  Ledger
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link
                    to="/transactions"
                    search={{ tab: "funds" }}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                    <span>Transactions</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    to="/transactions/my-contact-transactions"
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <History className="h-4 w-4 text-orange-500" />
                    <span>My Records</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/projects" className="cursor-pointer flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-violet-500" />
                    <span>Projects</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/promises" className="cursor-pointer flex items-center gap-2">
                    <Handshake className="h-4 w-4 text-emerald-500" />
                    <span>Promises</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-2 py-1.5">
                  Network
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/contacts" className="cursor-pointer flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-500" />
                    <span>Contacts</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/witnesses" className="cursor-pointer flex items-center gap-2">
                    <FileSignature className="h-4 w-4 text-purple-500" />
                    <span>Witness Requests</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-2 py-1.5">
                  Explore
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/features" className="cursor-pointer flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    <span>Features</span>
                  </Link>
                </DropdownMenuItem>
                {!isPro && (
                  <DropdownMenuItem asChild>
                    <Link
                      to="/pricing"
                      className="cursor-pointer flex items-center gap-2 font-bold text-primary"
                    >
                      <Zap className="h-4 w-4 fill-primary" />
                      <span>Go Pro</span>
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {!isPro && !subLoading && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hidden lg:flex rounded-full border-primary/20 text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-[10px] h-9 px-4 gap-2 animate-in fade-in slide-in-from-right duration-500"
            >
              <Link to="/pricing">
                <Zap className="w-3 h-3 fill-primary" />
                Go Pro
              </Link>
            </Button>
          )}
          <HeaderUser />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  to,
  search,
  children,
}: {
  to: string;
  search?: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      search={search}
      className="relative px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50 [&.active]:text-primary [&.active]:bg-primary/5 [&.active]:font-semibold group overflow-hidden"
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 [&.active]:scale-x-100 opacity-0 group-hover:opacity-100 [&.active]:opacity-100" />
    </Link>
  );
}

function NavDropdown({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative px-4 py-2 h-9 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50 data-[state=open]:text-primary data-[state=open]:bg-primary/5 group"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span>{label}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 mt-1 animate-in fade-in zoom-in duration-200">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
