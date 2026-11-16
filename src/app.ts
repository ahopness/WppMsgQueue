import { importPasted, MAX_RECIPIENTS, type Contact } from './import'
import { createCampaign, hasOpened, nextUnopenedIndex, type Campaign } from './queue'
import { CAMPAIGN_KEY, loadCampaign, saveCampaign } from './storage'

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id)
  if (!node) throw new Error(`Elemento ausente: ${id}`)
  return node as T
}

const setup = element<HTMLFormElement>('setup')
const queue = element('queue')
const numbers = element<HTMLTextAreaElement>('numbers')
const template = element<HTMLTextAreaElement>('template')
const consent = element<HTMLInputElement>('consent')
const start = element<HTMLButtonElement>('start')
const open = element<HTMLButtonElement>('open')
const back = element<HTMLButtonElement>('back')
const next = element<HTMLButtonElement>('next')
const deleteData = element<HTMLButtonElement>('delete-data')
const error = element('error')
const feedback = element('feedback')

let imported = importPasted('')
const excluded = new Set<string>()
let campaign: Campaign | undefined
let selectedIndex = 0
let busy = false

function show(node: HTMLElement, text: string): void {
  node.hidden = !text
  node.textContent = text
}

function selectedContacts(): Contact[] {
  return imported.recipients.filter(contact => !excluded.has(contact.phoneE164))
}

function updateSubmit(): void {
  const count = selectedContacts().length
  start.disabled = busy || count === 0 || count > MAX_RECIPIENTS ||
    !template.value.trim() || !consent.checked
}

function refreshReview(): void {
  const count = selectedContacts().length
  const excess = count > MAX_RECIPIENTS ? ` Desmarque ${count - MAX_RECIPIENTS} para continuar.` : ''
  const { recipients, duplicates, issues } = imported
  show(element('import-summary'), numbers.value.trim()
    ? `${count} de ${recipients.length} válido(s) selecionado(s) · ${duplicates} duplicado(s) · ${issues.length} erro(s).${excess}`
    : '')
  updateSubmit()
}

function review(result: typeof imported): void {
  imported = result
  excluded.clear()
  const issues = element('issues')
  issues.replaceChildren(...result.issues.map(issue => {
    const row = document.createElement('li')
    row.textContent = `Linha ${issue.line} · ${issue.message}`
    return row
  }))
  issues.hidden = result.issues.length === 0

  const contacts = element('contacts')
  contacts.replaceChildren(...result.recipients.map(contact => {
    const row = document.createElement('li')
    const label = document.createElement('label')
    label.className = 'check'
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = true
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        excluded.delete(contact.phoneE164)
        consent.checked = false
      } else {
        excluded.add(contact.phoneE164)
      }
      refreshReview()
    })
    const text = document.createElement('span')
    text.textContent = contact.phoneE164
    label.append(checkbox, text)
    row.append(label)
    return row
  }))
  contacts.hidden = result.recipients.length === 0
  refreshReview()
}

function render(): void {
  setup.hidden = Boolean(campaign)
  queue.hidden = !campaign
  element('data-actions').hidden = Boolean(campaign)
  if (!campaign) {
    updateSubmit()
    return
  }

  const recipients = campaign.recipients
  const current = recipients[selectedIndex]
  element('position').textContent = `Destinatário ${selectedIndex + 1} de ${recipients.length}`
  element('recipient-title').textContent = current.phoneE164
  open.disabled = busy
  back.disabled = busy || selectedIndex === 0
  next.disabled = busy || selectedIndex === recipients.length - 1

  const contacts = element('queue-contacts')
  contacts.replaceChildren(...recipients.map((recipient, index) => {
    const row = document.createElement('li')
    if (index === selectedIndex) row.setAttribute('aria-current', 'true')
    const phone = document.createElement('span')
    const status = document.createElement('span')
    phone.textContent = recipient.phoneE164
    status.textContent = hasOpened(recipient) ? 'Aberta' : 'Pendente'
    row.append(phone, status)
    return row
  }))
}

function setCampaign(value: Campaign | undefined): void {
  if (value?.id !== campaign?.id) selectedIndex = value ? nextUnopenedIndex(value) : 0
  if (campaign && !value) {
    numbers.value = ''
    consent.checked = false
    review(importPasted(''))
  }
  campaign = value
  render()
}

async function act(operation: () => Promise<string | void>): Promise<void> {
  if (busy) return
  busy = true
  render()
  show(error, '')
  show(feedback, '')
  try {
    const focus = await operation()
    if (focus) element(focus).focus()
  } catch (cause) {
    show(error, cause instanceof Error ? cause.message : 'Não foi possível concluir a ação.')
  } finally {
    busy = false
    render()
  }
}

function changeQueue(operation: () => Promise<void>, focus: string): void {
  void act(async () => {
    await navigator.locks.request(CAMPAIGN_KEY, operation)
    return focus
  })
}

numbers.addEventListener('input', () => {
  consent.checked = false
  show(error, '')
  review(importPasted(numbers.value))
})

template.addEventListener('input', updateSubmit)
consent.addEventListener('input', updateSubmit)

setup.addEventListener('submit', event => {
  event.preventDefault()
  if (start.disabled) return
  const contacts = selectedContacts()
  const message = template.value
  const granted = consent.checked
  changeQueue(async () => {
    if (await loadCampaign()) throw new Error('Já existe uma fila aberta.')
    const value = createCampaign(contacts, message, granted)
    await saveCampaign(value)
    consent.checked = false
    setCampaign(value)
  }, 'queue-title')
})

open.addEventListener('click', () => {
  if (!campaign || busy) return
  const { id: campaignId, recipients } = campaign
  const index = selectedIndex
  const recipientId = recipients[index].id

  void act(async () => {
    const { id: windowId } = await chrome.windows.getCurrent()
    const result = await chrome.runtime.sendMessage({
      type: 'open-conversation', campaignId, recipientId, windowId,
    })
    if (!result || result.error) {
      throw new Error(result?.error ?? 'Não foi possível abrir a conversa.')
    }

    const updated = await loadCampaign()
    if (updated?.id === campaignId) {
      selectedIndex = nextUnopenedIndex(updated, index)
      setCampaign(updated)
      return 'recipient-title'
    }
    setCampaign(updated)
    if (updated) return 'queue-title'
    show(feedback, 'Todas as conversas foram abertas. A lista foi limpa.')
    return 'setup-title'
  })
})

function navigate(direction: -1 | 1): void {
  if (!campaign || busy) return
  selectedIndex = Math.max(0, Math.min(selectedIndex + direction, campaign.recipients.length - 1))
  render()
  element('recipient-title').focus()
}

back.addEventListener('click', () => navigate(-1))
next.addEventListener('click', () => navigate(1))

function confirmAction(message: string, action: () => void): void {
  if (busy) return
  const dialog = element<HTMLDialogElement>('confirmation')
  element('confirm-message').textContent = message
  dialog.returnValue = ''
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'confirm') action()
  }, { once: true })
  dialog.showModal()
}

deleteData.addEventListener('click', () => {
  confirmAction('Apagar a fila, os números e a mensagem dos dados locais da extensão?', () => {
    changeQueue(async () => {
      await chrome.storage.local.clear()
      setup.reset()
      review(importPasted(''))
      setCampaign(undefined)
      show(feedback, 'Dados locais apagados.')
    }, 'setup-title')
  })
})

function restore(): Promise<void> {
  return navigator.locks.request(CAMPAIGN_KEY, async () => {
    let stored = await loadCampaign()
    if (stored && nextUnopenedIndex(stored) === -1) {
      await chrome.storage.local.remove(CAMPAIGN_KEY)
      stored = undefined
    }
    setCampaign(stored)
    deleteData.disabled = false
  }).catch(() => show(error, 'Não foi possível carregar os dados locais da extensão.'))
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && CAMPAIGN_KEY in changes) void restore()
})

refreshReview()
void restore()
