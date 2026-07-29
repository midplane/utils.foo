import { useLocation } from 'react-router-dom'
import { getToolByPath } from '../../tools/registry'

/**
 * Resolves the max-width class for the current route's content column.
 *
 * Tools opt into a wider column by setting `wide: true` in their meta — used by
 * split-pane and canvas-style tools. Header, Footer and the main content all
 * consume this so their edges stay aligned.
 */
export function useContentWidth(): string {
  const { pathname } = useLocation()
  return getToolByPath(pathname)?.wide ? 'max-w-7xl' : 'max-w-5xl'
}
