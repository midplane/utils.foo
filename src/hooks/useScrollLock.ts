import { useEffect } from 'react'

// ─── Ref-counted body scroll lock ────────────────────────────────────────────
//
// Modal and ExpandableCard can be on screen at the same time (a modal opened
// from inside a fullscreen card). Each previously owned `document.body.style
// .overflow` outright, so whichever unmounted first released the lock for both
// — closing the modal let the page scroll behind a still-expanded card.
//
// The count means the lock is only released when the last holder lets go, and
// the original inline value is restored rather than blanked.

let lockCount = 0
let previousOverflow: string | null = null

export function lockBodyScroll() {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount += 1
}

export function unlockBodyScroll() {
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow ?? ''
    previousOverflow = null
  }
}

/** Locks background scroll for as long as `active` is true. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    lockBodyScroll()
    return unlockBodyScroll
  }, [active])
}
