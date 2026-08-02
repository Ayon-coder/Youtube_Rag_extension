const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

export function extractVideoId(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.endsWith('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v && VIDEO_ID_RE.test(v)) return v
      const shorts = u.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/)
      if (shorts) return shorts[1]
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1)
      if (VIDEO_ID_RE.test(id)) return id
    }
  } catch {
    return null
  }
  return null
}

export async function getActiveVideo() {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    return { videoId: 'Js05B8Z1ivE', title: 'Dev mode — mock video' }
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const videoId = extractVideoId(tab?.url)
  if (!videoId) return { videoId: null, title: null }
  const title = (tab.title || '').replace(/\s*-\s*YouTube$/, '')
  return { videoId, title }
}

export async function prepare(videoId) {
  const res = await fetch(`${API_BASE}/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_id: videoId }),
  })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
  return await res.json()
}

export async function ask({ videoId, question, signal }) {
  const res = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_id: videoId, question }),
    signal,
  })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
  const data = await res.json()
  return data.answer ?? ''
}
