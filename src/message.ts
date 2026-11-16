const NAME_TOKEN = '{nome}'

export function personalize(template: string, name?: string): string | null {
  if (!template.includes(NAME_TOKEN)) return template
  return name?.trim() ? template.replaceAll(NAME_TOKEN, () => name) : null
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message.toWellFormed())}`
}
