import { HTMLAttributes, forwardRef, ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { CircleAlert, CircleCheck, CircleX, TriangleAlert } from 'lucide-react'

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'default'
  icon?: ReactNode
}

const defaultIcons: Record<string, (size: 'sm' | 'default') => ReactNode> = {
  info: (size) => <CircleAlert className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
  success: (size) => <CircleCheck className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
  warning: (size) => <TriangleAlert className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
  error: (size) => <CircleX className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', size = 'default', icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-2 rounded-lg border',
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
          {
            'bg-[var(--color-cream-dark)] text-[var(--color-ink)] border-[var(--color-border)]': variant === 'info',
            'bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[var(--color-success-border)]': variant === 'success',
            'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border-[var(--color-warning-border)]': variant === 'warning',
            'bg-[var(--color-error-bg)] text-[var(--color-error-text)] border-[var(--color-error-border)]': variant === 'error',
          },
          className
        )}
        {...props}
      >
        <span className={cn(
          'flex-shrink-0',
          {
            'text-[var(--color-ink-muted)]': variant === 'info',
            'text-[var(--color-success-icon)]': variant === 'success',
            'text-[var(--color-warning-icon)]': variant === 'warning',
            'text-[var(--color-error-icon)]': variant === 'error',
          }
        )}>
          {icon || defaultIcons[variant]?.(size)}
        </span>
        <div className="flex-1 font-medium">{children}</div>
      </div>
    )
  }
)

Alert.displayName = 'Alert'
