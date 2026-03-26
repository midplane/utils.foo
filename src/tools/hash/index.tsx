import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { cn } from '../../lib/utils'
import { ChevronDown, Fingerprint, Info, Loader2, ShieldCheck, Trash2, ChevronLeft } from 'lucide-react'

type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512'

const ALGORITHMS: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']

async function computeHash(text: string, algorithm: HashAlgorithm): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  
  // Map algorithm names to Web Crypto API names
  const algoMap: Record<HashAlgorithm, string> = {
    'MD5': 'MD5',
    'SHA-1': 'SHA-1',
    'SHA-256': 'SHA-256',
    'SHA-512': 'SHA-512',
  }
  
  // MD5 is not supported by Web Crypto API, use a simple implementation
  if (algorithm === 'MD5') {
    return md5(text)
  }
  
  const hashBuffer = await crypto.subtle.digest(algoMap[algorithm], data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Simple MD5 implementation
function md5(string: string): string {
  function rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift))
  }

  function addUnsigned(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff)
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16)
    return (msw << 16) | (lsw & 0xffff)
  }

  function f(x: number, y: number, z: number): number { return (x & y) | (~x & z) }
  function g(x: number, y: number, z: number): number { return (x & z) | (y & ~z) }
  function h(x: number, y: number, z: number): number { return x ^ y ^ z }
  function i(x: number, y: number, z: number): number { return y ^ (x | ~z) }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }

  function convertToWordArray(string: string): number[] {
    const utf8 = unescape(encodeURIComponent(string))
    const wordCount = ((utf8.length + 8) >> 6) + 1
    const wordArray = new Array(wordCount * 16).fill(0)
    
    for (let i = 0; i < utf8.length; i++) {
      wordArray[i >> 2] |= utf8.charCodeAt(i) << ((i % 4) * 8)
    }
    wordArray[utf8.length >> 2] |= 0x80 << ((utf8.length % 4) * 8)
    wordArray[wordCount * 16 - 2] = utf8.length * 8
    return wordArray
  }

  function wordToHex(value: number): string {
    let hex = ''
    for (let i = 0; i <= 3; i++) {
      hex += ((value >> (i * 8)) & 255).toString(16).padStart(2, '0')
    }
    return hex
  }

  const x = convertToWordArray(string)
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476

  const S11 = 7, S12 = 12, S13 = 17, S14 = 22
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d
    const w = (i: number) => x[k + i] ?? 0

    a = ff(a, b, c, d, w(0), S11, 0xd76aa478)
    d = ff(d, a, b, c, w(1), S12, 0xe8c7b756)
    c = ff(c, d, a, b, w(2), S13, 0x242070db)
    b = ff(b, c, d, a, w(3), S14, 0xc1bdceee)
    a = ff(a, b, c, d, w(4), S11, 0xf57c0faf)
    d = ff(d, a, b, c, w(5), S12, 0x4787c62a)
    c = ff(c, d, a, b, w(6), S13, 0xa8304613)
    b = ff(b, c, d, a, w(7), S14, 0xfd469501)
    a = ff(a, b, c, d, w(8), S11, 0x698098d8)
    d = ff(d, a, b, c, w(9), S12, 0x8b44f7af)
    c = ff(c, d, a, b, w(10), S13, 0xffff5bb1)
    b = ff(b, c, d, a, w(11), S14, 0x895cd7be)
    a = ff(a, b, c, d, w(12), S11, 0x6b901122)
    d = ff(d, a, b, c, w(13), S12, 0xfd987193)
    c = ff(c, d, a, b, w(14), S13, 0xa679438e)
    b = ff(b, c, d, a, w(15), S14, 0x49b40821)

    a = gg(a, b, c, d, w(1), S21, 0xf61e2562)
    d = gg(d, a, b, c, w(6), S22, 0xc040b340)
    c = gg(c, d, a, b, w(11), S23, 0x265e5a51)
    b = gg(b, c, d, a, w(0), S24, 0xe9b6c7aa)
    a = gg(a, b, c, d, w(5), S21, 0xd62f105d)
    d = gg(d, a, b, c, w(10), S22, 0x02441453)
    c = gg(c, d, a, b, w(15), S23, 0xd8a1e681)
    b = gg(b, c, d, a, w(4), S24, 0xe7d3fbc8)
    a = gg(a, b, c, d, w(9), S21, 0x21e1cde6)
    d = gg(d, a, b, c, w(14), S22, 0xc33707d6)
    c = gg(c, d, a, b, w(3), S23, 0xf4d50d87)
    b = gg(b, c, d, a, w(8), S24, 0x455a14ed)
    a = gg(a, b, c, d, w(13), S21, 0xa9e3e905)
    d = gg(d, a, b, c, w(2), S22, 0xfcefa3f8)
    c = gg(c, d, a, b, w(7), S23, 0x676f02d9)
    b = gg(b, c, d, a, w(12), S24, 0x8d2a4c8a)

    a = hh(a, b, c, d, w(5), S31, 0xfffa3942)
    d = hh(d, a, b, c, w(8), S32, 0x8771f681)
    c = hh(c, d, a, b, w(11), S33, 0x6d9d6122)
    b = hh(b, c, d, a, w(14), S34, 0xfde5380c)
    a = hh(a, b, c, d, w(1), S31, 0xa4beea44)
    d = hh(d, a, b, c, w(4), S32, 0x4bdecfa9)
    c = hh(c, d, a, b, w(7), S33, 0xf6bb4b60)
    b = hh(b, c, d, a, w(10), S34, 0xbebfbc70)
    a = hh(a, b, c, d, w(13), S31, 0x289b7ec6)
    d = hh(d, a, b, c, w(0), S32, 0xeaa127fa)
    c = hh(c, d, a, b, w(3), S33, 0xd4ef3085)
    b = hh(b, c, d, a, w(6), S34, 0x04881d05)
    a = hh(a, b, c, d, w(9), S31, 0xd9d4d039)
    d = hh(d, a, b, c, w(12), S32, 0xe6db99e5)
    c = hh(c, d, a, b, w(15), S33, 0x1fa27cf8)
    b = hh(b, c, d, a, w(2), S34, 0xc4ac5665)

    a = ii(a, b, c, d, w(0), S41, 0xf4292244)
    d = ii(d, a, b, c, w(7), S42, 0x432aff97)
    c = ii(c, d, a, b, w(14), S43, 0xab9423a7)
    b = ii(b, c, d, a, w(5), S44, 0xfc93a039)
    a = ii(a, b, c, d, w(12), S41, 0x655b59c3)
    d = ii(d, a, b, c, w(3), S42, 0x8f0ccc92)
    c = ii(c, d, a, b, w(10), S43, 0xffeff47d)
    b = ii(b, c, d, a, w(1), S44, 0x85845dd1)
    a = ii(a, b, c, d, w(8), S41, 0x6fa87e4f)
    d = ii(d, a, b, c, w(15), S42, 0xfe2ce6e0)
    c = ii(c, d, a, b, w(6), S43, 0xa3014314)
    b = ii(b, c, d, a, w(13), S44, 0x4e0811a1)
    a = ii(a, b, c, d, w(4), S41, 0xf7537e82)
    d = ii(d, a, b, c, w(11), S42, 0xbd3af235)
    c = ii(c, d, a, b, w(2), S43, 0x2ad7d2bb)
    b = ii(b, c, d, a, w(9), S44, 0xeb86d391)

    a = addUnsigned(a, AA)
    b = addUnsigned(b, BB)
    c = addUnsigned(c, CC)
    d = addUnsigned(d, DD)
  }

  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)
}

interface HashResult {
  algorithm: HashAlgorithm
  hash: string
}

export default function HashTool() {
  // Easter egg: "Hello, World!" - the classic first program
  const [input, setInput] = useState('Hello, World!')
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<HashAlgorithm | 'all'>('all')
  const [hashes, setHashes] = useState<HashResult[]>([])
  const [isComputing, setIsComputing] = useState(false)

  useEffect(() => {
    const computeHashes = async () => {
      if (!input.trim()) {
        setHashes([])
        return
      }

      setIsComputing(true)
      
      const algorithms = selectedAlgorithm === 'all' ? ALGORITHMS : [selectedAlgorithm]
      const results: HashResult[] = []
      
      for (const algo of algorithms) {
        const hash = await computeHash(input, algo)
        results.push({ algorithm: algo, hash })
      }
      
      setHashes(results)
      setIsComputing(false)
    }

    computeHashes()
  }, [input, selectedAlgorithm])

  const handleClear = () => {
    setInput('')
    setHashes([])
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb & Header */}
      <div className="space-y-2">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
            <Fingerprint className="w-3.5 h-3.5" />
          </div>
          <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
            Hash <span className="text-[var(--color-accent)]">Generator</span>
          </h1>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* Algorithm Toggle */}
            <div className="flex bg-[var(--color-cream-dark)] rounded-lg p-0.5 border border-[var(--color-border)] flex-wrap">
              <button
                onClick={() => setSelectedAlgorithm('all')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  selectedAlgorithm === 'all'
                    ? 'bg-white text-[var(--color-ink)] shadow-sm'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                )}
              >
                All
              </button>
              {ALGORITHMS.map((algo) => (
                <button
                  key={algo}
                  onClick={() => setSelectedAlgorithm(algo)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                    selectedAlgorithm === algo
                      ? 'bg-white text-[var(--color-ink)] shadow-sm'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  )}
                >
                  {algo}
                </button>
              ))}
            </div>
            
            {/* Actions */}
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-xs h-7 px-2">
                <Trash2 className="w-3 h-3" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Input */}
          <div className="space-y-1">
            <Textarea
              label="Text to hash"
              placeholder="Enter text to generate hash..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
              id="input"
              className="font-mono text-sm"
            />
            {input && (
              <div className="text-[10px] text-[var(--color-ink-muted)] text-right">
                {input.length} chars
              </div>
            )}
          </div>

          {/* Arrow Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <div className={cn(
              "p-1 rounded-full border transition-colors",
              hashes.length > 0 
                ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                : "bg-[var(--color-cream-dark)] border-[var(--color-border)] text-[var(--color-ink-muted)]"
            )}>
              {isComputing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </div>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          {/* Output */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
              Hash output{selectedAlgorithm === 'all' ? 's' : ''}
            </label>
            
            {hashes.length > 0 ? (
              <div className="space-y-2">
                {hashes.map(({ algorithm, hash }) => (
                  <div 
                    key={algorithm}
                    className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                        {algorithm}
                      </span>
                      <CopyButton text={hash} />
                    </div>
                    <code className="block text-xs font-mono text-[var(--color-ink)] break-all">
                      {hash}
                    </code>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded-lg text-center">
                <span className="text-xs text-[var(--color-ink-muted)]">
                  Hash output will appear here...
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="grid grid-cols-2 gap-2">
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <Info className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">What is hashing?</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                One-way function that converts data into a fixed-size digest.
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Security Note</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Use SHA-256 or SHA-512 for security-sensitive applications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

