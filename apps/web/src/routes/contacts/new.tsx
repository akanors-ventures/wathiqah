import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /contacts/new has no standalone page — the add-contact UI is a dialog on
 * the contacts index page. Redirect so that bookmarks and old links still work.
 */
export const Route = createFileRoute("/contacts/new")({
  beforeLoad: () => {
    throw redirect({ to: "/contacts", search: { new: true } });
  },
  component: () => null,
});
