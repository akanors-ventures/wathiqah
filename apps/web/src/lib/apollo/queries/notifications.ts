import { gql, type TypedDocumentNode } from "@apollo/client";
import type {
  MarkAllNotificationsReadMutation,
  MarkAllNotificationsReadMutationVariables,
  MarkNotificationReadMutation,
  MarkNotificationReadMutationVariables,
  MyNotificationsQuery,
  MyNotificationsQueryVariables,
  MyUnreadNotificationCountQuery,
  MyUnreadNotificationCountQueryVariables,
  NotificationCreatedSubscription,
  NotificationCreatedSubscriptionVariables,
} from "@/types/__generated__/graphql";

export const NOTIFICATION_FIELDS = gql`
  fragment NotificationFields on Notification {
    id
    type
    title
    body
    link
    read
    createdAt
  }
`;

export const MY_NOTIFICATIONS_QUERY: TypedDocumentNode<
  MyNotificationsQuery,
  MyNotificationsQueryVariables
> = gql`
  ${NOTIFICATION_FIELDS}
  query MyNotifications {
    myNotifications {
      ...NotificationFields
    }
  }
`;

export const MY_UNREAD_NOTIFICATION_COUNT_QUERY: TypedDocumentNode<
  MyUnreadNotificationCountQuery,
  MyUnreadNotificationCountQueryVariables
> = gql`
  query MyUnreadNotificationCount {
    myUnreadNotificationCount
  }
`;

export const MARK_NOTIFICATION_READ_MUTATION: TypedDocumentNode<
  MarkNotificationReadMutation,
  MarkNotificationReadMutationVariables
> = gql`
  ${NOTIFICATION_FIELDS}
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id) {
      ...NotificationFields
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ_MUTATION: TypedDocumentNode<
  MarkAllNotificationsReadMutation,
  MarkAllNotificationsReadMutationVariables
> = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

// ── Live updates ─────────────────────────────────────────────────────────────
// Scoped server-side to the subscriber's own userId (personal, not org-scoped
// — a user's notification inbox doesn't change based on which org they're
// currently viewing).

export const NOTIFICATION_CREATED_SUBSCRIPTION: TypedDocumentNode<
  NotificationCreatedSubscription,
  NotificationCreatedSubscriptionVariables
> = gql`
  ${NOTIFICATION_FIELDS}
  subscription NotificationCreated {
    notificationCreated {
      ...NotificationFields
    }
  }
`;
