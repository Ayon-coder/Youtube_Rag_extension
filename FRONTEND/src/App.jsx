import { useEffect, useRef, useState } from 'react'
import { ask, getActiveVideo, prepare } from './api'
import { clearThread, loadThread, saveThread } from './storage'

const SUGGESTIONS = [
  'Summarize this video',
  'What are the key takeaways?',
  'Explain the main argument',
]

const POLL_INTERVAL = 9000 // 9 seconds

export default function App() {
  const [video, setVideo] = useState({ videoId: null, title: null, ready: false })
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [prepared, setPrepared] = useState(false)
  const threadRef = useRef(null)
  const inputRef = useRef(null)

  // Detect active video on mount
  useEffect(() => {
    getActiveVideo().then(async (v) => {
      setVideo({ ...v, ready: true })
      setMessages(await loadThread(v.videoId))
    })
  }, [])

  // Poll /prepare until the video is indexed
  useEffect(() => {
    if (!video.videoId || prepared) return

    let cancelled = false
    setPreparing(true)

    const poll = async () => {
      try {
        const res = await prepare(video.videoId)
        if (!cancelled && res.status === 'ready') {
          setPrepared(true)
          setPreparing(false)
        }
      } catch {
        // Backend not ready or timeout — will retry
      }

      if (!cancelled && !prepared) {
        setTimeout(poll, POLL_INTERVAL)
      }
    }

    poll() // first call immediately

    return () => { cancelled = true }
  }, [video.videoId])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const submit = async (text) => {
    const question = text.trim()
    if (!question || busy || !video.videoId || !prepared) return

    const next = [...messages, { role: 'user', text: question }]
    setMessages(next)
    setDraft('')
    setBusy(true)

    try {
      const answer = await ask({ videoId: video.videoId, question })
      const done = [...next, { role: 'bot', text: answer }]
      setMessages(done)
      await saveThread(video.videoId, done)
    } catch (err) {
      const msg =
        err instanceof TypeError
          ? 'Cannot reach the backend. Is it running?'
          : err.message
      setMessages([...next, { role: 'error', text: msg }])
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  const reset = async () => {
    setMessages([])
    await clearThread(video.videoId)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(draft)
    }
  }

  const noVideo = video.ready && !video.videoId
  const disabled = noVideo || !prepared

  return (
    <div className="app">
      <header className="header">
        <span className="logo">▶</span>
        <div>
          <h1>Ask This Video</h1>
          <div className="sub">caption-grounded answers</div>
        </div>
        <button className="icon-btn" onClick={reset} title="Clear conversation">
          ✕
        </button>
      </header>

      <div className="banner">
        <span className={`dot${noVideo ? ' off' : preparing ? ' prep' : ''}`} />
        <div className="banner-text">
          <div className="banner-title">
            {!video.ready
              ? 'Detecting…'
              : noVideo
                ? 'No YouTube video open'
                : video.title || 'Untitled video'}
          </div>
          <div className="banner-id">
            {noVideo
              ? 'open a watch page to begin'
              : preparing
                ? 'preparing captions…'
                : video.videoId
                  ? `id · ${video.videoId}`
                  : ''}
          </div>
        </div>
      </div>

      <main className="thread" ref={threadRef}>
        {messages.length === 0 && !busy && (
          <div className="empty">
            <h2>{noVideo ? 'Nothing to read' : preparing ? 'Preparing…' : 'Ask anything'}</h2>
            <p>
              {noVideo
                ? 'Navigate to a YouTube video, then reopen this popup.'
                : preparing
                  ? 'Fetching and indexing captions. This may take a moment…'
                  : 'Questions are answered from this video\u2019s captions, not from the open web.'}
            </p>
            {!noVideo && prepared && (
              <div className="chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip" onClick={() => submit(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <span className="msg-tag">
              {m.role === 'user' ? 'You' : m.role === 'bot' ? 'Answer' : 'Error'}
            </span>
            {m.text}
          </div>
        ))}

        {busy && (
          <div className="msg bot">
            <span className="msg-tag">Answer</span>
            <div className="typing">
              <i />
              <i />
              <i />
            </div>
          </div>
        )}
      </main>

      <footer className="composer">
        <textarea
          ref={inputRef}
          value={draft}
          disabled={disabled || busy}
          placeholder={noVideo ? 'Open a YouTube video first…' : preparing ? 'Preparing captions…' : 'Ask about this video…'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="composer-row">
          <span className="hint">Enter to send · Shift+Enter newline</span>
          <button className="send" disabled={!draft.trim() || busy || disabled} onClick={() => submit(draft)}>
            {busy ? 'Thinking' : 'Ask →'}
          </button>
        </div>
      </footer>
    </div>
  )
}
