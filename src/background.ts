import { buildWhatsAppLink, personalize } from './message'
import { markOpened, nextUnopenedIndex } from './queue'
import { CAMPAIGN_KEY, loadCampaign, saveCampaign } from './storage'

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

async function openConversation(campaignId: string, recipientId: string, windowId: number): Promise<void> {
  await navigator.locks.request(CAMPAIGN_KEY, async () => {
    const campaign = await loadCampaign()
    const recipient = campaign?.recipients.find(person => person.id === recipientId)
    if (!campaign || campaign.id !== campaignId || !recipient) {
      throw new Error('A fila mudou. Revise o destinatário atual.')
    }

    const template = campaign.messageTemplate
    const message = recipient.name ? personalize(template, recipient.name) ?? template : template
    await chrome.tabs.create({ windowId, url: buildWhatsAppLink(recipient.phoneE164, message) })

    const updated = markOpened(campaign, recipientId)
    if (nextUnopenedIndex(updated) === -1) {
      await chrome.storage.local.remove(CAMPAIGN_KEY)
    } else {
      await saveCampaign(updated)
    }
  })
}

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.type !== 'open-conversation' || typeof message.campaignId !== 'string' ||
      typeof message.recipientId !== 'string' || !Number.isInteger(message.windowId)) return

  void openConversation(message.campaignId, message.recipientId, message.windowId).then(
    () => respond({}),
    cause => respond({ error: cause instanceof Error ? cause.message : 'Não foi possível abrir a conversa.' }),
  )
  return true
})
