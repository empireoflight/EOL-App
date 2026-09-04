import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Card } from '../../components/shared/Card'
import { Button } from '../../components/shared/Button'
import { Input } from '../../components/shared/Input'
import { Avatar } from '../../components/shared/Avatar'

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
// Browser-renderable formats only — HEIC/HEIF (the default on iPhone and
// recent Mac photo exports) uploads fine but no mainstream browser can
// actually paint it in an <img>, which is exactly what showed up as a
// broken-image icon instead of an avatar. Extension is derived from this
// map (not the filename) so the stored object always matches what was
// actually validated.
const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(profile?.name ?? '')
  const [savingName, setSavingName] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [error, setError] = useState('')

  const nameChanged = name.trim() && name.trim() !== profile?.name

  const handleSaveName = async () => {
    if (!supabase || !user || !nameChanged) return
    setSavingName(true)
    setError('')
    try {
      const { error: updateError } = await supabase.from('users').update({ name: name.trim() }).eq('id', user.id)
      if (updateError) throw updateError
      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your name.")
    } finally {
      setSavingName(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !supabase || !user) return
    if (file.size > MAX_AVATAR_BYTES) {
      setError('That image is too large — please pick one under 5MB.')
      return
    }
    const ext = ALLOWED_AVATAR_TYPES[file.type]
    if (!ext) {
      setError(
        "That photo format isn't supported here — please use a JPG or PNG. (HEIC photos from iPhone or Mac need to be converted first — most photo apps have an \"Export as JPEG\" option.)"
      )
      return
    }
    setUploadingAvatar(true)
    setError('')
    try {
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
      // Cache-bust so the new image shows immediately even though the path
      // (and therefore URL) is identical to whatever was there before.
      const avatar_url = `${publicUrlData.publicUrl}?t=${Date.now()}`
      const { error: updateError } = await supabase.from('users').update({ avatar_url }).eq('id', user.id)
      if (updateError) throw updateError
      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that image.")
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleToggleNotifications = async () => {
    if (!supabase || !user || !profile) return
    setSavingNotifications(true)
    setError('')
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ email_notifications_enabled: !profile.email_notifications_enabled })
        .eq('id', user.id)
      if (updateError) throw updateError
      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update your email preference.")
    } finally {
      setSavingNotifications(false)
    }
  }

  if (!profile) return null

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="m-0 text-[22px] font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-eol-text)' }}>
          Your profile
        </h1>
      </div>

      {error && (
        <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'var(--color-eol-pink)', color: 'var(--color-eol-pink-strong)' }}>
          {error}
        </div>
      )}

      <Card>
        <div className="flex items-center gap-4">
          <Avatar name={profile.name} avatarUrl={profile.avatar_url} size={64} />
          <div className="flex flex-col gap-1.5">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleAvatarChange(e)} />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} loading={uploadingAvatar}>
              Change photo
            </Button>
            <span className="text-[11px]" style={{ color: 'var(--color-eol-text-faint)' }}>
              JPG or PNG, up to 5MB
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-eol-text-muted)' }}>
              Email
            </span>
            <span className="text-[14px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              {profile.email}
            </span>
          </label>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button onClick={handleSaveName} loading={savingName} disabled={!nameChanged}>
              Save
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <button type="button" onClick={() => void handleToggleNotifications()} disabled={savingNotifications} className="flex w-full items-center justify-between gap-4 text-left">
          <div>
            <div className="text-[13.5px] font-semibold" style={{ color: 'var(--color-eol-text)' }}>
              Email notifications
            </div>
            <p className="m-0 mt-0.5 text-[12px]" style={{ color: 'var(--color-eol-text-secondary)' }}>
              Reminders and status updates — you'll always be emailed about a direct invite regardless of this setting.
            </p>
          </div>
          <span
            className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
            style={{ background: profile.email_notifications_enabled ? 'var(--color-eol-accent)' : 'var(--color-eol-border-strong)' }}
          >
            <span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
              style={{ left: 2, transform: profile.email_notifications_enabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </span>
        </button>
      </Card>
    </div>
  )
}
