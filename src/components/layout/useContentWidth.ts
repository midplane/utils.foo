import { useLocation } from 'react-router-dom'
import { getToolByPath } from '../../tools/registry'

/**
 * Resolves the max-width class for the current route's content column.
 *
 * Tools opt into a wider column with `wide: true`, or a 1,600px column with
 * `wide: 'xl'`. Header, Footer and the main content consume this together
 * so their edges stay aligned.
 */
export function useContentWidth(): string {
  const { pathname } = useLocation()
  const wide = getToolByPath(pathname)?.wide
  return wide === 'xl' ? 'max-w-[1600px]' : wide ? 'max-w-7xl' : 'max-w-5xl'
}
