import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, FileText, CheckCheck, Loader2, User } from 'lucide-react';
import { Button } from '../ui/button';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export function MessageThread({ threadType, referenceId, title = 'Negotiation Thread' }) {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    if (!threadType || !referenceId) return;
    try {
      const res = await api.get(`/messages/${threadType}/${referenceId}`);
      setMessages(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 8000); // Polling fallback for real-time
    return () => clearInterval(interval);
  }, [threadType, referenceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachmentUrl) return;

    setSending(true);
    try {
      const attachments = [];
      if (attachmentName && attachmentUrl) {
        attachments.push({
          name: attachmentName,
          fileUrl: attachmentUrl,
          fileType: 'application/pdf',
          fileSize: 102400,
        });
      }

      const res = await api.post(`/messages/${threadType}/${referenceId}`, {
        message: newMessage.trim(),
        attachments,
      });

      setMessages((prev) => [...prev, res.data]);
      setNewMessage('');
      setAttachmentName('');
      setAttachmentUrl('');
      setShowAttachmentInput(false);
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Thread Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{title}</h4>
          <p className="text-[11px] text-slate-500">Persistent order communication thread &bull; Mill & Customer</p>
        </div>
        <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
          {messages.length} Messages
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[360px] bg-slate-50/30">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-xs gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Loading communication thread...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No messages yet. Start the conversation to discuss specifications, price, or timeline.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId?._id === user?._id || msg.senderId === user?._id;
            const isAdmin = msg.senderRole === 'ADMIN';

            return (
              <div
                key={msg._id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-slate-700">
                    {msg.senderName}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                      isAdmin
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {msg.senderRole}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-xs ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>

                  {/* Attachments */}
                  {msg.attachments?.length > 0 && (
                    <div className="mt-2 space-y-1 pt-1.5 border-t border-blue-400/30">
                      {msg.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-1.5 p-1 rounded text-[11px] underline font-medium ${
                            isMe ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                          }`}
                        >
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate">{att.name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white">
        {showAttachmentInput && (
          <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600">
              <span>Attach Specification Document / Tech Pack:</span>
              <button
                type="button"
                onClick={() => setShowAttachmentInput(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>
            <input
              type="text"
              placeholder="Document Title (e.g. Lab_Dip_Sample_Specs.pdf)"
              value={attachmentName}
              onChange={(e) => setAttachmentName(e.target.value)}
              className="w-full text-xs px-2 py-1 border border-slate-300 rounded bg-white"
            />
            <input
              type="text"
              placeholder="Document URL / Cloud Reference"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              className="w-full text-xs px-2 py-1 border border-slate-300 rounded bg-white"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAttachmentInput(!showAttachmentInput)}
            title="Attach Document"
            className="text-slate-500 hover:text-slate-700 h-9 px-2"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <input
            type="text"
            placeholder="Type your message or negotiate terms..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
          />

          <Button
            type="submit"
            size="sm"
            disabled={sending || (!newMessage.trim() && !attachmentUrl)}
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3 gap-1"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span className="text-xs">Send</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

