import { useId, useState, type ReactNode } from 'react'
import { Link2 } from 'lucide-react'
import { Alert } from './Alert'
import { Button, type ButtonProps } from './Button'
import { CopyButton } from './CopyButton'
import { Input } from './Input'
import { Modal } from './Modal'
import { Spinner } from './Spinner'
import { cn } from '../../lib/utils'

export interface ShareLink {
  url: string
  /** Shown as a warning beside the link, e.g. when the data had to be left out. */
  note?: string
}

export interface ShareButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  /** Builds the link when the dialog opens, so it always reflects current state. */
  createLink: () => Promise<ShareLink>
  /** Dialog title, e.g. "Share pivot table". */
  title: string
  /** What the link carries, e.g. "your data and every pivot setting". */
  contents: ReactNode
  children?: ReactNode
}

/**
 * A button that opens a dialog holding a self-contained share link.
 *
 * The link is shown rather than written straight to the clipboard: building it
 * is async (compression), and Safari refuses clipboard writes that happen
 * after an await. It also lets the user see what they are about to send.
 */
export function ShareButton({ createLink, title, contents, children, className, ...props }: ShareButtonProps) {
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<ShareLink | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const handleShare = async () => {
    setOpen(true)
    setPending(true)
    setLink(null)
    setError('')
    try {
      setLink(await createLink())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create a share link.')
    } finally { setPending(false) }
  }

  return (
    <>
      <Button variant="secondary" size="sm" {...props} className={cn('gap-1.5', className)} onClick={handleShare} disabled={pending || props.disabled}>
        <Link2 className="h-3 w-3" aria-hidden="true" /> {children ?? 'Share'}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}
        onKeyDown={(event) => {
          // Close only the dialog when it is opened inside a fullscreen card.
          if (event.key === 'Escape') { event.stopPropagation(); setOpen(false) }
        }}>
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-ink-muted)]">
            The link contains {contents}. Anyone with the link can open and edit a copy.
          </p>
          <p className="text-xs text-[var(--color-ink-muted)]">
            It is all packed into the part after the <code>#</code>, which browsers never send to a
            server — nothing is uploaded or stored, here or anywhere else.
          </p>
          {pending && <div role="status" className="flex items-center gap-2 text-xs"><Spinner size="sm" /> Creating link…</div>}
          {error && <Alert variant="error">{error}</Alert>}
          {link?.note && <Alert variant="warning" size="sm">{link.note}</Alert>}
          {link && <>
            <Input id={inputId} label="Share link" value={link.url} readOnly onFocus={(event) => event.target.select()} />
            <CopyButton text={link.url}>Copy link</CopyButton>
          </>}
        </div>
      </Modal>
    </>
  )
}
