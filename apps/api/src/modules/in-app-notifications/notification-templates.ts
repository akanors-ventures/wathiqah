import { NotificationType } from '../../generated/prisma/client';

export interface NotificationContent {
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
}

/**
 * Single source of truth for every in-app notification's copy. Keeping this
 * centralized (instead of inline ternaries at each trigger point) means
 * adding a new trigger is one function here plus one call site, and a copy
 * change never has to be found across multiple service files.
 */
export const NotificationTemplates = {
  witnessInvited(creatorName: string): NotificationContent {
    return {
      type: NotificationType.WITNESS_INVITED,
      title: 'You were invited to witness a transaction',
      body: `${creatorName} invited you to witness a transaction.`,
      link: '/witnesses',
    };
  },

  witnessResponded(
    acknowledged: boolean,
    witnessName: string,
    transactionId: string,
  ): NotificationContent {
    return acknowledged
      ? {
          type: NotificationType.WITNESS_ACKNOWLEDGED,
          title: 'Witness acknowledged your transaction',
          body: `${witnessName} acknowledged a transaction you created.`,
          link: `/transactions/${transactionId}`,
        }
      : {
          type: NotificationType.WITNESS_DECLINED,
          title: 'Witness declined your transaction',
          body: `${witnessName} declined a transaction you created.`,
          link: `/transactions/${transactionId}`,
        };
  },

  witnessTransactionModified(
    updaterName: string,
    transactionId: string,
  ): NotificationContent {
    return {
      type: NotificationType.WITNESS_TRANSACTION_MODIFIED,
      title: 'A transaction you witnessed was updated',
      body: `${updaterName} modified a transaction you previously acknowledged.`,
      link: `/transactions/${transactionId}`,
    };
  },

  witnessTransactionCancelled(
    ownerName: string,
    transactionId: string,
  ): NotificationContent {
    return {
      type: NotificationType.WITNESS_TRANSACTION_CANCELLED,
      title: 'A transaction you witnessed was cancelled',
      body: `${ownerName} cancelled a transaction you previously acknowledged.`,
      link: `/transactions/${transactionId}`,
    };
  },

  provisioningGranted(expiresAt: Date): NotificationContent {
    return {
      type: NotificationType.PROVISIONING_GRANTED,
      title: 'Pro access granted',
      body: `Your Pro subscription is active until ${expiresAt.toLocaleDateString()}.`,
      link: '/pricing',
    };
  },

  provisioningRevoked(): NotificationContent {
    return {
      type: NotificationType.PROVISIONING_REVOKED,
      title: 'Pro access revoked',
      body: 'Your Pro subscription has been revoked.',
      link: '/pricing',
    };
  },

  provisioningExpired(): NotificationContent {
    return {
      type: NotificationType.PROVISIONING_EXPIRED,
      title: 'Pro access expired',
      body: 'Your Pro subscription has expired.',
      link: '/pricing',
    };
  },

  roleChanged(promoted: boolean): NotificationContent {
    return promoted
      ? {
          type: NotificationType.ROLE_PROMOTED,
          title: 'You were promoted to Admin',
          body: 'You now have admin privileges.',
          link: null,
        }
      : {
          type: NotificationType.ROLE_DEMOTED,
          title: 'Your Admin role was removed',
          body: 'Your admin privileges have been removed.',
          link: null,
        };
  },
};
