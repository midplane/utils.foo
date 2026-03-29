import { useState } from 'react'
import { Button, ButtonProps } from './Button'
import { cn } from '../../lib/utils'

interface CopyButtonProps extends Omit<ButtonProps, 'onClick'> {
  text: string
}

export function CopyButton({ text, className, children, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      className={cn(
        'gap-1',
        copied && 'bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success-text)] hover:bg-[var(--color-success-bg)]',
        className
      )}
      {...props}
    >
      {copied ? (
        <>
          <CheckIcon className="w-3 h-3" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <CopyIcon className="w-3 h-3" />
          <span>{children || 'Copy'}</span>
        </>
      )}
    </Button>
  )
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
