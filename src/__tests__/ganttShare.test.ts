import { describe, expect, it } from 'vitest'
import { decodeState, encodeState } from '../tools/gantt-chart/shareState'
import { projectFromObject } from '../tools/gantt-chart/export'
import { SAMPLES } from '../tools/gantt-chart/samples'
import { encodeFragment } from '../lib/shareLink'

describe('gantt share links', () => {
  it('round-trips a whole plan and its zoom', async () => {
    const project = SAMPLES[0]!.build()
    const hash = await encodeState({ project, zoom: 'month' })
    expect(hash.startsWith('#g=')).toBe(true)
    expect(await decodeState(hash)).toEqual({ project, zoom: 'month' })
  })

  it('ignores other hashes and rejects a future version', async () => {
    expect(await decodeState('#p=abc')).toBeNull()
    await expect(decodeState(await encodeFragment('g', { v: 2, project: { tasks: [] } }))).rejects.toThrow('invalid')
    await expect(decodeState(await encodeFragment('g', { v: 1, project: null }))).rejects.toThrow('invalid')
  })

  it('falls back to week for an unknown zoom', async () => {
    const decoded = await decodeState(await encodeFragment('g', { v: 1, project: { tasks: [] }, zoom: 'decade' }))
    expect(decoded?.zoom).toBe('week')
  })
})

describe('projectFromObject', () => {
  it('coerces wrong-typed fields instead of passing them through', () => {
    const project = projectFromObject({
      name: 42,
      tasks: [{ id: 'a', name: { evil: true }, start: 20240101, duration: 'ten', progress: 500, deps: [{ from: 'b', type: 'FS', lag: 'x' }], parentId: 3 }],
      calendar: { workdays: [true], holidays: ['2024-02-31', '2024-12-25', 5] },
    })
    expect(project.name).toBe('Imported plan')
    const task = project.tasks[0]!
    expect(task.name).toBe('Task 1')
    expect(task.start).toBe('')
    expect(task.duration).toBe(5)
    expect(task.progress).toBe(100)
    expect(task.parentId).toBeNull()
    expect(task.deps).toEqual([{ from: 'b', type: 'FS', lag: 0 }])
    expect(project.calendar.workdays).toHaveLength(7)
    expect(project.calendar.holidays).toEqual(['2024-12-25'])
  })
})
