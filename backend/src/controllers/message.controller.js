import { OrderMessage, OrderRequest, Quotation, Order, User } from '../models/index.js';
import { broadcastEvent } from '../sockets/socketManager.js';
import { createAndSendNotification } from '../services/notification.service.js';

/**
 * Validates whether the authenticated user has clearance to view or post to this thread.
 */
async function verifyThreadAccess(threadType, referenceId, user) {
  if (user.role === 'ADMIN') return { hasAccess: true, customerId: null, refDoc: null };

  let doc = null;
  if (threadType === 'ORDER_REQUEST') {
    doc = await OrderRequest.findById(referenceId);
  } else if (threadType === 'QUOTATION') {
    doc = await Quotation.findById(referenceId);
  } else if (threadType === 'ORDER') {
    doc = await Order.findById(referenceId);
  }

  if (!doc) {
    return { hasAccess: false, notFound: true };
  }

  const isOwner = doc.customerId.toString() === user._id.toString();
  return { hasAccess: isOwner, customerId: doc.customerId, refDoc: doc };
}

export const getThreadMessages = async (req, res, next) => {
  try {
    const { threadType, referenceId } = req.params;

    const access = await verifyThreadAccess(threadType, referenceId, req.user);
    if (access.notFound) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Thread reference document not found' },
      });
    }

    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: You are not authorized to view this message thread' },
      });
    }

    const messages = await OrderMessage.find({ threadType, referenceId })
      .populate('senderId', 'name email role')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error) {
    next(error);
  }
};

export const postThreadMessage = async (req, res, next) => {
  try {
    const { threadType, referenceId } = req.params;
    const { message, attachments = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Message content cannot be blank' },
      });
    }

    const access = await verifyThreadAccess(threadType, referenceId, req.user);
    if (access.notFound) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Thread reference document not found' },
      });
    }

    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: You are not authorized to message on this document' },
      });
    }

    const newMessage = await OrderMessage.create({
      threadType,
      referenceId,
      senderId: req.user._id,
      senderRole: req.user.role,
      senderName: req.user.name,
      message: message.trim(),
      attachments,
    });

    // Real-time broadcast to room for active viewers
    try {
      broadcastEvent(`thread:${referenceId}`, 'new_message', newMessage);
    } catch (e) {
      // Ignored
    }

    // Send notifications to counterpart
    if (req.user.role === 'CUSTOMER') {
      const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' });
      for (const admin of admins) {
        await createAndSendNotification({
          recipientId: admin._id,
          recipientRole: 'ADMIN',
          title: `New Message from ${req.user.name}`,
          message: `${req.user.name} on ${threadType.toLowerCase().replace('_', ' ')}: "${message.substring(0, 80)}..."`,
          type: 'MESSAGE_RECEIVED',
          actionUrl: `/quotations?id=${referenceId}`,
          metadata: { threadType, referenceId, messageId: newMessage._id },
        });
      }
    } else if (req.user.role === 'ADMIN' && access.customerId) {
      await createAndSendNotification({
        recipientId: access.customerId,
        recipientRole: 'CUSTOMER',
        title: 'New Message from FabricOps Admin',
        message: `FabricOps team: "${message.substring(0, 80)}..."`,
        type: 'MESSAGE_RECEIVED',
        actionUrl: `/my-quotes?id=${referenceId}`,
        metadata: { threadType, referenceId, messageId: newMessage._id },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage,
    });
  } catch (error) {
    next(error);
  }
};

