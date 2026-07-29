const hostname = typeof window === 'undefined' ? '' : window.location.hostname

const normalizedHostname = hostname.replace(/^www\./, '')

export const siteName = normalizedHostname === 'utils.bar' ? 'utils.bar' : 'utils.foo'

const [prefix = siteName, ...suffix] = siteName.split('.')

export const sitePrefix = prefix
export const siteSuffix = suffix.join('.')
export const siteMark = `${sitePrefix[0] ?? 'u'}.${siteSuffix[0] ?? 'f'}`
