import { parsePhoneNumberFromString } from 'libphonenumber-js/max'

export function normalizePhone(value: string): string | null {
  const compact = value.replace(/[\s().-]/g, '')
  if (!/^\+?\d{8,15}$/.test(compact)) return null

  const international = compact.startsWith('+') || /^55\d{10,11}$/.test(compact)
  const number = parsePhoneNumberFromString(
    international && !compact.startsWith('+') ? '+' + compact : compact,
    { defaultCountry: 'BR', extract: false },
  )
  return number?.isValid() ? number.number : null
}
