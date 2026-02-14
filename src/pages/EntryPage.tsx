import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getEntry, saveEntry, getAIOutputsForKey, getEntriesInRange } from '../db'
import { todayStr, formatDateLong, daysAgo } from '../utils'
import { hasApiKey, aiReflect, aiNameTheDay, aiCoach, aiExtractActions, aiAskAboutEntry } from '../ai'
import type { JournalEntry, AIOutput } from '../types'

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

function EntryPage() {
  const { date: paramDate } = useParams<{ date?: string }>()
  const navigate = useNavigate()
  const isOnline = useOnline()
  const [date, setDate] = useState(paramDate || todayStr())
  const [brainDump, setBrainDump] = useState('')
  const [mood, setMood] = useState(5)
  const [energy, setEnergy] = useState(5)
  const [stress, setStress] = useState(5)
  const [gratitude, setGratitude] = useState<string[]>(['', '', ''])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [toast, setToast] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [hasSavedEntry, setHasSavedEntry] = useState(false)

  // AI state
  const [aiResults, setAiResults] = useState<Record<string, AIOutput>>({})
  const [askHistory, setAskHistory] = useState<AIOutput[]>([])
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [aiError, setAiError] = useState<Record<string, string>>({})
  const [askInput, setAskInput] = useState('')
  const [askContext, setAskContext] = useState(false) // include last 7 days

  const canUseAI = isOnline && hasApiKey() && hasSavedEntry

  const loadEntry = useCallback(async (d: string) => {
    const entry = await getEntry(d)
    if (entry) {
      setBrainDump(entry.brainDump)
      setMood(entry.mood)
      setEnergy(entry.energy)
      setStress(entry.stress)
      setGratitude(entry.gratitude.length >= 3 ? entry.gratitude : [...entry.gratitude, ...Array(3 - entry.gratitude.length).fill('')])
      setTags(entry.tags)
      setHasSavedEntry(true)
    } else {
      setBrainDump('')
      setMood(5)
      setEnergy(5)
      setStress(5)
      setGratitude(['', '', ''])
      setTags([])
      setHasSavedEntry(false)
    }
    setLoaded(true)
  }, [])

  // Load AI outputs for current date
  const loadAIOutputs = useCallback(async (d: string) => {
    const outputs = await getAIOutputsForKey(d)
    const results: Record<string, AIOutput> = {}
    const asks: AIOutput[] = []
    for (const o of outputs) {
      if (o.type === 'ask') {
        asks.push(o)
      } else {
        results[o.type] = o
      }
    }
    setAiResults(results)
    setAskHistory(asks.sort((a, b) => a.createdAt - b.createdAt))
  }, [])

  useEffect(() => {
    const d = paramDate || todayStr()
    setDate(d)
    setLoaded(false)
    setAiResults({})
    setAskHistory([])
    setAiError({})
    loadEntry(d)
    loadAIOutputs(d)
  }, [paramDate, loadEntry, loadAIOutputs])

  const getCurrentEntry = (): JournalEntry => ({
    date,
    brainDump,
    mood,
    energy,
    stress,
    gratitude: gratitude.filter(g => g.trim() !== ''),
    tags,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  const handleSave = async () => {
    const entry = getCurrentEntry()
    const existing = await getEntry(date)
    if (existing) {
      entry.createdAt = existing.createdAt
    }
    await saveEntry(entry)
    setHasSavedEntry(true)
    setToast('Saved!')
    setTimeout(() => setToast(''), 2000)
  }

  const handleDateChange = (newDate: string) => {
    navigate(`/entry/${newDate}`, { replace: true })
  }

  const addGratitude = () => {
    setGratitude([...gratitude, ''])
  }

  const updateGratitude = (index: number, value: string) => {
    const updated = [...gratitude]
    updated[index] = value
    setGratitude(updated)
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput('')
  }

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  // AI button handlers
  const runAI = async (type: string, fn: () => Promise<AIOutput>) => {
    setLoading(prev => ({ ...prev, [type]: true }))
    setAiError(prev => ({ ...prev, [type]: '' }))
    try {
      const result = await fn()
      if (type === 'ask') {
        setAskHistory(prev => [...prev, result])
        setAskInput('')
      } else {
        setAiResults(prev => ({ ...prev, [type]: result }))
      }
    } catch (e) {
      setAiError(prev => ({ ...prev, [type]: e instanceof Error ? e.message : 'Unknown error' }))
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleReflect = () => runAI('reflect', () => aiReflect(getCurrentEntry()))
  const handleNameDay = () => runAI('name-the-day', () => aiNameTheDay(getCurrentEntry()))
  const handleCoach = () => runAI('coach', () => aiCoach(getCurrentEntry()))
  const handleExtractActions = () => runAI('extract-actions', () => aiExtractActions(getCurrentEntry()))

  const handleAsk = async () => {
    if (!askInput.trim()) return
    const entry = getCurrentEntry()
    let recentEntries: JournalEntry[] | undefined
    if (askContext) {
      recentEntries = await getEntriesInRange(daysAgo(7), date)
      recentEntries = recentEntries.filter(e => e.date !== date) // exclude current
    }
    runAI('ask', () => aiAskAboutEntry(entry, askInput.trim(), recentEntries))
  }

  // Parse Name the Day JSON
  const parseNameDay = (content: string): { title: string; tags: string[]; summary: string } | null => {
    try {
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  if (!loaded) return <div className="page" />

  return (
    <div className="page">
      <h1>{formatDateLong(date)}</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <input
          type="date"
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          style={{ textAlign: 'center' }}
        />
      </div>

      {/* Brain Dump */}
      <div className="card">
        <h2>Brain Dump</h2>
        <textarea
          placeholder="What's on your mind today?"
          value={brainDump}
          onChange={(e) => setBrainDump(e.target.value)}
          rows={4}
        />
      </div>

      {/* Metrics */}
      <div className="card">
        <h2>How are you feeling?</h2>
        <div className="slider-group">
          <div className="slider-label">
            <span>Mood</span>
            <span>{mood}</span>
          </div>
          <input type="range" min="0" max="10" value={mood} onChange={(e) => setMood(Number(e.target.value))} />
        </div>
        <div className="slider-group">
          <div className="slider-label">
            <span>Energy</span>
            <span>{energy}</span>
          </div>
          <input type="range" min="0" max="10" value={energy} onChange={(e) => setEnergy(Number(e.target.value))} />
        </div>
        <div className="slider-group">
          <div className="slider-label">
            <span>Stress</span>
            <span>{stress}</span>
          </div>
          <input type="range" min="0" max="10" value={stress} onChange={(e) => setStress(Number(e.target.value))} />
        </div>
      </div>

      {/* Gratitude */}
      <div className="card">
        <h2>3 things I'm grateful for today</h2>
        {gratitude.map((g, i) => (
          <div className="gratitude-item" key={i}>
            <span className="number">{i + 1}.</span>
            <input
              placeholder={`Gratitude #${i + 1}`}
              value={g}
              onChange={(e) => updateGratitude(i, e.target.value)}
            />
          </div>
        ))}
        <button className="btn-secondary btn-small" onClick={addGratitude}>
          + Add another
        </button>
      </div>

      {/* Tags */}
      <div className="card">
        <h2>Tags</h2>
        <div style={{ marginBottom: 8 }}>
          {tags.map((t, i) => (
            <span className="tag" key={i}>
              {t}
              <span className="tag-remove" onClick={() => removeTag(i)}>x</span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Add a tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
          />
          <button className="btn-secondary btn-small" onClick={addTag} style={{ flexShrink: 0 }}>
            Add
          </button>
        </div>
      </div>

      {/* Save */}
      <button
        className="btn-primary"
        onClick={handleSave}
        style={{ width: '100%', padding: 14, fontSize: '1rem', marginTop: 4 }}
      >
        Save Entry
      </button>

      {/* AI Insights Section */}
      {hasSavedEntry && brainDump.trim() && (
        <div className="ai-section">
          <h2 className="ai-section-title">AI Insights</h2>

          {!isOnline && <p className="ai-status-msg">Requires internet connection</p>}
          {isOnline && !hasApiKey() && (
            <p className="ai-status-msg">
              <Link to="/settings" style={{ color: 'var(--accent-light)' }}>Configure your API key</Link> to unlock AI features
            </p>
          )}

          {/* AI Buttons */}
          <div className="ai-buttons">
            <button
              className="ai-btn"
              onClick={handleReflect}
              disabled={!canUseAI || loading['reflect']}
            >
              {loading['reflect'] ? 'Thinking...' : aiResults['reflect'] ? 'Re-reflect' : 'Reflect'}
            </button>
            <button
              className="ai-btn"
              onClick={handleNameDay}
              disabled={!canUseAI || loading['name-the-day']}
            >
              {loading['name-the-day'] ? 'Thinking...' : aiResults['name-the-day'] ? 'Re-name' : 'Name the Day'}
            </button>
            <button
              className="ai-btn"
              onClick={handleCoach}
              disabled={!canUseAI || loading['coach']}
            >
              {loading['coach'] ? 'Thinking...' : aiResults['coach'] ? 'Re-coach' : 'Coach Me'}
            </button>
            <button
              className="ai-btn"
              onClick={handleExtractActions}
              disabled={!canUseAI || loading['extract-actions']}
            >
              {loading['extract-actions'] ? 'Thinking...' : aiResults['extract-actions'] ? 'Re-extract' : 'Extract Actions'}
            </button>
          </div>

          {/* AI Results */}
          {aiResults['reflect'] && (
            <div className="ai-result">
              <h3>Reflection</h3>
              <p>{aiResults['reflect'].content}</p>
            </div>
          )}
          {aiError['reflect'] && <div className="ai-error">{aiError['reflect']}</div>}

          {aiResults['name-the-day'] && (
            <div className="ai-result">
              <h3>Day Title</h3>
              {(() => {
                const parsed = parseNameDay(aiResults['name-the-day'].content)
                if (parsed) {
                  return (
                    <>
                      <p className="ai-day-title">{parsed.title}</p>
                      <div style={{ marginBottom: 6 }}>
                        {parsed.tags.map((t, i) => <span className="tag" key={i}>{t}</span>)}
                      </div>
                      <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>{parsed.summary}</p>
                    </>
                  )
                }
                return <p>{aiResults['name-the-day'].content}</p>
              })()}
            </div>
          )}
          {aiError['name-the-day'] && <div className="ai-error">{aiError['name-the-day']}</div>}

          {aiResults['coach'] && (
            <div className="ai-result">
              <h3>Next Step</h3>
              <p>{aiResults['coach'].content}</p>
            </div>
          )}
          {aiError['coach'] && <div className="ai-error">{aiError['coach']}</div>}

          {aiResults['extract-actions'] && (
            <div className="ai-result">
              <h3>Action Items</h3>
              <div className="ai-content-formatted">{aiResults['extract-actions'].content}</div>
            </div>
          )}
          {aiError['extract-actions'] && <div className="ai-error">{aiError['extract-actions']}</div>}

          {/* Ask Section */}
          <div className="ai-ask-section">
            <h3>Ask about this entry</h3>
            <div className="ai-ask-context">
              <label>
                <input
                  type="checkbox"
                  checked={askContext}
                  onChange={(e) => setAskContext(e.target.checked)}
                />
                Include last 7 days for context
              </label>
            </div>
            <div className="ai-ask-input">
              <input
                placeholder="What am I avoiding? What's the real problem?"
                value={askInput}
                onChange={(e) => setAskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAsk() } }}
                disabled={!canUseAI}
              />
              <button
                className="btn-primary btn-small"
                onClick={handleAsk}
                disabled={!canUseAI || !askInput.trim() || loading['ask']}
              >
                {loading['ask'] ? '...' : 'Ask'}
              </button>
            </div>

            {/* Ask history */}
            {askHistory.map((a) => (
              <div className="ai-result ai-ask-result" key={a.id}>
                <div className="ai-ask-q">Q: {a.query}</div>
                <p>{a.content}</p>
              </div>
            ))}
            {aiError['ask'] && <div className="ai-error">{aiError['ask']}</div>}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default EntryPage
