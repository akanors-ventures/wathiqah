# Frontend Gotchas

Loads when touching a root-level provider, an Apollo `useQuery`, or a radix-ui-based shadcn component.

## HMR Artifacts on Root-Level Providers

Editing a provider mounted once at the app root (e.g. `OrgProvider` in `__root.tsx`) across several edits in one dev session can leave Vite's Fast Refresh in a state where React logs "useEffect deps array changed size between renders" — a stale-fiber HMR artifact, not a real bug. If this warning won't go away after a code change you're confident is correct, restart the dev server (not just the browser) before debugging further.

## Apollo Client — One Watcher Per Query

Don't run a second `useQuery()` for a query that's already watched elsewhere (e.g. in a context provider) "just to get a local refetch handle." Two independent watchers for the same query can observe different cache snapshots during a race window (one's background refetch hasn't landed when the other's `cache-first` read fires) — this caused an intermittent false "not found" earlier. Read state from the existing context/hook instead, and expose its `refetch` if a consumer needs to trigger one.

## UI Components — radix-ui Package

Newer shadcn components (e.g. `progress.tsx`) import from the unified `radix-ui` meta-package (`import { X as XPrimitive } from "radix-ui"`) instead of per-primitive `@radix-ui/react-x` packages. Check an existing component's import style before adding a new `@radix-ui/react-*` dependency — it's likely already covered.

`AlertDialogAction` (`components/ui/alert-dialog.tsx`) renders Radix's `DialogPrimitive.Close` under the hood — clicking it _always_ closes the enclosing `AlertDialog` (fires its `onOpenChange(false)`) right after your own `onClick`, even if your handler does something else entirely (e.g. opening a second dialog). If the action shouldn't close the dialog — handing off to another dialog, an async action that might fail — call `event.preventDefault()` in `onClick` first. Caused a real bug: an "Allocate now" button meant to open a follow-up `AllocationDialog` instead closed the `AlertDialog`, which was wired to navigate away on close.
