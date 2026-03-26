import { cn } from '../../lib/utils'

export interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-[var(--color-cream-dark)] rounded animate-pulse',
        className
      )}
    />
  )
}
