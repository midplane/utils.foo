import { HTMLAttributes, forwardRef, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error'
  icon?: ReactNode
}

const defaultIcons: Record<string, ReactNode> = {
  info: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-start gap-2 px-3 py-2 rounded-lg border text-sm',
          {
            'bg-[var(--color-cream-dark)] text-[var(--color-ink)] border-[var(--color-border)]': variant === 'info',
            'bg-emerald-50 text-emerald-800 border-emerald-200': variant === 'success',
            'bg-amber-50 text-amber-800 border-amber-200': variant === 'warning',
            'bg-red-50 text-red-800 border-red-200': variant === 'error',
          },
          className
        )}
        {...props}
      >
        <span className={cn(
          'flex-shrink-0 mt-0.5',
          {
            'text-[var(--color-ink-muted)]': variant === 'info',
            'text-emerald-600': variant === 'success',
            'text-amber-600': variant === 'warning',
            'text-red-600': variant === 'error',
          }
        )}>
          {icon || defaultIcons[variant]}
        </span>
        <div className="flex-1">{children}</div>
      </div>
    )
  }
)

Alert.displayName = 'Alert'
