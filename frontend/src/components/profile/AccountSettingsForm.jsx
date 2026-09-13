import { useState } from 'react';
import SectionCard from '../ui/SectionCard';
import TextField from '../ui/TextField';
import FileUploadField from '../ui/FileUploadField';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { useT } from '../../context/I18nContext';

/**
 * AccountSettingsForm — spec §6.11 regular-user bullet 1: username,
 * password, avatar.
 *
 * Fix for "Save Changes button does not work": it previously *did* call
 * onSave, but any failure was only ever `console.error`'d — a user
 * clicking Save with, say, an expired session would see literally nothing
 * happen. This now tracks its own save status and shows a real inline
 * success/error message.
 */
export default function AccountSettingsForm({ user, onSave }) {
  const t = useT();
  const [username, setUsername] = useState(user.name);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    setStatus('saving');
    try {
      await onSave?.({ username, password });
      setStatus('saved');
      setPassword('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err?.message || 'Something went wrong saving your changes.');
    }
  };

  return (
    <SectionCard title={t('profile.account', 'Account')}>
      <div className="flex items-center gap-3.5 mb-4">
        <Avatar user={user} size="md" className="!w-14 !h-14 !text-lg" />
        <FileUploadField accept="image/png,image/jpeg" onFile={(f) => onSave?.({ avatarFile: f })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField label={t('profile.username', 'Username')} value={username} onChange={(e) => setUsername(e.target.value)} />
        <TextField
          label={t('profile.newPassword', 'New password')}
          type="password"
          placeholder="Leave blank to keep current"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {status === 'saved' && <p className="text-[12px] text-win mt-3">Saved.</p>}
      {status === 'error' && <p className="text-[12px] text-loss mt-3">{errorMessage}</p>}

      <Button className="mt-3.5" onClick={handleSave} disabled={status === 'saving'}>
        {status === 'saving' ? '…' : t('profile.saveChanges', 'Save Changes')}
      </Button>
    </SectionCard>
  );
}
