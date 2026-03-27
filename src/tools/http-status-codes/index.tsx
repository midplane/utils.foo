import { useState } from 'react'
import { Globe } from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { SearchInput } from '../../components/ui/SearchInput'
import { EmptyState } from '../../components/ui/EmptyState'

// ─── Data ─────────────────────────────────────────────────────────────────────

interface StatusCode {
  code: number
  name: string
  description: string
}

interface StatusGroup {
  range: string
  label: string
  color: string        // Tailwind bg class for badge
  textColor: string    // Tailwind text class for badge
  borderColor: string  // Tailwind border class for card accent
  codes: StatusCode[]
}

const STATUS_GROUPS: StatusGroup[] = [
  {
    range: '1xx',
    label: 'Informational',
    color: 'bg-[var(--color-info-bg)]',
    textColor: 'text-[var(--color-info-text)]',
    borderColor: 'border-[var(--color-info-border)]',
    codes: [
      { code: 100, name: 'Continue', description: 'The server has received the request headers and the client should proceed to send the request body.' },
      { code: 101, name: 'Switching Protocols', description: 'The server agrees to switch protocols as requested by the client (e.g. upgrading to WebSocket).' },
      { code: 102, name: 'Processing', description: 'The server has received and is processing the request, but no response is available yet (WebDAV).' },
      { code: 103, name: 'Early Hints', description: 'Used with the Link header to allow the browser to start preloading resources while the server prepares the full response.' },
    ],
  },
  {
    range: '2xx',
    label: 'Success',
    color: 'bg-[var(--color-success-bg)]',
    textColor: 'text-[var(--color-success-text)]',
    borderColor: 'border-[var(--color-success-border)]',
    codes: [
      { code: 200, name: 'OK', description: 'The request succeeded. The response body contains the requested resource or action result.' },
      { code: 201, name: 'Created', description: 'The request succeeded and a new resource was created. Typically returned after POST or PUT.' },
      { code: 202, name: 'Accepted', description: 'The request has been accepted for processing, but processing is not yet complete.' },
      { code: 203, name: 'Non-Authoritative Information', description: 'The response is from a transforming proxy and may differ from the origin server\'s 200 response.' },
      { code: 204, name: 'No Content', description: 'The server successfully processed the request and is not returning any content.' },
      { code: 205, name: 'Reset Content', description: 'The server processed the request and asks the client to reset the document view.' },
      { code: 206, name: 'Partial Content', description: 'The server is delivering only part of the resource due to a Range header sent by the client.' },
      { code: 207, name: 'Multi-Status', description: 'The response body contains multiple separate response codes for multiple sub-requests (WebDAV).' },
      { code: 208, name: 'Already Reported', description: 'Members of a DAV binding have already been enumerated in a previous reply (WebDAV).' },
      { code: 226, name: 'IM Used', description: 'The server fulfilled a GET request and the response is a result of one or more instance-manipulations applied to the current instance.' },
    ],
  },
  {
    range: '3xx',
    label: 'Redirection',
    color: 'bg-[var(--color-warning-bg)]',
    textColor: 'text-[var(--color-warning-text)]',
    borderColor: 'border-[var(--color-warning-border)]',
    codes: [
      { code: 300, name: 'Multiple Choices', description: 'The request has more than one possible response. The user or client should choose one.' },
      { code: 301, name: 'Moved Permanently', description: 'The requested resource has been permanently moved to a new URL. Future requests should use the new URL.' },
      { code: 302, name: 'Found', description: 'The resource is temporarily at a different URL. The client should continue using the original URL for future requests.' },
      { code: 303, name: 'See Other', description: 'The server is redirecting the client to a different resource via GET, typically after a POST.' },
      { code: 304, name: 'Not Modified', description: 'The cached version of the resource is still valid. The client can use its cached copy.' },
      { code: 305, name: 'Use Proxy', description: 'The requested resource must be accessed through the proxy given by the Location field (deprecated).' },
      { code: 307, name: 'Temporary Redirect', description: 'The resource is temporarily under a different URL. Unlike 302, the same HTTP method must be used.' },
      { code: 308, name: 'Permanent Redirect', description: 'The resource has permanently moved to another URL. Unlike 301, the same HTTP method must be used.' },
    ],
  },
  {
    range: '4xx',
    label: 'Client Error',
    color: 'bg-orange-100',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
    codes: [
      { code: 400, name: 'Bad Request', description: 'The server cannot process the request due to malformed syntax, invalid framing, or deceptive routing.' },
      { code: 401, name: 'Unauthorized', description: 'Authentication is required and has failed or has not been provided.' },
      { code: 402, name: 'Payment Required', description: 'Reserved for future use. Originally intended for digital payment systems.' },
      { code: 403, name: 'Forbidden', description: 'The client does not have permission to access the resource. Unlike 401, authentication will not help.' },
      { code: 404, name: 'Not Found', description: 'The server cannot find the requested resource. The URL may be wrong or the resource may not exist.' },
      { code: 405, name: 'Method Not Allowed', description: 'The HTTP method used is not supported for the requested resource.' },
      { code: 406, name: 'Not Acceptable', description: 'The server cannot produce a response matching the Accept headers sent by the client.' },
      { code: 407, name: 'Proxy Authentication Required', description: 'Authentication with the proxy is required before this request can be served.' },
      { code: 408, name: 'Request Timeout', description: 'The server timed out waiting for the request. The client may resend the request.' },
      { code: 409, name: 'Conflict', description: 'The request conflicts with the current state of the resource, such as a version conflict on an edit.' },
      { code: 410, name: 'Gone', description: 'The resource has been permanently deleted and will not be available again.' },
      { code: 411, name: 'Length Required', description: 'The request did not specify a Content-Length, which the server requires.' },
      { code: 412, name: 'Precondition Failed', description: 'The server does not meet one of the preconditions specified in the request headers.' },
      { code: 413, name: 'Content Too Large', description: 'The request body is larger than the server is willing or able to process.' },
      { code: 414, name: 'URI Too Long', description: 'The URI provided was too long for the server to process.' },
      { code: 415, name: 'Unsupported Media Type', description: 'The request\'s media type is not supported by the server.' },
      { code: 416, name: 'Range Not Satisfiable', description: 'The client requested a portion of the file but the server cannot supply that portion.' },
      { code: 417, name: 'Expectation Failed', description: 'The server cannot meet the requirements of the Expect request header.' },
      { code: 418, name: "I'm a Teapot", description: 'The server refuses to brew coffee because it is a teapot. An April Fools\' joke in RFC 2324 that became an official status code.' },
      { code: 421, name: 'Misdirected Request', description: 'The request was directed at a server that is not able to produce a response.' },
      { code: 422, name: 'Unprocessable Content', description: 'The request is well-formed but contains semantic errors. Common in REST APIs for validation failures.' },
      { code: 423, name: 'Locked', description: 'The source or destination resource of a method is locked (WebDAV).' },
      { code: 424, name: 'Failed Dependency', description: 'The request failed because it depended on another request that failed (WebDAV).' },
      { code: 425, name: 'Too Early', description: 'The server is unwilling to process a request that might be replayed to avoid potential replay attacks.' },
      { code: 426, name: 'Upgrade Required', description: 'The client should switch to a different protocol, such as TLS/1.3, given in the Upgrade header.' },
      { code: 428, name: 'Precondition Required', description: 'The origin server requires the request to be conditional to prevent lost-update conflicts.' },
      { code: 429, name: 'Too Many Requests', description: 'The client has sent too many requests in a given amount of time (rate limiting).' },
      { code: 431, name: 'Request Header Fields Too Large', description: 'The server is unwilling to process the request because its header fields are too large.' },
      { code: 451, name: 'Unavailable For Legal Reasons', description: 'The server cannot provide the resource for legal reasons, such as government censorship.' },
    ],
  },
  {
    range: '5xx',
    label: 'Server Error',
    color: 'bg-[var(--color-error-bg)]',
    textColor: 'text-[var(--color-error-text)]',
    borderColor: 'border-[var(--color-error-border)]',
    codes: [
      { code: 500, name: 'Internal Server Error', description: 'The server encountered an unexpected condition that prevented it from fulfilling the request.' },
      { code: 501, name: 'Not Implemented', description: 'The server does not support the functionality required to fulfill the request.' },
      { code: 502, name: 'Bad Gateway', description: 'The server, while acting as a gateway, received an invalid response from the upstream server.' },
      { code: 503, name: 'Service Unavailable', description: 'The server is temporarily unable to handle the request, usually due to overload or maintenance.' },
      { code: 504, name: 'Gateway Timeout', description: 'The server, acting as a gateway, did not receive a timely response from the upstream server.' },
      { code: 505, name: 'HTTP Version Not Supported', description: 'The server does not support the HTTP version used in the request.' },
      { code: 506, name: 'Variant Also Negotiates', description: 'The server has a circular reference in transparent content negotiation configuration.' },
      { code: 507, name: 'Insufficient Storage', description: 'The server cannot store the representation needed to complete the request (WebDAV).' },
      { code: 508, name: 'Loop Detected', description: 'The server detected an infinite loop while processing the request (WebDAV).' },
      { code: 510, name: 'Not Extended', description: 'The server requires further extensions to the request in order to fulfill it.' },
      { code: 511, name: 'Network Authentication Required', description: 'The client needs to authenticate to gain network access, e.g. a captive portal.' },
    ],
  },
]

// Flatten all codes for search
const ALL_CODES: (StatusCode & { group: StatusGroup })[] = STATUS_GROUPS.flatMap(
  (group) => group.codes.map((c) => ({ ...c, group }))
)

// ─── Component ────────────────────────────────────────────────────────────────

export default function HttpStatusCodesTool() {
  const [query, setQuery] = useState('')

  const trimmed = query.trim().toLowerCase()
  const filtered = trimmed
    ? ALL_CODES.filter(
        (c) =>
          String(c.code).includes(trimmed) ||
          c.name.toLowerCase().includes(trimmed) ||
          c.description.toLowerCase().includes(trimmed)
      )
    : null

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <ToolHeader icon={<Globe />} title="HTTP" accentedSuffix="Status Codes" />

        {/* Search */}
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by code or name…"
          className="w-full sm:w-64"
        />
      </div>

      {/* Search results */}
      {filtered !== null && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <EmptyState query={query} className="py-6" />
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filtered.map((c) => (
                  <StatusCard key={c.code} item={c} group={c.group} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Full grouped list */}
      {filtered === null && (
        <div className="space-y-6">
          {STATUS_GROUPS.map((group) => (
            <section key={group.range}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${group.color} ${group.textColor}`}>
                  {group.range}
                </span>
                <span className="text-sm font-semibold text-[var(--color-ink)]">{group.label}</span>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
                <span className="text-[10px] text-[var(--color-ink-muted)]">{group.codes.length} codes</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.codes.map((item) => (
                  <StatusCard key={item.code} item={item} group={group} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Status Card ──────────────────────────────────────────────────────────────

function StatusCard({ item, group }: { item: StatusCode; group: StatusGroup }) {
  return (
    <Card className={`border-l-2 ${group.borderColor}`}>
      <CardContent className="py-3 px-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`font-mono text-sm font-bold ${group.textColor}`}>{item.code}</span>
          <span className="text-sm font-medium text-[var(--color-ink)] leading-tight">{item.name}</span>
        </div>
        <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">{item.description}</p>
      </CardContent>
    </Card>
  )
}


