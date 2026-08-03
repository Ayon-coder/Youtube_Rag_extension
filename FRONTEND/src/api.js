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

async function fetchCaptionJson(videoId) {
  const endpoints = [
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`,
    `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr&fmt=json3`,
  ]

  for (const url of endpoints) {
    const res = await fetch(url)
    if (!res.ok) continue
    const data = await res.json().catch(() => null)
    if (data?.events?.length) return data
  }

  throw new Error('No English captions found for this video')
}

function captionJsonToText(data) {
  return data.events
    .flatMap((event) => event.segs ?? [])
    .map((seg) => seg.utf8 ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function prepareWithCaptions(videoId) {
  const res = await fetch(`${API_BASE}/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_id: videoId }),
  })

  if (res.ok) return await res.json()

  if (res.status !== 400) {
    throw new Error(`Backend returned ${res.status}`)
  }

  const payload = await res.json().catch(() => ({}))
  const detail = payload?.detail ?? ''
  if (!String(detail).includes('caption_text')) {
    throw new Error(`Backend returned ${res.status}`)
  }

  const captionJson = await fetchCaptionJson(videoId)
  const captionText = captionJsonToText(captionJson)
  if (!captionText) {
    throw new Error('Caption text is empty')
  }

  const prepareRes = await fetch(`${API_BASE}/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_id: videoId, caption_text: captionText }),
  })
  if (!prepareRes.ok) throw new Error(`Backend returned ${prepareRes.status}`)
  return await prepareRes.json()
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
