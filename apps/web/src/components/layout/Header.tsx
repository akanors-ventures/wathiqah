import { Link } from "@tanstack/react-router";
import HeaderUser from "../auth/header-user";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="text-emerald-600 dark:text-emerald-500">
              Wathiqah
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/witnesses"
              className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors [&.active]:text-emerald-600 dark:[&.active]:text-emerald-500"
            >
              Witness Requests
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <HeaderUser />
        </div>
      </div>
    </header>
  );
}
