import { normalizePhone } from './phone'

export const MAX_RECIPIENTS = 50

export interface Contact {
  phoneE164: string
}

export function importPasted(value: string) {
  const recipients: Contact[] = []
  const issues: { line: number; message: string }[] = []
  const seen = new Set<string>()
  let duplicates = 0

  for (const [index, phone] of value.split(/\r\n|\n|\r/).entries()) {
    if (!phone.trim()) continue
    const phoneE164 = normalizePhone(phone)
    if (!phoneE164) {
      issues.push({ line: index + 1, message: 'Número inválido.' })
    } else if (seen.has(phoneE164)) {
      duplicates++
    } else {
      seen.add(phoneE164)
      recipients.push({ phoneE164 })
    }
  }

  return { recipients, issues, duplicates }
}
