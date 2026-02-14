import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getEntry, saveEntry } from '../db'
import { todayStr, formatDateLong } from '../utils'
import type { JournalEntry } from '../types'

function EntryPage() {
  const { date: paramDate } = useParams<{ date?: string }>()
  const navigate = useNavigate()
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

  const loadEntry = useCallback(async (d: string) => {
    const entry = await getEntry(d)
    if (entry) {
      setBrainDump(entry.brainDump)
      setMood(entry.mood)
      setEnergy(entry.energy)
      setStress(entry.stress)
      setGratitude(entry.gratitude.length >= 3 ? entry.gratitude : [...entry.gratitude, ...Array(3 - entry.gratitude.length).fill('')])
      setTags(entry.tags)
    } else {
      setBrainDump('')
      setMood(5)
      setEnergy(5)
      setStress(5)
      setGratitude(['', '', ''])
      setTags([])
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    const d = paramDate || todayStr()
    setDate(d)
    setLoaded(false)
    loadEntry(d)
  }, [paramDate, loadEntry])

  const handleSave = async () => {
    const entry: JournalEntry = {
      date,
      brainDump,
      mood,
      energy,
      stress,
      gratitude: gratitude.filter(g => g.trim() !== ''),
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const existing = await getEntry(date)
    if (existing) {
      entry.createdAt = existing.createdAt
    }

    await saveEntry(entry)
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

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default EntryPage
