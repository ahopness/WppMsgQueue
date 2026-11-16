import { describe, expect, it } from 'vitest'
import { importPasted } from '../src/import'
import { normalizePhone } from '../src/phone'
import { buildWhatsAppLink, personalize } from '../src/message'
import { createCampaign, hasOpened, markOpened, nextUnopenedIndex } from '../src/queue'

describe('importação', () => {
  it('normaliza Brasil e números internacionais com +', () => {
    expect(normalizePhone('(22) 99999-9999')).toBe('+5522999999999')
    expect(normalizePhone('+55 22 99999-9999')).toBe('+5522999999999')
    expect(normalizePhone('55 99999-9999')).toBe('+5555999999999')
    expect(normalizePhone('+1 202-555-0115')).toBe('+12025550115')
    expect(normalizePhone('22 99999-9999 Ana')).toBeNull()
    expect(normalizePhone('22999999999 ramal 1')).toBeNull()
  })

  it('deduplica números colados e aponta a linha inválida', () => {
    const result = importPasted('(22) 99999-9999\r\n\r\n+5522999999999\r\n123')
    expect(result.recipients).toEqual([{ phoneE164: '+5522999999999' }])
    expect(result.duplicates).toBe(1)
    expect(result.issues).toEqual([{ line: 4, message: 'Número inválido.' }])
  })
})

describe('mensagem e fila', () => {
  it('preserva a personalização de filas antigas e codifica o texto', () => {
    const message = personalize('Olá, {nome}!\nTudo bem? & + 💬 👩🏽‍💻 🇧🇷 ❤️', 'Ana')!
    const link = new URL(buildWhatsAppLink('+5522999999999', message))
    expect(link.origin + link.pathname).toBe('https://web.whatsapp.com/send')
    expect(link.searchParams.get('phone')).toBe('5522999999999')
    expect(link.searchParams.get('text')).toBe('Olá, Ana!\nTudo bem? & + 💬 👩🏽‍💻 🇧🇷 ❤️')
    expect(personalize('Olá, {nome}!')).toBeNull()
  })

  it('exige consentimento, número válido e limite', () => {
    const recipients = importPasted('22999999999').recipients
    expect(() => createCampaign(recipients, 'Oi', false)).toThrow()
    expect(() => createCampaign([{ phoneE164: '+123' }], 'Oi', true)).toThrow()
    expect(() => createCampaign(Array.from({ length: 51 }, () => recipients[0]), 'Oi', true)).toThrow()
  })

  it('marca o contato escolhido e retorna ao começo para incluir pendentes anteriores', () => {
    let campaign = createCampaign(importPasted('22999999999\n21988888888').recipients, 'Oi!', true)
    const [first, second] = campaign.recipients
    expect(nextUnopenedIndex(campaign)).toBe(0)
    expect(() => markOpened(campaign, 'outro')).toThrow()
    campaign = markOpened(campaign, second.id)
    expect(campaign.recipients.map(hasOpened)).toEqual([false, true])
    expect(nextUnopenedIndex(campaign, 1)).toBe(0)
    campaign = markOpened(campaign, first.id)
    expect(nextUnopenedIndex(campaign)).toBe(-1)
  })
})
