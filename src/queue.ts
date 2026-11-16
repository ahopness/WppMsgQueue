import { MAX_RECIPIENTS, type Contact } from './import'
import { normalizePhone } from './phone'

export type QueueStatus = 'pending' | 'opened' | 'marked_sent' | 'skipped' | 'invalid'

export interface Recipient extends Contact {
  // Older queues can contain names from CSV import.
  name?: string
  id: string
  status: QueueStatus
  updatedAt: string
}

export interface Campaign {
  id: string
  messageTemplate: string
  recipients: Recipient[]
  createdAt: string
  consentConfirmed: boolean
}

export function createCampaign(
  contacts: Contact[],
  messageTemplate: string,
  consentConfirmed: boolean,
): Campaign {
  if (!consentConfirmed) throw new Error('Confirme o consentimento dos destinatários.')
  if (!contacts.length || contacts.length > MAX_RECIPIENTS) {
    throw new Error(`Selecione de 1 a ${MAX_RECIPIENTS} destinatários.`)
  }
  if (!messageTemplate.trim()) throw new Error('Escreva a mensagem.')
  if (new Set(contacts.map(contact => contact.phoneE164)).size !== contacts.length ||
      contacts.some(contact => normalizePhone(contact.phoneE164) !== contact.phoneE164)) {
    throw new Error('Revise os números da fila.')
  }

  const createdAt = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    messageTemplate,
    recipients: contacts.map(contact => ({
      ...contact, id: crypto.randomUUID(), status: 'pending', updatedAt: createdAt,
    })),
    createdAt,
    consentConfirmed,
  }
}

export function hasOpened({ status }: Recipient): boolean {
  return status === 'opened' || status === 'marked_sent'
}

export function nextUnopenedIndex(campaign: Campaign, after = -1): number {
  const next = campaign.recipients.findIndex((recipient, index) => index > after && !hasOpened(recipient))
  return next >= 0 ? next : campaign.recipients.findIndex(recipient => !hasOpened(recipient))
}

export function markOpened(campaign: Campaign, id: string): Campaign {
  if (!campaign.recipients.some(recipient => recipient.id === id)) {
    throw new Error('A fila mudou. Revise o destinatário atual.')
  }

  return {
    ...campaign,
    recipients: campaign.recipients.map(recipient =>
      recipient.id === id && !hasOpened(recipient)
        ? { ...recipient, status: 'opened', updatedAt: new Date().toISOString() }
        : recipient,
    ),
  }
}
