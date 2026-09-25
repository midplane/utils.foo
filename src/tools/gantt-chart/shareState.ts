import { decodeFragment, encodeFragment, ShareLinkError } from '../../lib/shareLink'
import { projectFromObject } from './export'
import { Project } from './model'
import { ZOOM_LEVELS, ZoomLevel } from './timeline'

/** A plan and the zoom it was being viewed at. */
export interface ShareState {
  project: Project
  zoom: ZoomLevel
}

const PREFIX = 'g'
const VERSION = 1
const INVALID = 'This Gantt share link is invalid or from a newer version of the site.'
const TOO_LARGE = 'This plan is too large for a share link. Use Export → Copy JSON and send that instead.'

export async function encodeState(state: ShareState): Promise<string> {
  try {
    return await encodeFragment(PREFIX, { v: VERSION, project: state.project, zoom: state.zoom })
  } catch (error) {
    if (!(error instanceof ShareLinkError) || error.kind !== 'too-large') throw error
  }
  // The generic message cannot point at the JSON export, which has no size limit.
  throw new Error(TOO_LARGE)
}

export async function decodeState(hash: string): Promise<ShareState | null> {
  const parsed = await decodeFragment(PREFIX, hash)
  if (parsed === null) return null
  const raw = parsed as { v?: unknown; project?: unknown; zoom?: unknown }
  if (typeof parsed !== 'object' || raw.v !== VERSION) throw new ShareLinkError('invalid', INVALID)
  let project: Project
  try {
    project = projectFromObject(raw.project)
  } catch {
    throw new ShareLinkError('invalid', INVALID)
  }
  const zoom = ZOOM_LEVELS.includes(raw.zoom as ZoomLevel) ? (raw.zoom as ZoomLevel) : 'week'
  return { project, zoom }
}
