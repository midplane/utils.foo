export interface PermSet {
  read: boolean
  write: boolean
  execute: boolean
}

export interface Permissions {
  owner: PermSet
  group: PermSet
  other: PermSet
}

export function permSetToOctal(p: PermSet): number {
  return (p.read ? 4 : 0) + (p.write ? 2 : 0) + (p.execute ? 1 : 0)
}

export function permSetToSymbolic(p: PermSet): string {
  return (p.read ? 'r' : '-') + (p.write ? 'w' : '-') + (p.execute ? 'x' : '-')
}

export function octalDigitToPermSet(n: number): PermSet {
  return { read: !!(n & 4), write: !!(n & 2), execute: !!(n & 1) }
}

export function permissionsToOctal(perms: Permissions): string {
  return `${permSetToOctal(perms.owner)}${permSetToOctal(perms.group)}${permSetToOctal(perms.other)}`
}

export function permissionsToSymbolic(perms: Permissions): string {
  return permSetToSymbolic(perms.owner) + permSetToSymbolic(perms.group) + permSetToSymbolic(perms.other)
}

export function octalToPermissions(octal: string): Permissions | null {
  if (!/^[0-7]{3}$/.test(octal)) return null
  return {
    owner: octalDigitToPermSet(parseInt(octal[0]!)),
    group: octalDigitToPermSet(parseInt(octal[1]!)),
    other: octalDigitToPermSet(parseInt(octal[2]!)),
  }
}

export function symbolicToPermissions(sym: string): Permissions | null {
  if (!/^[r-][w-][x-][r-][w-][x-][r-][w-][x-]$/.test(sym)) return null
  const parseSet = (s: string): PermSet => ({
    read:    s[0] === 'r',
    write:   s[1] === 'w',
    execute: s[2] === 'x',
  })
  return {
    owner: parseSet(sym.slice(0, 3)),
    group: parseSet(sym.slice(3, 6)),
    other: parseSet(sym.slice(6, 9)),
  }
}

export function describePermissions(perms: Permissions): string {
  const parts: string[] = []

  const describe = (label: string, p: PermSet) => {
    const actions: string[] = []
    if (p.read)    actions.push('read')
    if (p.write)   actions.push('write')
    if (p.execute) actions.push('execute')
    if (actions.length === 0) parts.push(`${label}: no permissions`)
    else parts.push(`${label}: ${actions.join(', ')}`)
  }

  describe('Owner', perms.owner)
  describe('Group', perms.group)
  describe('Others', perms.other)
  return parts.join(' · ')
}
