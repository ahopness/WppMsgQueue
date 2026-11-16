import { chromium, expect, test } from '@playwright/test'
import { resolve } from 'node:path'

const extensionPath = resolve('dist')

function launch(profile: string) {
  return chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  })
}

test('abre a fila no painel lateral, preserva emojis e limpa ao terminar', async ({}, testInfo) => {
  const context = await launch(testInfo.outputPath('profile'))
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker')
    await expect.poll(() => worker.evaluate(async () => {
      const options = await chrome.sidePanel.getOptions({})
      const behavior = await chrome.sidePanel.getPanelBehavior()
      return { path: options.path, opensFromIcon: behavior.openPanelOnActionClick }
    })).toEqual({ path: 'panel.html', opensFromIcon: true })

    const extensionUrl = new URL('panel.html', worker.url()).href
    const page = await context.newPage()
    await page.goto(extensionUrl)
    const numbers = page.getByLabel('Números, um por linha')
    await numbers.fill('22999999999\n+5522999999999\n123\n21988888888')
    await expect(page.getByText(/2 de 2 válido.*1 duplicado.*1 erro/)).toBeVisible()
    await expect(page.getByText('Linha 3 · Número inválido.')).toBeVisible()
    const message = 'Olá!\nTudo bem? & + 💬 👩🏽‍💻 🇧🇷 ❤️'
    await page.getByLabel('Mensagem', { exact: true }).fill(message)
    await page.getByLabel(/Confirmo que os destinatários/).check()
    await page.getByRole('button', { name: 'Criar fila' }).click()

    const queue = page.getByRole('region', { name: 'Fila de mensagens' })
    await expect(queue.getByRole('button')).toHaveText(['Voltar', 'Abrir conversa e avançar', 'Próximo'])
    await expect(queue.getByRole('heading', { name: '+5522999999999' })).toBeVisible()
    await queue.getByRole('button', { name: 'Próximo' }).click()
    await expect(queue.getByRole('heading', { name: '+5521988888888' })).toBeVisible()
    await expect(queue.getByText('Pendente')).toHaveCount(2)
    await queue.getByRole('button', { name: 'Voltar' }).click()

    await worker.evaluate(() => {
      const createTab = chrome.tabs.create.bind(chrome.tabs)
      const state = globalThis as typeof globalThis & { conversationUrls?: string[] }
      const urls: string[] = []
      state.conversationUrls = urls
      let firstAttempt = true
      Object.defineProperty(chrome.tabs, 'create', {
        value: async (options: chrome.tabs.CreateProperties) => {
          if (firstAttempt) {
            firstAttempt = false
            throw new Error('Falha simulada ao abrir aba.')
          }
          urls.push(options.url ?? '')
          return createTab({ ...options, url: 'about:blank' })
        },
      })
    })

    await queue.getByRole('button', { name: 'Abrir conversa e avançar' }).click()
    await expect(page.getByRole('alert')).toHaveText('Falha simulada ao abrir aba.')
    await expect(queue.getByRole('heading', { name: '+5522999999999' })).toBeVisible()
    await expect(queue.getByText('Pendente')).toHaveCount(2)

    const firstTab = context.waitForEvent('page')
    await queue.getByRole('button', { name: 'Abrir conversa e avançar' }).click()
    await expect(await firstTab).toHaveURL('about:blank')
    await expect(queue.getByRole('heading', { name: '+5521988888888' })).toBeVisible()
    await expect(queue.getByRole('listitem').filter({ hasText: '+5522999999999' })).toContainText('Aberta')

    await page.reload()
    await expect(queue.getByRole('heading', { name: '+5521988888888' })).toBeVisible()
    await expect(queue.getByRole('listitem').filter({ hasText: '+5522999999999' })).toContainText('Aberta')
    const secondTab = context.waitForEvent('page')
    await queue.getByRole('button', { name: 'Abrir conversa e avançar' }).click()
    await expect(await secondTab).toHaveURL('about:blank')
    await expect(page.getByRole('status').filter({ hasText: 'Todas as conversas foram abertas.' })).toBeVisible()
    await expect(numbers).toHaveValue('')
    expect(await page.evaluate(() => chrome.storage.local.get())).toEqual({})

    const urls = await worker.evaluate(() =>
      (globalThis as typeof globalThis & { conversationUrls?: string[] }).conversationUrls,
    )
    expect(urls).toHaveLength(2)
    for (const [index, url] of urls!.entries()) {
      const link = new URL(url)
      expect(link.origin + link.pathname).toBe('https://web.whatsapp.com/send')
      expect(link.searchParams.get('phone')).toBe(['5522999999999', '5521988888888'][index])
      expect(link.searchParams.get('text')).toBe(message)
    }
  } finally {
    await context.close()
  }
})

test('bloqueia 51 selecionados e permite reduzir a fila para 50', async ({}, testInfo) => {
  const context = await launch(testInfo.outputPath('profile'))
  try {
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker')
    const page = await context.newPage()
    await page.goto(new URL('panel.html', worker.url()).href)

    const numbers = Array.from({ length: 51 }, (_, index) => String(5522999999900 + index))
    await page.getByLabel('Números, um por linha').fill(numbers.join('\n'))
    await page.getByLabel('Mensagem', { exact: true }).fill('Olá!')
    await page.getByLabel(/Confirmo que os destinatários/).check()

    const start = page.getByRole('button', { name: 'Criar fila' })
    await expect(start).toBeDisabled()
    await expect(page.getByText(/Desmarque 1 para continuar/)).toBeVisible()
    const first = page.getByRole('checkbox', { name: '+5522999999900', exact: true })
    await first.uncheck()
    await expect(start).toBeEnabled()
    await first.check()
    const consent = page.getByLabel(/Confirmo que os destinatários/)
    await expect(consent).not.toBeChecked()
    await first.uncheck()
    await consent.check()
    await start.click()
    await expect(page.getByText('Destinatário 1 de 50')).toBeVisible()
    await expect(page.getByRole('heading', { name: '+5522999999901' })).toBeVisible()
  } finally {
    await context.close()
  }
})
