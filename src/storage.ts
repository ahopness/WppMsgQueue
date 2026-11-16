import type { Campaign } from './queue'

export const CAMPAIGN_KEY = 'campaign'

export async function loadCampaign(): Promise<Campaign | undefined> {
  const values = await chrome.storage.local.get(CAMPAIGN_KEY)
  return values[CAMPAIGN_KEY] as Campaign | undefined
}

export async function saveCampaign(campaign: Campaign): Promise<void> {
  await chrome.storage.local.set({ [CAMPAIGN_KEY]: campaign })
}
