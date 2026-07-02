import { useMutation, useQuery, useSubscription } from "@apollo/client/react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { NotificationBell } from "./notification-bell";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

// The Radix Popover primitive renders its content into a portal gated on
// open state; a lean unit test only cares about the data/handlers inside,
// so render Content unconditionally like Header.test.tsx does for the nav
// dropdown's Radix primitives.
vi.mock("radix-ui", () => ({
  Popover: {
    Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}));

type GqlDoc = { definitions?: { kind?: string; name?: { value?: string } }[] };

// Queries built with an interpolated fragment (e.g. `${NOTIFICATION_FIELDS}`)
// put the FragmentDefinition ahead of the OperationDefinition in
// `document.definitions`, so index 0 isn't reliably the operation — find it
// by kind instead.
function operationName(doc: GqlDoc): string | undefined {
  return doc?.definitions?.find((d) => d.kind === "OperationDefinition")?.name?.value;
}

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: "n1",
    type: "WITNESS_INVITED",
    title: "You were invited to witness a transaction",
    body: "Musa Ibrahim invited you to witness a transaction.",
    link: "/witnesses",
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("NotificationBell", () => {
  const mockMarkRead = vi.fn().mockResolvedValue({});
  const mockMarkAllRead = vi.fn().mockResolvedValue({});
  const mockRefetchList = vi.fn();
  const mockRefetchCount = vi.fn();
  let capturedOnData: ((args: { client: unknown; data: unknown }) => void) | undefined;

  function setup(notifications: ReturnType<typeof makeNotification>[], unreadCount: number) {
    (useQuery as unknown as Mock).mockImplementation((doc: GqlDoc) => {
      const name = operationName(doc);
      if (name === "MyNotifications") {
        return { data: { myNotifications: notifications }, refetch: mockRefetchList };
      }
      if (name === "MyUnreadNotificationCount") {
        return { data: { myUnreadNotificationCount: unreadCount }, refetch: mockRefetchCount };
      }
      return { data: undefined, refetch: vi.fn() };
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockMarkRead.mockResolvedValue({});
    mockMarkAllRead.mockResolvedValue({});
    capturedOnData = undefined;

    (useMutation as unknown as Mock).mockImplementation((doc: GqlDoc) => {
      const name = operationName(doc);
      if (name === "MarkNotificationRead") return [mockMarkRead];
      if (name === "MarkAllNotificationsRead") return [mockMarkAllRead];
      return [vi.fn()];
    });
    (useSubscription as unknown as Mock).mockImplementation(
      (_doc: GqlDoc, opts: { onData: (args: { client: unknown; data: unknown }) => void }) => {
        capturedOnData = opts.onData;
        return undefined;
      },
    );
  });

  it("shows no unread badge when there are no unread notifications", () => {
    setup([], 0);

    render(<NotificationBell />);

    expect(screen.getByLabelText("Notifications")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows the unread count badge and caps display at 9+", () => {
    setup([], 12);

    render(<NotificationBell />);

    expect(screen.getByLabelText("Notifications (12 unread)")).toBeInTheDocument();
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("shows an empty state when there are no notifications", () => {
    setup([], 0);

    render(<NotificationBell />);

    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("renders notifications and marks an unread one read on click, then navigates to its link", async () => {
    setup([makeNotification()], 1);

    render(<NotificationBell />);

    const item = screen.getByText("You were invited to witness a transaction");
    fireEvent.click(item);

    expect(mockMarkRead).toHaveBeenCalledWith({ variables: { id: "n1" } });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: "/witnesses" }));
  });

  it("does not call markRead for an already-read notification but still navigates", async () => {
    setup([makeNotification({ read: true })], 0);

    render(<NotificationBell />);

    const item = screen.getByText("You were invited to witness a transaction");
    fireEvent.click(item);

    expect(mockMarkRead).not.toHaveBeenCalled();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: "/witnesses" }));
  });

  it("navigates to a transaction link via params, not a pre-built path string", async () => {
    // Regression test: navigate({ to: link as never }) with a pre-built
    // "/transactions/<id>" string leaves Route.useParams() undefined on the
    // client-side transition (confirmed live — the destination page's
    // GraphQL query errored with "Variable $id ... was not provided").
    // Dynamic segments must go through `params`.
    setup(
      [
        makeNotification({
          id: "n2",
          title: "Witness acknowledged your transaction",
          link: "/transactions/tx-abc-123",
        }),
      ],
      1,
    );

    render(<NotificationBell />);

    fireEvent.click(screen.getByText("Witness acknowledged your transaction"));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/transactions/$id",
        params: { id: "tx-abc-123" },
      }),
    );
  });

  it("navigates to /pricing with the required search param", async () => {
    setup(
      [
        makeNotification({
          id: "n3",
          title: "Pro access expired",
          link: "/pricing",
          read: true,
        }),
      ],
      0,
    );

    render(<NotificationBell />);

    fireEvent.click(screen.getByText("Pro access expired"));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/pricing",
        search: { reason: undefined },
      }),
    );
  });

  it("calls markAllRead when 'Mark all read' is clicked", async () => {
    setup([makeNotification()], 1);

    render(<NotificationBell />);

    fireEvent.click(screen.getByText("Mark all read"));

    expect(mockMarkAllRead).toHaveBeenCalled();
  });

  it("hides 'Mark all read' when there are no unread notifications", () => {
    setup([makeNotification({ read: true })], 0);

    render(<NotificationBell />);

    expect(screen.queryByText("Mark all read")).not.toBeInTheDocument();
  });

  it("does not fire markRead twice for a rapid double-click on the same item", async () => {
    // markRead never resolves within this test, simulating the window
    // between the first click and the mutation settling.
    mockMarkRead.mockReturnValue(new Promise(() => {}));
    setup([makeNotification()], 1);

    render(<NotificationBell />);

    const item = screen.getByText("You were invited to witness a transaction");
    fireEvent.click(item);
    fireEvent.click(item);

    expect(mockMarkRead).toHaveBeenCalledTimes(1);
  });

  it("caps the cached notification list at 30 when a subscription event arrives", () => {
    setup([makeNotification()], 1);
    render(<NotificationBell />);

    const existingList = Array.from({ length: 30 }, (_, i) => makeNotification({ id: `old-${i}` }));
    const cacheUpdateQuery = vi.fn(
      (
        _opts: { query: unknown },
        updater: (existing: { myNotifications: typeof existingList } | undefined) => unknown,
      ) => updater({ myNotifications: existingList }),
    );

    capturedOnData?.({
      client: { cache: { updateQuery: cacheUpdateQuery } },
      data: { data: { notificationCreated: makeNotification({ id: "new-1" }) } },
    });

    const listUpdateCall = cacheUpdateQuery.mock.calls[0];
    const result = listUpdateCall[1]({ myNotifications: existingList }) as {
      myNotifications: unknown[];
    };
    expect(result.myNotifications).toHaveLength(30);
    expect((result.myNotifications[0] as { id: string }).id).toBe("new-1");
  });

  it("refetches both queries when a subscription event arrives before the initial cache is populated", () => {
    setup([], 0);
    render(<NotificationBell />);

    // Simulate the cache not being populated yet: the updateQuery callback
    // is invoked with existing === undefined, mirroring Apollo's real
    // behavior for a query that hasn't resolved.
    const cacheUpdateQuery = vi.fn(
      (_opts: { query: unknown }, updater: (existing: undefined) => unknown) => updater(undefined),
    );

    capturedOnData?.({
      client: { cache: { updateQuery: cacheUpdateQuery } },
      data: { data: { notificationCreated: makeNotification() } },
    });

    expect(mockRefetchList).toHaveBeenCalled();
    expect(mockRefetchCount).toHaveBeenCalled();
  });
});
