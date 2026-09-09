import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../shared/Button'
import { Input } from '../shared/Input'
import type { Artifact } from '../../lib/types'

const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024

function useArtifacts(visionId: string | undefined, experimentId: string | undefined) {
  const parentId = visionId ?? experimentId
  return useQuery({
    queryKey: ['artifacts', parentId],
    queryFn: async (): Promise<Artifact[]> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const query = supabase.from('artifacts').select('*').order('created_at', { ascending: false })
      const { data, error } = await (visionId ? query.eq('vision_id', visionId) : query.eq('experiment_id', experimentId as string))
      if (error) throw error
      return data
    },
    enabled: !!parentId,
  })
}

function ArtifactPill({ kind }: { kind: Artifact['kind'] }) {
  return (
    <span
      className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{ borderColor: 'var(--color-eol-border-strong)', color: 'var(--color-eol-text-muted)' }}
    >
      {kind === 'link' ? 'Link' : 'File'}
    </span>
  )
}

// Attaches to exactly one of visionId/experimentId — a linked doc (no
// Storage involved) or an uploaded file (Storage + a DB row pointing at it).
// Self-contained: owns its own query/mutations, so mounting it is a one-line
// drop-in on both the vision page and an experiment's expanded row.
export function ArtifactsSection({ teamId, visionId, experimentId }: { teamId: string; visionId?: string; experimentId?: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const parentId = visionId ?? experimentId
  const { data: artifacts } = useArtifacts(visionId, experimentId)

  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['artifacts', parentId] })

  const addLink = useMutation({
    mutationFn: async () => {
      if (!supabase || !user) throw new Error('Not ready')
      const { error: insertError } = await supabase.from('artifacts').insert({
        team_id: teamId,
        vision_id: visionId ?? null,
        experiment_id: experimentId ?? null,
        kind: 'link',
        label: linkLabel.trim(),
        url: linkUrl.trim(),
        created_by: user.id,
      })
      if (insertError) throw insertError
    },
    onSuccess: () => {
      setLinkLabel('')
      setLinkUrl('')
      setShowLinkForm(false)
      invalidate()
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Couldn't add that link."),
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !supabase || !user) return
    if (file.size > MAX_ARTIFACT_BYTES) {
      setError('That file is too large — please pick one under 25MB.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const artifactId = crypto.randomUUID()
      const path = `${teamId}/${artifactId}/${file.name}`
      const { error: uploadError } = await supabase.storage.from('artifacts').upload(path, file)
      if (uploadError) throw uploadError
      const { data: publicUrlData } = supabase.storage.from('artifacts').getPublicUrl(path)
      const { error: insertError } = await supabase.from('artifacts').insert({
        id: artifactId,
        team_id: teamId,
        vision_id: visionId ?? null,
        experiment_id: experimentId ?? null,
        kind: 'file',
        label: file.name,
        url: publicUrlData.publicUrl,
        storage_path: path,
        created_by: user.id,
      })
      if (insertError) throw insertError
      invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that file.")
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async (artifact: Artifact) => {
    if (!supabase) return
    setError('')
    try {
      if (artifact.kind === 'file' && artifact.storage_path) {
        await supabase.storage.from('artifacts').remove([artifact.storage_path])
      }
      const { error: deleteError } = await supabase.from('artifacts').delete().eq('id', artifact.id)
      if (deleteError) throw deleteError
      invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove that artifact.")
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {error && (
        <p className="m-0 text-[12px]" style={{ color: 'var(--color-eol-pink-strong)' }}>
          {error}
        </p>
      )}

      {artifacts && artifacts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {artifacts.map((artifact) => (
            <div key={artifact.id} className="flex items-center gap-2.5">
              <ArtifactPill kind={artifact.kind} />
              <a
                href={artifact.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-[12.5px] font-medium"
                style={{ color: 'var(--color-eol-accent-label)' }}
              >
                {artifact.label}
              </a>
              <button
                type="button"
                onClick={() => void handleRemove(artifact)}
                aria-label="Remove"
                className="shrink-0 text-[13px] opacity-50 hover:opacity-100"
                style={{ color: 'var(--color-eol-text-muted)' }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {showLinkForm ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError('')
            addLink.mutate()
          }}
          className="flex flex-col gap-2"
        >
          <Input label="Label" required value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="e.g. Value prop doc" />
          <Input label="URL" type="url" required value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
          <div className="flex gap-2">
            <Button type="submit" loading={addLink.isPending} className="flex-1">
              Add link
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowLinkForm(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setShowLinkForm(true)} className="text-[12.5px] font-medium" style={{ color: 'var(--color-eol-accent-label)' }}>
            + Add a link
          </button>
          <label className="cursor-pointer text-[12.5px] font-medium" style={{ color: 'var(--color-eol-accent-label)' }}>
            {uploading ? 'Uploading…' : '+ Upload a file'}
            <input type="file" className="hidden" disabled={uploading} onChange={(e) => void handleFileChange(e)} />
          </label>
        </div>
      )}
    </div>
  )
}
