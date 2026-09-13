import { useState } from 'react';
import Button from '../ui/Button';
import { useT } from '../../context/I18nContext';

/**
 * ContactAdminModal -- fixes "Message To Administrator does nothing".
 * Submits to POST /contact-admin (see src/api/contact.js), which stores
 * the message server-side. There is currently no admin-facing inbox UI to
 * read these (see ROADMAP.md) -- that's a real, separate follow-up, not
 * pretended to be finished here. What this fixes is specifically the
 * complaint that clicking the link did literally nothing; it now reaches
 * the backend and persists.
 */
export default function ContactAdminModal({ open, onClose, onSubmit, user }) {
  const t = useT();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setStatus('sending');
    try {
      await onSubmit?.(message.trim());
      setStatus('sent');
      setMessage('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-surface border border-line rounded-card p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="font-display text-lg mb-1.5">{t('footer.messageAdmin', 'Message To Administrator')}</div>
        <p className="text-[12px] text-textMute mb-3.5">
          {user ? `Sent as ${user.name}.` : 'You are not signed in — include a way to reach you if you want a reply.'}
        </p>

        {status === 'sent' ? (
          <div className="text-[12.5px] text-win text-center bg-win/10 border border-win/30 rounded-lg py-3 px-3 mb-3">
            Sent — thanks for letting us know.
          </div>
        ) : (
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="What's going on?"
            className="w-full bg-surface2 border border-line rounded-[9px] px-3 py-2.5 text-[13px] text-text placeholder:text-textMute focus:outline-none focus:border-gold resize-none mb-3"
          />
        )}
        {status === 'error' && <p className="text-[11.5px] text-loss mb-3">Couldn't send that — try again in a moment.</p>}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>
            {status === 'sent' ? 'Close' : 'Cancel'}
          </Button>
          {status !== 'sent' && (
            <Button onClick={handleSubmit} disabled={status === 'sending' || !message.trim()}>
              {status === 'sending' ? '…' : 'Send'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
