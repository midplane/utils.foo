import { describe, it, expect } from 'vitest'
import {
  permSetToOctal,
  permSetToSymbolic,
  octalDigitToPermSet,
  permissionsToOctal,
  permissionsToSymbolic,
  octalToPermissions,
  symbolicToPermissions,
  describePermissions,
} from '../tools/chmod-calculator/logic'

describe('permSetToOctal', () => {
  it('rwx → 7', () => expect(permSetToOctal({ read: true,  write: true,  execute: true  })).toBe(7))
  it('rw- → 6', () => expect(permSetToOctal({ read: true,  write: true,  execute: false })).toBe(6))
  it('r-x → 5', () => expect(permSetToOctal({ read: true,  write: false, execute: true  })).toBe(5))
  it('r-- → 4', () => expect(permSetToOctal({ read: true,  write: false, execute: false })).toBe(4))
  it('-wx → 3', () => expect(permSetToOctal({ read: false, write: true,  execute: true  })).toBe(3))
  it('-w- → 2', () => expect(permSetToOctal({ read: false, write: true,  execute: false })).toBe(2))
  it('--x → 1', () => expect(permSetToOctal({ read: false, write: false, execute: true  })).toBe(1))
  it('--- → 0', () => expect(permSetToOctal({ read: false, write: false, execute: false })).toBe(0))
})

describe('permSetToSymbolic', () => {
  it('all on → "rwx"',  () => expect(permSetToSymbolic({ read: true,  write: true,  execute: true  })).toBe('rwx'))
  it('all off → "---"', () => expect(permSetToSymbolic({ read: false, write: false, execute: false })).toBe('---'))
  it('r-- ',            () => expect(permSetToSymbolic({ read: true,  write: false, execute: false })).toBe('r--'))
  it('rw-',             () => expect(permSetToSymbolic({ read: true,  write: true,  execute: false })).toBe('rw-'))
})

describe('octalDigitToPermSet', () => {
  it('7 → {r,w,x}', () => expect(octalDigitToPermSet(7)).toEqual({ read: true,  write: true,  execute: true  }))
  it('6 → {r,w,-}', () => expect(octalDigitToPermSet(6)).toEqual({ read: true,  write: true,  execute: false }))
  it('4 → {r,-,-}', () => expect(octalDigitToPermSet(4)).toEqual({ read: true,  write: false, execute: false }))
  it('0 → {-,-,-}', () => expect(octalDigitToPermSet(0)).toEqual({ read: false, write: false, execute: false }))
})

describe('octalToPermissions', () => {
  it('"644" → owner rw-, group r--, other r--', () => {
    const p = octalToPermissions('644')
    expect(p).not.toBeNull()
    expect(p!.owner).toEqual({ read: true,  write: true,  execute: false })
    expect(p!.group).toEqual({ read: true,  write: false, execute: false })
    expect(p!.other).toEqual({ read: true,  write: false, execute: false })
  })

  it('"755" → owner rwx, group r-x, other r-x', () => {
    const p = octalToPermissions('755')
    expect(p).not.toBeNull()
    expect(p!.owner).toEqual({ read: true,  write: true,  execute: true  })
    expect(p!.group).toEqual({ read: true,  write: false, execute: true  })
    expect(p!.other).toEqual({ read: true,  write: false, execute: true  })
  })

  it('"000" → no permissions for anyone', () => {
    const p = octalToPermissions('000')
    expect(p).not.toBeNull()
    expect(p!.owner).toEqual({ read: false, write: false, execute: false })
    expect(p!.group).toEqual({ read: false, write: false, execute: false })
    expect(p!.other).toEqual({ read: false, write: false, execute: false })
  })

  it('"777" → full permissions', () => {
    const p = octalToPermissions('777')
    expect(p).not.toBeNull()
    expect(p!.owner).toEqual({ read: true, write: true, execute: true })
  })

  it('returns null for out-of-range digit "888"', () => {
    expect(octalToPermissions('888')).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    expect(octalToPermissions('abc')).toBeNull()
  })

  it('returns null for 2-digit input', () => {
    expect(octalToPermissions('75')).toBeNull()
  })

  it('returns null for 4-digit input', () => {
    expect(octalToPermissions('0755')).toBeNull()
  })
})

describe('symbolicToPermissions', () => {
  it('"rwxr-xr-x" → 755', () => {
    const p = symbolicToPermissions('rwxr-xr-x')
    expect(p).not.toBeNull()
    expect(permissionsToOctal(p!)).toBe('755')
  })

  it('"rw-r--r--" → 644', () => {
    const p = symbolicToPermissions('rw-r--r--')
    expect(p).not.toBeNull()
    expect(permissionsToOctal(p!)).toBe('644')
  })

  it('returns null for wrong length', () => {
    expect(symbolicToPermissions('rwx')).toBeNull()
    expect(symbolicToPermissions('rwxrwxrwxrwx')).toBeNull()
  })

  it('returns null for invalid characters', () => {
    expect(symbolicToPermissions('rwxr-xabc')).toBeNull()
  })
})

describe('permissionsToOctal / permissionsToSymbolic round-trip', () => {
  const cases = ['000', '644', '755', '777', '400', '600', 'chmod']
    .filter(c => /^[0-7]{3}$/.test(c)) // only valid ones

  for (const octal of ['000', '644', '755', '777', '400', '600', '711', '664']) {
    it(`round-trip for ${octal}`, () => {
      const perms = octalToPermissions(octal)!
      expect(permissionsToOctal(perms)).toBe(octal)
      const symbolic = permissionsToSymbolic(perms)
      expect(symbolicToPermissions(symbolic)).toEqual(perms)
    })
  }
})

describe('describePermissions', () => {
  it('644 — owner read/write, group read, other read', () => {
    const p = octalToPermissions('644')!
    const desc = describePermissions(p)
    expect(desc).toContain('Owner: read, write')
    expect(desc).toContain('Group: read')
    expect(desc).toContain('Others: read')
  })

  it('000 — no permissions for anyone', () => {
    const p = octalToPermissions('000')!
    const desc = describePermissions(p)
    expect(desc).toContain('no permissions')
  })

  it('755 — owner has execute', () => {
    const p = octalToPermissions('755')!
    const desc = describePermissions(p)
    expect(desc).toContain('execute')
  })
})
