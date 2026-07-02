import { useMutation, useQuery, useSubscription } from "@apollo/client/react";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { upsertById } from "@/lib/apollo/org-live-updates";
import {
  MARK_ALL_NOTIFICATIONS_READ_MUTATION,
  MARK_NOTIFICATION_READ_MUTATION,
  MY_NOTIFICATIONS_QUERY,
  MY_UNREAD_NOTIFICATION_COUNT_QUERY,
  NOTIFICATION_CREATED_SUBSCRIPTION,
} from "@/lib/apollo/queries/notifications";
import { cn } from "@/lib/utils";
import type { MyNotificationsQuery } from "@/types/__generated__/graphql";

type NotificationListItem = MyNotificationsQuery["myNotifications"][number];

export function NotificationBell() {
  const navigate = useNavigate();
  const { data: listData } = useQuery(MY_NOTIFICATIONS_QUERY);
  const { data: countData } = useQuery(MY_UNREAD_NOTIFICATION_COUNT_QUERY);

  const [markRead] = useMutation(MARK_NOTIFICATION_READ_MUTATION, {
    update: (cache, { data }) => {
      const updated = data?.markNotificationRead;
      if (!updated) return;
      cache.updateQuery({ query: MY_UNREAD_NOTIFICATION_COUNT_QUERY }, (existing) =>
        existing
          ? {
              myUnreadNotificationCount: Math.max(0, existing.myUnreadNotificationCount - 1),
            }
          : existing,
      );
    },
  });
  const [markAllRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ_MUTATION, {
    update: (cache, { data }) => {
      if (!data?.markAllNotificationsRead) return;
      cache.updateQuery({ query: MY_UNREAD_NOTIFICATION_COUNT_QUERY }, () => ({
        myUnreadNotificationCount: 0,
      }));
      cache.updateQuery({ query: MY_NOTIFICATIONS_QUERY }, (existing) =>
        existing
          ? {
              myNotifications: existing.myNotifications.map((n) => ({ ...n, read: true })),
            }
          : existing,
      );
    },
  });

  useSubscription(NOTIFICATION_CREATED_SUBSCRIPTION, {
    onData: ({ client, data }) => {
      const notification = data.data?.notificationCreated;
      if (!notification) return;

      client.cache.updateQuery({ query: MY_NOTIFICATIONS_QUERY }, (existing) =>
        existing
          ? { myNotifications: upsertById(existing.myNotifications, notification) }
          : existing,
      );
      client.cache.updateQuery({ query: MY_UNREAD_NOTIFICATION_COUNT_QUERY }, (existing) =>
        existing ? { myUnreadNotificationCount: existing.myUnreadNotificationCount + 1 } : existing,
      );

      toast(notification.title, {
        description: notification.body,
        action: notification.link
          ? {
              label: "View",
              onClick: () => navigate({ to: notification.link as never }),
            }
          : undefined,
      });
    },
  });

  const notifications = listData?.myNotifications ?? [];
  const unreadCount = countData?.myUnreadNotificationCount ?? 0;

  async function handleItemClick(notification: NotificationListItem) {
    if (!notification.read) {
      await markRead({ variables: { id: notification.id } });
    }
    if (notification.link) {
      navigate({ to: notification.link as never });
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b">
          <p className="text-sm font-bold">Notifications</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <BellOff className="h-8 w-8 opacity-30" />
              <p className="text-xs font-medium">No notifications yet</p>
            </div>
          )}
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleItemClick(notification)}
              className={cn(
                "flex w-full items-start gap-2.5 text-left px-3.5 py-3 border-b last:border-0 transition-colors hover:bg-muted/60",
                !notification.read && "bg-primary/[0.04]",
              )}
            >
              <span
                className={cn(
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  notification.read ? "bg-transparent" : "bg-primary",
                )}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[13px] leading-tight",
                    notification.read ? "font-medium text-muted-foreground" : "font-semibold",
                  )}
                >
                  {notification.title}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {notification.body}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1 font-medium">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
