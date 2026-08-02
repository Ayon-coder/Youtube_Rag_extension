const KEY = 'threads'

const memory = new Map()
const hasChromeStorage = () => typeof chrome !== 'undefined' && chrome.storage?.local

export async function loadThread(videoId) {
  if (!videoId) return []
  if (!hasChromeStorage()) return memory.get(videoId) ?? []
  const bag = await chrome.storage.local.get(KEY)
  return bag[KEY]?.[videoId] ?? []
}

export async function saveThread(videoId, messages) {
  if (!videoId) return
  if (!hasChromeStorage()) {
    memory.set(videoId, messages)
    return
  }
  const bag = await chrome.storage.local.get(KEY)
  const threads = bag[KEY] ?? {}
  threads[videoId] = messages.slice(-50)
  await chrome.storage.local.set({ [KEY]: threads })
}

export async function clearThread(videoId) {
  await saveThread(videoId, [])
}
