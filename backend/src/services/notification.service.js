import { Notification } from '../models/Notification.js';
import { broadcastEvent } from '../sockets/socketManager.js';
import { logger } from '../config/logger.js';

/**
 * Dispatches a notification: persists in MongoDB and emits a real-time socket event.
 */
export async function createAndSendNotification({
  recipientId,
  recipientRole,
  title,
  message,
  type,
  actionUrl,
  metadata = {},
}) {
  try {
    const notification = await Notification.create({
      recipientId,
      recipientRole,
      title,
      message,
      type,
      actionUrl,
      metadata,
    });

    // Emit to recipient's personal room or role room
    try {
      broadcastEvent(`user:${recipientId}`, 'notification', notification);
      broadcastEvent(`role:${recipientRole}`, 'notification', notification);
    } catch (sockErr) {
      // Socket emission failure shouldn't fail persistence
      logger.debug(`Socket broadcast skipped or failed: ${sockErr.message}`);
    }

    return notification;
  } catch (error) {
    logger.error(`Failed to create notification: ${error.message}`);
    return null;
  }
}

