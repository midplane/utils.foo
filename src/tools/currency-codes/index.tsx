import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleDollarSign, Search, X, ChevronLeft } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'

// ─── Data ─────────────────────────────────────────────────────────────────────

interface CurrencyEntry {
  code: string    // ISO 4217 alpha
  numeric: string // ISO 4217 numeric
  name: string
  symbol: string
  countries: string
}

const CURRENCY_DATA: CurrencyEntry[] = [
  { code: 'AED', numeric: '784', name: 'UAE Dirham',                        symbol: 'د.إ',  countries: 'United Arab Emirates' },
  { code: 'AFN', numeric: '971', name: 'Afghan Afghani',                    symbol: '؋',    countries: 'Afghanistan' },
  { code: 'ALL', numeric: '008', name: 'Albanian Lek',                      symbol: 'L',    countries: 'Albania' },
  { code: 'AMD', numeric: '051', name: 'Armenian Dram',                     symbol: '֏',    countries: 'Armenia' },
  { code: 'ANG', numeric: '532', name: 'Netherlands Antillean Guilder',     symbol: 'ƒ',    countries: 'Curaçao, Sint Maarten' },
  { code: 'AOA', numeric: '973', name: 'Angolan Kwanza',                    symbol: 'Kz',   countries: 'Angola' },
  { code: 'ARS', numeric: '032', name: 'Argentine Peso',                    symbol: '$',    countries: 'Argentina' },
  { code: 'AUD', numeric: '036', name: 'Australian Dollar',                 symbol: 'A$',   countries: 'Australia, Pacific territories' },
  { code: 'AWG', numeric: '533', name: 'Aruban Florin',                     symbol: 'ƒ',    countries: 'Aruba' },
  { code: 'AZN', numeric: '944', name: 'Azerbaijani Manat',                 symbol: '₼',    countries: 'Azerbaijan' },
  { code: 'BAM', numeric: '977', name: 'Bosnian Convertible Mark',          symbol: 'KM',   countries: 'Bosnia and Herzegovina' },
  { code: 'BBD', numeric: '052', name: 'Barbadian Dollar',                  symbol: '$',    countries: 'Barbados' },
  { code: 'BDT', numeric: '050', name: 'Bangladeshi Taka',                  symbol: '৳',    countries: 'Bangladesh' },
  { code: 'BGN', numeric: '975', name: 'Bulgarian Lev',                     symbol: 'лв',   countries: 'Bulgaria' },
  { code: 'BHD', numeric: '048', name: 'Bahraini Dinar',                    symbol: '.د.ب', countries: 'Bahrain' },
  { code: 'BIF', numeric: '108', name: 'Burundian Franc',                   symbol: 'Fr',   countries: 'Burundi' },
  { code: 'BMD', numeric: '060', name: 'Bermudian Dollar',                  symbol: '$',    countries: 'Bermuda' },
  { code: 'BND', numeric: '096', name: 'Brunei Dollar',                     symbol: '$',    countries: 'Brunei' },
  { code: 'BOB', numeric: '068', name: 'Bolivian Boliviano',                symbol: 'Bs.',  countries: 'Bolivia' },
  { code: 'BRL', numeric: '986', name: 'Brazilian Real',                    symbol: 'R$',   countries: 'Brazil' },
  { code: 'BSD', numeric: '044', name: 'Bahamian Dollar',                   symbol: '$',    countries: 'Bahamas' },
  { code: 'BTN', numeric: '064', name: 'Bhutanese Ngultrum',                symbol: 'Nu',   countries: 'Bhutan' },
  { code: 'BWP', numeric: '072', name: 'Botswana Pula',                     symbol: 'P',    countries: 'Botswana' },
  { code: 'BYN', numeric: '933', name: 'Belarusian Ruble',                  symbol: 'Br',   countries: 'Belarus' },
  { code: 'BZD', numeric: '084', name: 'Belize Dollar',                     symbol: '$',    countries: 'Belize' },
  { code: 'CAD', numeric: '124', name: 'Canadian Dollar',                   symbol: 'C$',   countries: 'Canada' },
  { code: 'CDF', numeric: '976', name: 'Congolese Franc',                   symbol: 'Fr',   countries: 'DR Congo' },
  { code: 'CHF', numeric: '756', name: 'Swiss Franc',                       symbol: 'Fr',   countries: 'Switzerland, Liechtenstein' },
  { code: 'CLP', numeric: '152', name: 'Chilean Peso',                      symbol: '$',    countries: 'Chile' },
  { code: 'CNY', numeric: '156', name: 'Chinese Yuan',                      symbol: '¥',    countries: 'China' },
  { code: 'COP', numeric: '170', name: 'Colombian Peso',                    symbol: '$',    countries: 'Colombia' },
  { code: 'CRC', numeric: '188', name: 'Costa Rican Colón',                 symbol: '₡',    countries: 'Costa Rica' },
  { code: 'CUP', numeric: '192', name: 'Cuban Peso',                        symbol: '$',    countries: 'Cuba' },
  { code: 'CVE', numeric: '132', name: 'Cape Verdean Escudo',               symbol: '$',    countries: 'Cape Verde' },
  { code: 'CZK', numeric: '203', name: 'Czech Koruna',                      symbol: 'Kč',   countries: 'Czech Republic' },
  { code: 'DJF', numeric: '262', name: 'Djiboutian Franc',                  symbol: 'Fr',   countries: 'Djibouti' },
  { code: 'DKK', numeric: '208', name: 'Danish Krone',                      symbol: 'kr',   countries: 'Denmark, Greenland, Faroe Islands' },
  { code: 'DOP', numeric: '214', name: 'Dominican Peso',                    symbol: '$',    countries: 'Dominican Republic' },
  { code: 'DZD', numeric: '012', name: 'Algerian Dinar',                    symbol: 'دج',   countries: 'Algeria' },
  { code: 'EGP', numeric: '818', name: 'Egyptian Pound',                    symbol: '£',    countries: 'Egypt' },
  { code: 'ERN', numeric: '232', name: 'Eritrean Nakfa',                    symbol: 'Nfk',  countries: 'Eritrea' },
  { code: 'ETB', numeric: '230', name: 'Ethiopian Birr',                    symbol: 'Br',   countries: 'Ethiopia' },
  { code: 'EUR', numeric: '978', name: 'Euro',                              symbol: '€',    countries: 'Eurozone (20 countries)' },
  { code: 'FJD', numeric: '242', name: 'Fijian Dollar',                     symbol: '$',    countries: 'Fiji' },
  { code: 'FKP', numeric: '238', name: 'Falkland Islands Pound',            symbol: '£',    countries: 'Falkland Islands' },
  { code: 'GBP', numeric: '826', name: 'British Pound Sterling',            symbol: '£',    countries: 'United Kingdom' },
  { code: 'GEL', numeric: '981', name: 'Georgian Lari',                     symbol: '₾',    countries: 'Georgia' },
  { code: 'GHS', numeric: '936', name: 'Ghanaian Cedi',                     symbol: '₵',    countries: 'Ghana' },
  { code: 'GIP', numeric: '292', name: 'Gibraltar Pound',                   symbol: '£',    countries: 'Gibraltar' },
  { code: 'GMD', numeric: '270', name: 'Gambian Dalasi',                    symbol: 'D',    countries: 'Gambia' },
  { code: 'GNF', numeric: '324', name: 'Guinean Franc',                     symbol: 'Fr',   countries: 'Guinea' },
  { code: 'GTQ', numeric: '320', name: 'Guatemalan Quetzal',                symbol: 'Q',    countries: 'Guatemala' },
  { code: 'GYD', numeric: '328', name: 'Guyanese Dollar',                   symbol: '$',    countries: 'Guyana' },
  { code: 'HKD', numeric: '344', name: 'Hong Kong Dollar',                  symbol: 'HK$',  countries: 'Hong Kong' },
  { code: 'HNL', numeric: '340', name: 'Honduran Lempira',                  symbol: 'L',    countries: 'Honduras' },
  { code: 'HTG', numeric: '332', name: 'Haitian Gourde',                    symbol: 'G',    countries: 'Haiti' },
  { code: 'HUF', numeric: '348', name: 'Hungarian Forint',                  symbol: 'Ft',   countries: 'Hungary' },
  { code: 'IDR', numeric: '360', name: 'Indonesian Rupiah',                 symbol: 'Rp',   countries: 'Indonesia' },
  { code: 'ILS', numeric: '376', name: 'Israeli New Shekel',                symbol: '₪',    countries: 'Israel, Palestine' },
  { code: 'INR', numeric: '356', name: 'Indian Rupee',                      symbol: '₹',    countries: 'India' },
  { code: 'IQD', numeric: '368', name: 'Iraqi Dinar',                       symbol: 'ع.د',  countries: 'Iraq' },
  { code: 'IRR', numeric: '364', name: 'Iranian Rial',                      symbol: '﷼',    countries: 'Iran' },
  { code: 'ISK', numeric: '352', name: 'Icelandic Króna',                   symbol: 'kr',   countries: 'Iceland' },
  { code: 'JMD', numeric: '388', name: 'Jamaican Dollar',                   symbol: '$',    countries: 'Jamaica' },
  { code: 'JOD', numeric: '400', name: 'Jordanian Dinar',                   symbol: 'د.ا',  countries: 'Jordan' },
  { code: 'JPY', numeric: '392', name: 'Japanese Yen',                      symbol: '¥',    countries: 'Japan' },
  { code: 'KES', numeric: '404', name: 'Kenyan Shilling',                   symbol: 'KSh',  countries: 'Kenya' },
  { code: 'KGS', numeric: '417', name: 'Kyrgyzstani Som',                   symbol: 'с',    countries: 'Kyrgyzstan' },
  { code: 'KHR', numeric: '116', name: 'Cambodian Riel',                    symbol: '៛',    countries: 'Cambodia' },
  { code: 'KMF', numeric: '174', name: 'Comorian Franc',                    symbol: 'Fr',   countries: 'Comoros' },
  { code: 'KPW', numeric: '408', name: 'North Korean Won',                  symbol: '₩',    countries: 'North Korea' },
  { code: 'KRW', numeric: '410', name: 'South Korean Won',                  symbol: '₩',    countries: 'South Korea' },
  { code: 'KWD', numeric: '414', name: 'Kuwaiti Dinar',                     symbol: 'د.ك',  countries: 'Kuwait' },
  { code: 'KYD', numeric: '136', name: 'Cayman Islands Dollar',             symbol: '$',    countries: 'Cayman Islands' },
  { code: 'KZT', numeric: '398', name: 'Kazakhstani Tenge',                 symbol: '₸',    countries: 'Kazakhstan' },
  { code: 'LAK', numeric: '418', name: 'Lao Kip',                           symbol: '₭',    countries: 'Laos' },
  { code: 'LBP', numeric: '422', name: 'Lebanese Pound',                    symbol: 'ل.ل',  countries: 'Lebanon' },
  { code: 'LKR', numeric: '144', name: 'Sri Lankan Rupee',                  symbol: 'Rs',   countries: 'Sri Lanka' },
  { code: 'LRD', numeric: '430', name: 'Liberian Dollar',                   symbol: '$',    countries: 'Liberia' },
  { code: 'LSL', numeric: '426', name: 'Lesotho Loti',                      symbol: 'L',    countries: 'Lesotho' },
  { code: 'LYD', numeric: '434', name: 'Libyan Dinar',                      symbol: 'ل.د',  countries: 'Libya' },
  { code: 'MAD', numeric: '504', name: 'Moroccan Dirham',                   symbol: 'د.م.', countries: 'Morocco' },
  { code: 'MDL', numeric: '498', name: 'Moldovan Leu',                      symbol: 'L',    countries: 'Moldova' },
  { code: 'MGA', numeric: '969', name: 'Malagasy Ariary',                   symbol: 'Ar',   countries: 'Madagascar' },
  { code: 'MKD', numeric: '807', name: 'Macedonian Denar',                  symbol: 'ден',  countries: 'North Macedonia' },
  { code: 'MMK', numeric: '104', name: 'Myanmar Kyat',                      symbol: 'K',    countries: 'Myanmar' },
  { code: 'MNT', numeric: '496', name: 'Mongolian Tögrög',                  symbol: '₮',    countries: 'Mongolia' },
  { code: 'MOP', numeric: '446', name: 'Macanese Pataca',                   symbol: 'P',    countries: 'Macao' },
  { code: 'MRU', numeric: '929', name: 'Mauritanian Ouguiya',               symbol: 'UM',   countries: 'Mauritania' },
  { code: 'MUR', numeric: '480', name: 'Mauritian Rupee',                   symbol: 'Rs',   countries: 'Mauritius' },
  { code: 'MVR', numeric: '462', name: 'Maldivian Rufiyaa',                 symbol: 'Rf',   countries: 'Maldives' },
  { code: 'MWK', numeric: '454', name: 'Malawian Kwacha',                   symbol: 'MK',   countries: 'Malawi' },
  { code: 'MXN', numeric: '484', name: 'Mexican Peso',                      symbol: '$',    countries: 'Mexico' },
  { code: 'MYR', numeric: '458', name: 'Malaysian Ringgit',                 symbol: 'RM',   countries: 'Malaysia' },
  { code: 'MZN', numeric: '943', name: 'Mozambican Metical',                symbol: 'MT',   countries: 'Mozambique' },
  { code: 'NAD', numeric: '516', name: 'Namibian Dollar',                   symbol: '$',    countries: 'Namibia' },
  { code: 'NGN', numeric: '566', name: 'Nigerian Naira',                    symbol: '₦',    countries: 'Nigeria' },
  { code: 'NIO', numeric: '558', name: 'Nicaraguan Córdoba',                symbol: 'C$',   countries: 'Nicaragua' },
  { code: 'NOK', numeric: '578', name: 'Norwegian Krone',                   symbol: 'kr',   countries: 'Norway' },
  { code: 'NPR', numeric: '524', name: 'Nepalese Rupee',                    symbol: 'Rs',   countries: 'Nepal' },
  { code: 'NZD', numeric: '554', name: 'New Zealand Dollar',                symbol: 'NZ$',  countries: 'New Zealand, Pacific territories' },
  { code: 'OMR', numeric: '512', name: 'Omani Rial',                        symbol: 'ر.ع.', countries: 'Oman' },
  { code: 'PAB', numeric: '590', name: 'Panamanian Balboa',                 symbol: 'B/.',  countries: 'Panama' },
  { code: 'PEN', numeric: '604', name: 'Peruvian Sol',                      symbol: 'S/.',  countries: 'Peru' },
  { code: 'PGK', numeric: '598', name: 'Papua New Guinean Kina',            symbol: 'K',    countries: 'Papua New Guinea' },
  { code: 'PHP', numeric: '608', name: 'Philippine Peso',                   symbol: '₱',    countries: 'Philippines' },
  { code: 'PKR', numeric: '586', name: 'Pakistani Rupee',                   symbol: 'Rs',   countries: 'Pakistan' },
  { code: 'PLN', numeric: '985', name: 'Polish Złoty',                      symbol: 'zł',   countries: 'Poland' },
  { code: 'PYG', numeric: '600', name: 'Paraguayan Guaraní',                symbol: '₲',    countries: 'Paraguay' },
  { code: 'QAR', numeric: '634', name: 'Qatari Riyal',                      symbol: 'ر.ق',  countries: 'Qatar' },
  { code: 'RON', numeric: '946', name: 'Romanian Leu',                      symbol: 'lei',  countries: 'Romania' },
  { code: 'RSD', numeric: '941', name: 'Serbian Dinar',                     symbol: 'дин',  countries: 'Serbia' },
  { code: 'RUB', numeric: '643', name: 'Russian Ruble',                     symbol: '₽',    countries: 'Russia' },
  { code: 'RWF', numeric: '646', name: 'Rwandan Franc',                     symbol: 'Fr',   countries: 'Rwanda' },
  { code: 'SAR', numeric: '682', name: 'Saudi Riyal',                       symbol: 'ر.س',  countries: 'Saudi Arabia' },
  { code: 'SBD', numeric: '090', name: 'Solomon Islands Dollar',            symbol: '$',    countries: 'Solomon Islands' },
  { code: 'SCR', numeric: '690', name: 'Seychellois Rupee',                 symbol: 'Rs',   countries: 'Seychelles' },
  { code: 'SDG', numeric: '938', name: 'Sudanese Pound',                    symbol: 'ج.س.', countries: 'Sudan' },
  { code: 'SEK', numeric: '752', name: 'Swedish Krona',                     symbol: 'kr',   countries: 'Sweden' },
  { code: 'SGD', numeric: '702', name: 'Singapore Dollar',                  symbol: 'S$',   countries: 'Singapore' },
  { code: 'SHP', numeric: '654', name: 'Saint Helena Pound',                symbol: '£',    countries: 'Saint Helena' },
  { code: 'SLE', numeric: '925', name: 'Sierra Leonean Leone',              symbol: 'Le',   countries: 'Sierra Leone' },
  { code: 'SOS', numeric: '706', name: 'Somali Shilling',                   symbol: 'Sh',   countries: 'Somalia' },
  { code: 'SRD', numeric: '968', name: 'Surinamese Dollar',                 symbol: '$',    countries: 'Suriname' },
  { code: 'SSP', numeric: '728', name: 'South Sudanese Pound',              symbol: '£',    countries: 'South Sudan' },
  { code: 'STN', numeric: '930', name: 'São Tomé and Príncipe Dobra',       symbol: 'Db',   countries: 'São Tomé and Príncipe' },
  { code: 'SYP', numeric: '760', name: 'Syrian Pound',                      symbol: '£',    countries: 'Syria' },
  { code: 'SZL', numeric: '748', name: 'Swazi Lilangeni',                   symbol: 'L',    countries: 'Eswatini' },
  { code: 'THB', numeric: '764', name: 'Thai Baht',                         symbol: '฿',    countries: 'Thailand' },
  { code: 'TJS', numeric: '972', name: 'Tajikistani Somoni',                symbol: 'SM',   countries: 'Tajikistan' },
  { code: 'TMT', numeric: '934', name: 'Turkmenistani Manat',               symbol: 'T',    countries: 'Turkmenistan' },
  { code: 'TND', numeric: '788', name: 'Tunisian Dinar',                    symbol: 'د.ت',  countries: 'Tunisia' },
  { code: 'TOP', numeric: '776', name: 'Tongan Paʻanga',                    symbol: 'T$',   countries: 'Tonga' },
  { code: 'TRY', numeric: '949', name: 'Turkish Lira',                      symbol: '₺',    countries: 'Turkey' },
  { code: 'TTD', numeric: '780', name: 'Trinidad and Tobago Dollar',        symbol: '$',    countries: 'Trinidad and Tobago' },
  { code: 'TWD', numeric: '901', name: 'New Taiwan Dollar',                 symbol: 'NT$',  countries: 'Taiwan' },
  { code: 'TZS', numeric: '834', name: 'Tanzanian Shilling',                symbol: 'Sh',   countries: 'Tanzania' },
  { code: 'UAH', numeric: '980', name: 'Ukrainian Hryvnia',                 symbol: '₴',    countries: 'Ukraine' },
  { code: 'UGX', numeric: '800', name: 'Ugandan Shilling',                  symbol: 'Sh',   countries: 'Uganda' },
  { code: 'USD', numeric: '840', name: 'US Dollar',                         symbol: '$',    countries: 'United States and many others' },
  { code: 'UYU', numeric: '858', name: 'Uruguayan Peso',                    symbol: '$',    countries: 'Uruguay' },
  { code: 'UZS', numeric: '860', name: 'Uzbekistani Som',                   symbol: 'лв',   countries: 'Uzbekistan' },
  { code: 'VES', numeric: '928', name: 'Venezuelan Bolívar',                symbol: 'Bs.S', countries: 'Venezuela' },
  { code: 'VND', numeric: '704', name: 'Vietnamese Đồng',                   symbol: '₫',    countries: 'Vietnam' },
  { code: 'VUV', numeric: '548', name: 'Vanuatu Vatu',                      symbol: 'Vt',   countries: 'Vanuatu' },
  { code: 'WST', numeric: '882', name: 'Samoan Tālā',                       symbol: 'T',    countries: 'Samoa' },
  { code: 'XAF', numeric: '950', name: 'Central African CFA Franc',         symbol: 'Fr',   countries: 'Central Africa (6 countries)' },
  { code: 'XCD', numeric: '951', name: 'East Caribbean Dollar',             symbol: '$',    countries: 'East Caribbean (8 countries)' },
  { code: 'XOF', numeric: '952', name: 'West African CFA Franc',            symbol: 'Fr',   countries: 'West Africa (8 countries)' },
  { code: 'XPF', numeric: '953', name: 'CFP Franc',                         symbol: 'Fr',   countries: 'French Polynesia, New Caledonia, Wallis and Futuna' },
  { code: 'YER', numeric: '886', name: 'Yemeni Rial',                       symbol: '﷼',    countries: 'Yemen' },
  { code: 'ZAR', numeric: '710', name: 'South African Rand',                symbol: 'R',    countries: 'South Africa' },
  { code: 'ZMW', numeric: '967', name: 'Zambian Kwacha',                    symbol: 'ZK',   countries: 'Zambia' },
  { code: 'ZWL', numeric: '932', name: 'Zimbabwean Dollar',                 symbol: '$',    countries: 'Zimbabwe' },
]

const SORTED = [...CURRENCY_DATA].sort((a, b) => a.code.localeCompare(b.code))

// ─── Component ────────────────────────────────────────────────────────────────

export default function CurrencyCodesTool() {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const rows = q
    ? SORTED.filter(
        (e) =>
          e.code.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.symbol.toLowerCase().includes(q) ||
          e.countries.toLowerCase().includes(q) ||
          e.numeric.includes(q)
      )
    : SORTED

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          <ChevronLeft className="w-3 h-3" />
          Back
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
              <CircleDollarSign className="w-3.5 h-3.5" />
            </div>
            <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
              Currency <span className="text-[var(--color-accent)]">Codes</span>
            </h1>
          </div>
          <SearchBox query={query} onChange={setQuery} placeholder="Search currency, code or symbol…" />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {q ? `${rows.length} of ${SORTED.length}` : `${SORTED.length} currencies`}
        </span>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)] text-center py-8">No results for "{query}"</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-cream-dark)]">
                  <th className="text-left px-4 py-2 font-semibold text-[var(--color-ink)] w-16">Code</th>
                  <th className="text-left px-4 py-2 font-semibold text-[var(--color-ink)] w-16">Num</th>
                  <th className="text-left px-4 py-2 font-semibold text-[var(--color-ink)] w-12">Symbol</th>
                  <th className="text-left px-4 py-2 font-semibold text-[var(--color-ink)]">Name</th>
                  <th className="text-left px-4 py-2 font-semibold text-[var(--color-ink)] hidden sm:table-cell">Used in</th>
                  <th className="px-4 py-2 w-12" />
                </tr>
              </thead>
              <tbody>
                {rows.map((e, i) => (
                  <tr
                    key={e.code}
                    className={`border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-cream-dark)] transition-colors ${i % 2 === 0 ? '' : 'bg-[var(--color-cream-dark)]/40'}`}
                  >
                    <td className="px-4 py-2 text-[var(--color-accent)] font-bold">{e.code}</td>
                    <td className="px-4 py-2 text-[var(--color-ink-muted)]">{e.numeric}</td>
                    <td className="px-4 py-2 text-[var(--color-ink)]">{e.symbol}</td>
                    <td className="px-4 py-2 text-[var(--color-ink)]">{e.name}</td>
                    <td className="px-4 py-2 text-[var(--color-ink-muted)] hidden sm:table-cell">{e.countries}</td>
                    <td className="px-4 py-2 text-right">
                      <CopyButton text={e.code} className="!h-6 !px-2 !text-[10px]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Shared search box ────────────────────────────────────────────────────────

function SearchBox({ query, onChange, placeholder }: { query: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
      <input
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-[var(--color-border)] rounded-lg text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all font-mono"
      />
      {query && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-[var(--color-cream-dark)] rounded transition-colors cursor-pointer"
        >
          <X className="w-3 h-3 text-[var(--color-ink-muted)]" />
        </button>
      )}
    </div>
  )
}
