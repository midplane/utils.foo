import { useState } from 'react'
import { Link2 } from 'lucide-react'
import { Alert, Button, CopyButton, Input, Modal, Spinner } from '../../components/ui'
import { createShareUrl, type ShareState } from './shareState'

export function ShareButton({ state }: { state: ShareState }) {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleShare = async () => {
    setOpen(true)
    setPending(true)
    setLink('')
    setError('')
    try {
      setLink(await createShareUrl(state, window.location.href))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not create a share link.')
    } finally { setPending(false) }
  }

  return (
    <>
      <Button variant="secondary" size="sm" className="gap-1.5" onClick={handleShare} disabled={pending}>
        <Link2 className="h-3 w-3" /> Share
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Share D2 diagram"
        onKeyDown={event => {
          // Close only the dialog when it is opened inside a fullscreen editor.
          if (event.key === 'Escape') { event.stopPropagation(); setOpen(false) }
        }}>
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-ink-muted)]">This link includes your source and all diagram and view settings. Anyone with the link can open and edit a copy.</p>
          {pending && <div role="status" className="flex items-center gap-2 text-xs"><Spinner size="sm" /> Creating link…</div>}
          {error && <Alert variant="error">{error}</Alert>}
          {link && <>
            <Input id="d2-share-link" label="Share link" value={link} readOnly onFocus={event => event.target.select()} />
            <CopyButton text={link}>Copy link</CopyButton>
          </>}
        </div>
      </Modal>
    </>
  )
}
