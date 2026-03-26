import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, Search, X, ChevronLeft } from 'lucide-react'
import { Card } from '../../components/ui/Card'

// ─── Data ─────────────────────────────────────────────────────────────────────

interface CountryEntry {
  name: string
  alpha2: string
  alpha3: string
  numeric: string
  dial: string | null  // ITU-T E.164 dial prefix, null if not assigned
}

const COUNTRY_DATA: CountryEntry[] = [
  { name: 'Afghanistan',                              alpha2: 'AF', alpha3: 'AFG', numeric: '004', dial: '+93' },
  { name: 'Albania',                                  alpha2: 'AL', alpha3: 'ALB', numeric: '008', dial: '+355' },
  { name: 'Algeria',                                  alpha2: 'DZ', alpha3: 'DZA', numeric: '012', dial: '+213' },
  { name: 'Andorra',                                  alpha2: 'AD', alpha3: 'AND', numeric: '020', dial: '+376' },
  { name: 'Angola',                                   alpha2: 'AO', alpha3: 'AGO', numeric: '024', dial: '+244' },
  { name: 'Antigua and Barbuda',                      alpha2: 'AG', alpha3: 'ATG', numeric: '028', dial: '+1' },
  { name: 'Argentina',                                alpha2: 'AR', alpha3: 'ARG', numeric: '032', dial: '+54' },
  { name: 'Armenia',                                  alpha2: 'AM', alpha3: 'ARM', numeric: '051', dial: '+374' },
  { name: 'Aruba',                                    alpha2: 'AW', alpha3: 'ABW', numeric: '533', dial: '+297' },
  { name: 'Australia',                                alpha2: 'AU', alpha3: 'AUS', numeric: '036', dial: '+61' },
  { name: 'Austria',                                  alpha2: 'AT', alpha3: 'AUT', numeric: '040', dial: '+43' },
  { name: 'Azerbaijan',                               alpha2: 'AZ', alpha3: 'AZE', numeric: '031', dial: '+994' },
  { name: 'Bahamas',                                  alpha2: 'BS', alpha3: 'BHS', numeric: '044', dial: '+1' },
  { name: 'Bahrain',                                  alpha2: 'BH', alpha3: 'BHR', numeric: '048', dial: '+973' },
  { name: 'Bangladesh',                               alpha2: 'BD', alpha3: 'BGD', numeric: '050', dial: '+880' },
  { name: 'Barbados',                                 alpha2: 'BB', alpha3: 'BRB', numeric: '052', dial: '+1' },
  { name: 'Belarus',                                  alpha2: 'BY', alpha3: 'BLR', numeric: '112', dial: '+375' },
  { name: 'Belgium',                                  alpha2: 'BE', alpha3: 'BEL', numeric: '056', dial: '+32' },
  { name: 'Belize',                                   alpha2: 'BZ', alpha3: 'BLZ', numeric: '084', dial: '+501' },
  { name: 'Benin',                                    alpha2: 'BJ', alpha3: 'BEN', numeric: '204', dial: '+229' },
  { name: 'Bhutan',                                   alpha2: 'BT', alpha3: 'BTN', numeric: '064', dial: '+975' },
  { name: 'Bolivia',                                  alpha2: 'BO', alpha3: 'BOL', numeric: '068', dial: '+591' },
  { name: 'Bosnia and Herzegovina',                   alpha2: 'BA', alpha3: 'BIH', numeric: '070', dial: '+387' },
  { name: 'Botswana',                                 alpha2: 'BW', alpha3: 'BWA', numeric: '072', dial: '+267' },
  { name: 'Brazil',                                   alpha2: 'BR', alpha3: 'BRA', numeric: '076', dial: '+55' },
  { name: 'British Indian Ocean Territory',           alpha2: 'IO', alpha3: 'IOT', numeric: '086', dial: '+246' },
  { name: 'Brunei',                                   alpha2: 'BN', alpha3: 'BRN', numeric: '096', dial: '+673' },
  { name: 'Bulgaria',                                 alpha2: 'BG', alpha3: 'BGR', numeric: '100', dial: '+359' },
  { name: 'Burkina Faso',                             alpha2: 'BF', alpha3: 'BFA', numeric: '854', dial: '+226' },
  { name: 'Burundi',                                  alpha2: 'BI', alpha3: 'BDI', numeric: '108', dial: '+257' },
  { name: 'Cambodia',                                 alpha2: 'KH', alpha3: 'KHM', numeric: '116', dial: '+855' },
  { name: 'Cameroon',                                 alpha2: 'CM', alpha3: 'CMR', numeric: '120', dial: '+237' },
  { name: 'Canada',                                   alpha2: 'CA', alpha3: 'CAN', numeric: '124', dial: '+1' },
  { name: 'Cape Verde',                               alpha2: 'CV', alpha3: 'CPV', numeric: '132', dial: '+238' },
  { name: 'Central African Republic',                 alpha2: 'CF', alpha3: 'CAF', numeric: '140', dial: '+236' },
  { name: 'Chad',                                     alpha2: 'TD', alpha3: 'TCD', numeric: '148', dial: '+235' },
  { name: 'Chile',                                    alpha2: 'CL', alpha3: 'CHL', numeric: '152', dial: '+56' },
  { name: 'China',                                    alpha2: 'CN', alpha3: 'CHN', numeric: '156', dial: '+86' },
  { name: 'Colombia',                                 alpha2: 'CO', alpha3: 'COL', numeric: '170', dial: '+57' },
  { name: 'Comoros',                                  alpha2: 'KM', alpha3: 'COM', numeric: '174', dial: '+269' },
  { name: 'Cook Islands',                             alpha2: 'CK', alpha3: 'COK', numeric: '184', dial: '+682' },
  { name: 'Costa Rica',                               alpha2: 'CR', alpha3: 'CRI', numeric: '188', dial: '+506' },
  { name: "Côte d'Ivoire",                            alpha2: 'CI', alpha3: 'CIV', numeric: '384', dial: '+225' },
  { name: 'Croatia',                                  alpha2: 'HR', alpha3: 'HRV', numeric: '191', dial: '+385' },
  { name: 'Cuba',                                     alpha2: 'CU', alpha3: 'CUB', numeric: '192', dial: '+53' },
  { name: 'Curaçao',                                  alpha2: 'CW', alpha3: 'CUW', numeric: '531', dial: '+599' },
  { name: 'Cyprus',                                   alpha2: 'CY', alpha3: 'CYP', numeric: '196', dial: '+357' },
  { name: 'Czech Republic',                           alpha2: 'CZ', alpha3: 'CZE', numeric: '203', dial: '+420' },
  { name: 'Denmark',                                  alpha2: 'DK', alpha3: 'DNK', numeric: '208', dial: '+45' },
  { name: 'Djibouti',                                 alpha2: 'DJ', alpha3: 'DJI', numeric: '262', dial: '+253' },
  { name: 'Dominica',                                 alpha2: 'DM', alpha3: 'DMA', numeric: '212', dial: '+1' },
  { name: 'Dominican Republic',                       alpha2: 'DO', alpha3: 'DOM', numeric: '214', dial: '+1' },
  { name: 'DR Congo',                                 alpha2: 'CD', alpha3: 'COD', numeric: '180', dial: '+243' },
  { name: 'Ecuador',                                  alpha2: 'EC', alpha3: 'ECU', numeric: '218', dial: '+593' },
  { name: 'Egypt',                                    alpha2: 'EG', alpha3: 'EGY', numeric: '818', dial: '+20' },
  { name: 'El Salvador',                              alpha2: 'SV', alpha3: 'SLV', numeric: '222', dial: '+503' },
  { name: 'Equatorial Guinea',                        alpha2: 'GQ', alpha3: 'GNQ', numeric: '226', dial: '+240' },
  { name: 'Eritrea',                                  alpha2: 'ER', alpha3: 'ERI', numeric: '232', dial: '+291' },
  { name: 'Estonia',                                  alpha2: 'EE', alpha3: 'EST', numeric: '233', dial: '+372' },
  { name: 'Eswatini',                                 alpha2: 'SZ', alpha3: 'SWZ', numeric: '748', dial: '+268' },
  { name: 'Ethiopia',                                 alpha2: 'ET', alpha3: 'ETH', numeric: '231', dial: '+251' },
  { name: 'Falkland Islands',                         alpha2: 'FK', alpha3: 'FLK', numeric: '238', dial: '+500' },
  { name: 'Faroe Islands',                            alpha2: 'FO', alpha3: 'FRO', numeric: '234', dial: '+298' },
  { name: 'Fiji',                                     alpha2: 'FJ', alpha3: 'FJI', numeric: '242', dial: '+679' },
  { name: 'Finland',                                  alpha2: 'FI', alpha3: 'FIN', numeric: '246', dial: '+358' },
  { name: 'France',                                   alpha2: 'FR', alpha3: 'FRA', numeric: '250', dial: '+33' },
  { name: 'French Guiana',                            alpha2: 'GF', alpha3: 'GUF', numeric: '254', dial: '+594' },
  { name: 'French Polynesia',                         alpha2: 'PF', alpha3: 'PYF', numeric: '258', dial: '+689' },
  { name: 'Gabon',                                    alpha2: 'GA', alpha3: 'GAB', numeric: '266', dial: '+241' },
  { name: 'Gambia',                                   alpha2: 'GM', alpha3: 'GMB', numeric: '270', dial: '+220' },
  { name: 'Georgia',                                  alpha2: 'GE', alpha3: 'GEO', numeric: '268', dial: '+995' },
  { name: 'Germany',                                  alpha2: 'DE', alpha3: 'DEU', numeric: '276', dial: '+49' },
  { name: 'Ghana',                                    alpha2: 'GH', alpha3: 'GHA', numeric: '288', dial: '+233' },
  { name: 'Gibraltar',                                alpha2: 'GI', alpha3: 'GIB', numeric: '292', dial: '+350' },
  { name: 'Greece',                                   alpha2: 'GR', alpha3: 'GRC', numeric: '300', dial: '+30' },
  { name: 'Greenland',                                alpha2: 'GL', alpha3: 'GRL', numeric: '304', dial: '+299' },
  { name: 'Grenada',                                  alpha2: 'GD', alpha3: 'GRD', numeric: '308', dial: '+1' },
  { name: 'Guadeloupe',                               alpha2: 'GP', alpha3: 'GLP', numeric: '312', dial: '+590' },
  { name: 'Guatemala',                                alpha2: 'GT', alpha3: 'GTM', numeric: '320', dial: '+502' },
  { name: 'Guinea',                                   alpha2: 'GN', alpha3: 'GIN', numeric: '324', dial: '+224' },
  { name: 'Guinea-Bissau',                            alpha2: 'GW', alpha3: 'GNB', numeric: '624', dial: '+245' },
  { name: 'Guyana',                                   alpha2: 'GY', alpha3: 'GUY', numeric: '328', dial: '+592' },
  { name: 'Haiti',                                    alpha2: 'HT', alpha3: 'HTI', numeric: '332', dial: '+509' },
  { name: 'Honduras',                                 alpha2: 'HN', alpha3: 'HND', numeric: '340', dial: '+504' },
  { name: 'Hong Kong',                                alpha2: 'HK', alpha3: 'HKG', numeric: '344', dial: '+852' },
  { name: 'Hungary',                                  alpha2: 'HU', alpha3: 'HUN', numeric: '348', dial: '+36' },
  { name: 'Iceland',                                  alpha2: 'IS', alpha3: 'ISL', numeric: '352', dial: '+354' },
  { name: 'India',                                    alpha2: 'IN', alpha3: 'IND', numeric: '356', dial: '+91' },
  { name: 'Indonesia',                                alpha2: 'ID', alpha3: 'IDN', numeric: '360', dial: '+62' },
  { name: 'Iran',                                     alpha2: 'IR', alpha3: 'IRN', numeric: '364', dial: '+98' },
  { name: 'Iraq',                                     alpha2: 'IQ', alpha3: 'IRQ', numeric: '368', dial: '+964' },
  { name: 'Ireland',                                  alpha2: 'IE', alpha3: 'IRL', numeric: '372', dial: '+353' },
  { name: 'Israel',                                   alpha2: 'IL', alpha3: 'ISR', numeric: '376', dial: '+972' },
  { name: 'Italy',                                    alpha2: 'IT', alpha3: 'ITA', numeric: '380', dial: '+39' },
  { name: 'Jamaica',                                  alpha2: 'JM', alpha3: 'JAM', numeric: '388', dial: '+1' },
  { name: 'Japan',                                    alpha2: 'JP', alpha3: 'JPN', numeric: '392', dial: '+81' },
  { name: 'Jordan',                                   alpha2: 'JO', alpha3: 'JOR', numeric: '400', dial: '+962' },
  { name: 'Kazakhstan',                               alpha2: 'KZ', alpha3: 'KAZ', numeric: '398', dial: '+7' },
  { name: 'Kenya',                                    alpha2: 'KE', alpha3: 'KEN', numeric: '404', dial: '+254' },
  { name: 'Kiribati',                                 alpha2: 'KI', alpha3: 'KIR', numeric: '296', dial: '+686' },
  { name: 'Kosovo',                                   alpha2: 'XK', alpha3: 'XKX', numeric: '—',   dial: '+383' },
  { name: 'Kuwait',                                   alpha2: 'KW', alpha3: 'KWT', numeric: '414', dial: '+965' },
  { name: 'Kyrgyzstan',                               alpha2: 'KG', alpha3: 'KGZ', numeric: '417', dial: '+996' },
  { name: 'Laos',                                     alpha2: 'LA', alpha3: 'LAO', numeric: '418', dial: '+856' },
  { name: 'Latvia',                                   alpha2: 'LV', alpha3: 'LVA', numeric: '428', dial: '+371' },
  { name: 'Lebanon',                                  alpha2: 'LB', alpha3: 'LBN', numeric: '422', dial: '+961' },
  { name: 'Lesotho',                                  alpha2: 'LS', alpha3: 'LSO', numeric: '426', dial: '+266' },
  { name: 'Liberia',                                  alpha2: 'LR', alpha3: 'LBR', numeric: '430', dial: '+231' },
  { name: 'Libya',                                    alpha2: 'LY', alpha3: 'LBY', numeric: '434', dial: '+218' },
  { name: 'Liechtenstein',                            alpha2: 'LI', alpha3: 'LIE', numeric: '438', dial: '+423' },
  { name: 'Lithuania',                                alpha2: 'LT', alpha3: 'LTU', numeric: '440', dial: '+370' },
  { name: 'Luxembourg',                               alpha2: 'LU', alpha3: 'LUX', numeric: '442', dial: '+352' },
  { name: 'Macao',                                    alpha2: 'MO', alpha3: 'MAC', numeric: '446', dial: '+853' },
  { name: 'Madagascar',                               alpha2: 'MG', alpha3: 'MDG', numeric: '450', dial: '+261' },
  { name: 'Malawi',                                   alpha2: 'MW', alpha3: 'MWI', numeric: '454', dial: '+265' },
  { name: 'Malaysia',                                 alpha2: 'MY', alpha3: 'MYS', numeric: '458', dial: '+60' },
  { name: 'Maldives',                                 alpha2: 'MV', alpha3: 'MDV', numeric: '462', dial: '+960' },
  { name: 'Mali',                                     alpha2: 'ML', alpha3: 'MLI', numeric: '466', dial: '+223' },
  { name: 'Malta',                                    alpha2: 'MT', alpha3: 'MLT', numeric: '470', dial: '+356' },
  { name: 'Marshall Islands',                         alpha2: 'MH', alpha3: 'MHL', numeric: '584', dial: '+692' },
  { name: 'Martinique',                               alpha2: 'MQ', alpha3: 'MTQ', numeric: '474', dial: '+596' },
  { name: 'Mauritania',                               alpha2: 'MR', alpha3: 'MRT', numeric: '478', dial: '+222' },
  { name: 'Mauritius',                                alpha2: 'MU', alpha3: 'MUS', numeric: '480', dial: '+230' },
  { name: 'Mexico',                                   alpha2: 'MX', alpha3: 'MEX', numeric: '484', dial: '+52' },
  { name: 'Micronesia',                               alpha2: 'FM', alpha3: 'FSM', numeric: '583', dial: '+691' },
  { name: 'Moldova',                                  alpha2: 'MD', alpha3: 'MDA', numeric: '498', dial: '+373' },
  { name: 'Monaco',                                   alpha2: 'MC', alpha3: 'MCO', numeric: '492', dial: '+377' },
  { name: 'Mongolia',                                 alpha2: 'MN', alpha3: 'MNG', numeric: '496', dial: '+976' },
  { name: 'Montenegro',                               alpha2: 'ME', alpha3: 'MNE', numeric: '499', dial: '+382' },
  { name: 'Morocco',                                  alpha2: 'MA', alpha3: 'MAR', numeric: '504', dial: '+212' },
  { name: 'Mozambique',                               alpha2: 'MZ', alpha3: 'MOZ', numeric: '508', dial: '+258' },
  { name: 'Myanmar',                                  alpha2: 'MM', alpha3: 'MMR', numeric: '104', dial: '+95' },
  { name: 'Namibia',                                  alpha2: 'NA', alpha3: 'NAM', numeric: '516', dial: '+264' },
  { name: 'Nauru',                                    alpha2: 'NR', alpha3: 'NRU', numeric: '520', dial: '+674' },
  { name: 'Nepal',                                    alpha2: 'NP', alpha3: 'NPL', numeric: '524', dial: '+977' },
  { name: 'Netherlands',                              alpha2: 'NL', alpha3: 'NLD', numeric: '528', dial: '+31' },
  { name: 'New Caledonia',                            alpha2: 'NC', alpha3: 'NCL', numeric: '540', dial: '+687' },
  { name: 'New Zealand',                              alpha2: 'NZ', alpha3: 'NZL', numeric: '554', dial: '+64' },
  { name: 'Nicaragua',                                alpha2: 'NI', alpha3: 'NIC', numeric: '558', dial: '+505' },
  { name: 'Niger',                                    alpha2: 'NE', alpha3: 'NER', numeric: '562', dial: '+227' },
  { name: 'Nigeria',                                  alpha2: 'NG', alpha3: 'NGA', numeric: '566', dial: '+234' },
  { name: 'Niue',                                     alpha2: 'NU', alpha3: 'NIU', numeric: '570', dial: '+683' },
  { name: 'Norfolk Island',                           alpha2: 'NF', alpha3: 'NFK', numeric: '574', dial: '+672' },
  { name: 'North Korea',                              alpha2: 'KP', alpha3: 'PRK', numeric: '408', dial: '+850' },
  { name: 'North Macedonia',                          alpha2: 'MK', alpha3: 'MKD', numeric: '807', dial: '+389' },
  { name: 'Norway',                                   alpha2: 'NO', alpha3: 'NOR', numeric: '578', dial: '+47' },
  { name: 'Oman',                                     alpha2: 'OM', alpha3: 'OMN', numeric: '512', dial: '+968' },
  { name: 'Pakistan',                                 alpha2: 'PK', alpha3: 'PAK', numeric: '586', dial: '+92' },
  { name: 'Palau',                                    alpha2: 'PW', alpha3: 'PLW', numeric: '585', dial: '+680' },
  { name: 'Palestine',                                alpha2: 'PS', alpha3: 'PSE', numeric: '275', dial: '+970' },
  { name: 'Panama',                                   alpha2: 'PA', alpha3: 'PAN', numeric: '591', dial: '+507' },
  { name: 'Papua New Guinea',                         alpha2: 'PG', alpha3: 'PNG', numeric: '598', dial: '+675' },
  { name: 'Paraguay',                                 alpha2: 'PY', alpha3: 'PRY', numeric: '600', dial: '+595' },
  { name: 'Peru',                                     alpha2: 'PE', alpha3: 'PER', numeric: '604', dial: '+51' },
  { name: 'Philippines',                              alpha2: 'PH', alpha3: 'PHL', numeric: '608', dial: '+63' },
  { name: 'Poland',                                   alpha2: 'PL', alpha3: 'POL', numeric: '616', dial: '+48' },
  { name: 'Portugal',                                 alpha2: 'PT', alpha3: 'PRT', numeric: '620', dial: '+351' },
  { name: 'Qatar',                                    alpha2: 'QA', alpha3: 'QAT', numeric: '634', dial: '+974' },
  { name: 'Réunion',                                  alpha2: 'RE', alpha3: 'REU', numeric: '638', dial: '+262' },
  { name: 'Republic of the Congo',                    alpha2: 'CG', alpha3: 'COG', numeric: '178', dial: '+242' },
  { name: 'Romania',                                  alpha2: 'RO', alpha3: 'ROU', numeric: '642', dial: '+40' },
  { name: 'Russia',                                   alpha2: 'RU', alpha3: 'RUS', numeric: '643', dial: '+7' },
  { name: 'Rwanda',                                   alpha2: 'RW', alpha3: 'RWA', numeric: '646', dial: '+250' },
  { name: 'Saint Helena',                             alpha2: 'SH', alpha3: 'SHN', numeric: '654', dial: '+290' },
  { name: 'Saint Kitts and Nevis',                    alpha2: 'KN', alpha3: 'KNA', numeric: '659', dial: '+1' },
  { name: 'Saint Lucia',                              alpha2: 'LC', alpha3: 'LCA', numeric: '662', dial: '+1' },
  { name: 'Saint Pierre and Miquelon',                alpha2: 'PM', alpha3: 'SPM', numeric: '666', dial: '+508' },
  { name: 'Saint Vincent and the Grenadines',         alpha2: 'VC', alpha3: 'VCT', numeric: '670', dial: '+1' },
  { name: 'Samoa',                                    alpha2: 'WS', alpha3: 'WSM', numeric: '882', dial: '+685' },
  { name: 'San Marino',                               alpha2: 'SM', alpha3: 'SMR', numeric: '674', dial: '+378' },
  { name: 'São Tomé and Príncipe',                    alpha2: 'ST', alpha3: 'STP', numeric: '678', dial: '+239' },
  { name: 'Saudi Arabia',                             alpha2: 'SA', alpha3: 'SAU', numeric: '682', dial: '+966' },
  { name: 'Senegal',                                  alpha2: 'SN', alpha3: 'SEN', numeric: '686', dial: '+221' },
  { name: 'Serbia',                                   alpha2: 'RS', alpha3: 'SRB', numeric: '688', dial: '+381' },
  { name: 'Seychelles',                               alpha2: 'SC', alpha3: 'SYC', numeric: '690', dial: '+248' },
  { name: 'Sierra Leone',                             alpha2: 'SL', alpha3: 'SLE', numeric: '694', dial: '+232' },
  { name: 'Singapore',                                alpha2: 'SG', alpha3: 'SGP', numeric: '702', dial: '+65' },
  { name: 'Slovakia',                                 alpha2: 'SK', alpha3: 'SVK', numeric: '703', dial: '+421' },
  { name: 'Slovenia',                                 alpha2: 'SI', alpha3: 'SVN', numeric: '705', dial: '+386' },
  { name: 'Solomon Islands',                          alpha2: 'SB', alpha3: 'SLB', numeric: '090', dial: '+677' },
  { name: 'Somalia',                                  alpha2: 'SO', alpha3: 'SOM', numeric: '706', dial: '+252' },
  { name: 'South Africa',                             alpha2: 'ZA', alpha3: 'ZAF', numeric: '710', dial: '+27' },
  { name: 'South Korea',                              alpha2: 'KR', alpha3: 'KOR', numeric: '410', dial: '+82' },
  { name: 'South Sudan',                              alpha2: 'SS', alpha3: 'SSD', numeric: '728', dial: null },
  { name: 'Spain',                                    alpha2: 'ES', alpha3: 'ESP', numeric: '724', dial: '+34' },
  { name: 'Sri Lanka',                                alpha2: 'LK', alpha3: 'LKA', numeric: '144', dial: '+94' },
  { name: 'Sudan',                                    alpha2: 'SD', alpha3: 'SDN', numeric: '729', dial: '+249' },
  { name: 'Suriname',                                 alpha2: 'SR', alpha3: 'SUR', numeric: '740', dial: '+597' },
  { name: 'Sweden',                                   alpha2: 'SE', alpha3: 'SWE', numeric: '752', dial: '+46' },
  { name: 'Switzerland',                              alpha2: 'CH', alpha3: 'CHE', numeric: '756', dial: '+41' },
  { name: 'Syria',                                    alpha2: 'SY', alpha3: 'SYR', numeric: '760', dial: '+963' },
  { name: 'Taiwan',                                   alpha2: 'TW', alpha3: 'TWN', numeric: '158', dial: '+886' },
  { name: 'Tajikistan',                               alpha2: 'TJ', alpha3: 'TJK', numeric: '762', dial: '+992' },
  { name: 'Tanzania',                                 alpha2: 'TZ', alpha3: 'TZA', numeric: '834', dial: '+255' },
  { name: 'Thailand',                                 alpha2: 'TH', alpha3: 'THA', numeric: '764', dial: '+66' },
  { name: 'Timor-Leste',                              alpha2: 'TL', alpha3: 'TLS', numeric: '626', dial: '+670' },
  { name: 'Togo',                                     alpha2: 'TG', alpha3: 'TGO', numeric: '768', dial: '+228' },
  { name: 'Tokelau',                                  alpha2: 'TK', alpha3: 'TKL', numeric: '772', dial: '+690' },
  { name: 'Tonga',                                    alpha2: 'TO', alpha3: 'TON', numeric: '776', dial: '+676' },
  { name: 'Trinidad and Tobago',                      alpha2: 'TT', alpha3: 'TTO', numeric: '780', dial: '+1' },
  { name: 'Tunisia',                                  alpha2: 'TN', alpha3: 'TUN', numeric: '788', dial: '+216' },
  { name: 'Turkey',                                   alpha2: 'TR', alpha3: 'TUR', numeric: '792', dial: '+90' },
  { name: 'Turkmenistan',                             alpha2: 'TM', alpha3: 'TKM', numeric: '795', dial: '+993' },
  { name: 'Tuvalu',                                   alpha2: 'TV', alpha3: 'TUV', numeric: '798', dial: '+688' },
  { name: 'Uganda',                                   alpha2: 'UG', alpha3: 'UGA', numeric: '800', dial: '+256' },
  { name: 'Ukraine',                                  alpha2: 'UA', alpha3: 'UKR', numeric: '804', dial: '+380' },
  { name: 'United Arab Emirates',                     alpha2: 'AE', alpha3: 'ARE', numeric: '784', dial: '+971' },
  { name: 'United Kingdom',                           alpha2: 'GB', alpha3: 'GBR', numeric: '826', dial: '+44' },
  { name: 'United States',                            alpha2: 'US', alpha3: 'USA', numeric: '840', dial: '+1' },
  { name: 'Uruguay',                                  alpha2: 'UY', alpha3: 'URY', numeric: '858', dial: '+598' },
  { name: 'Uzbekistan',                               alpha2: 'UZ', alpha3: 'UZB', numeric: '860', dial: '+998' },
  { name: 'Vanuatu',                                  alpha2: 'VU', alpha3: 'VUT', numeric: '548', dial: '+678' },
  { name: 'Venezuela',                                alpha2: 'VE', alpha3: 'VEN', numeric: '862', dial: '+58' },
  { name: 'Vietnam',                                  alpha2: 'VN', alpha3: 'VNM', numeric: '704', dial: '+84' },
  { name: 'Yemen',                                    alpha2: 'YE', alpha3: 'YEM', numeric: '887', dial: '+967' },
  { name: 'Zambia',                                   alpha2: 'ZM', alpha3: 'ZMB', numeric: '894', dial: '+260' },
  { name: 'Zimbabwe',                                 alpha2: 'ZW', alpha3: 'ZWE', numeric: '716', dial: '+263' },
]

const SORTED = [...COUNTRY_DATA].sort((a, b) => a.name.localeCompare(b.name))

// ─── Component ────────────────────────────────────────────────────────────────

export default function CountryCodesTool() {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const rows = q
    ? SORTED.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.alpha2.toLowerCase().includes(q) ||
          e.alpha3.toLowerCase().includes(q) ||
          e.numeric.includes(q) ||
          (e.dial ?? '').includes(q)
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
              <Flag className="w-3.5 h-3.5" />
            </div>
            <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
              Country <span className="text-[var(--color-accent)]">Codes</span>
            </h1>
          </div>
          <SearchBox query={query} onChange={setQuery} placeholder="Search country, code or +dial…" />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)]">
          {q ? `${rows.length} of ${SORTED.length}` : `${SORTED.length} countries`}
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
                  <th className="text-left px-4 py-2 font-semibold text-[var(--color-ink)]">Country</th>
                  <th className="text-left px-4 py-2 font-semibold text-[var(--color-ink)] w-20">Alpha-2</th>
                  <th className="text-left px-4 py-2 font-semibold text-[var(--color-ink)] w-20">Alpha-3</th>
                  <th className="text-left px-4 py-2 font-semibold text-[var(--color-ink)] w-20">Numeric</th>
                  <th className="text-left px-4 py-2 font-semibold text-[var(--color-ink)] w-24">Dial</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e, i) => (
                  <tr
                    key={e.alpha2}
                    className={`border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-cream-dark)] transition-colors ${i % 2 === 0 ? '' : 'bg-[var(--color-cream-dark)]/40'}`}
                  >
                    <td className="px-4 py-2 text-[var(--color-ink)]">{e.name}</td>
                    <td className="px-4 py-2 text-[var(--color-accent)] font-bold">{e.alpha2}</td>
                    <td className="px-4 py-2 text-[var(--color-ink-muted)]">{e.alpha3}</td>
                    <td className="px-4 py-2 text-[var(--color-ink-muted)]">{e.numeric}</td>
                    <td className="px-4 py-2 text-[var(--color-ink-muted)]">{e.dial ?? '—'}</td>
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

// ─── Search box ───────────────────────────────────────────────────────────────

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
