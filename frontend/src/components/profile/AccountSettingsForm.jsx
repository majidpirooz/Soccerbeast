import { useState } from 'react';
import SectionCard from '../ui/SectionCard';
import TextField from '../ui/TextField';
import FileUploadField from '../ui/FileUploadField';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { useT } from '../../context/I18nContext';

/** AccountSettingsForm — spec §6.11 regular-user bullet 1: username, password, avatar. */
export default function AccountSettingsForm({ user, onSave }) {
  const t = useT();
  const [username, setUsername] = useState(user.name);
  const [password, setPassword] = useState('');

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
      <Button className="mt-3.5" onClick={() => onSave?.({ username, password })}>
        {t('profile.saveChanges', 'Save Changes')}
      </Button>
    </SectionCard>
  );
}
