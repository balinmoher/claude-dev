import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllEntries } from '../db'
import { todayStr, dateToStr, formatDate } from '../utils'
import type { JournalEntry } from '../types'

function CalendarPage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [viewDate, setViewDate] = useState(new Date())

  useEffect(() => {
    getAllEntries().then(setEntries)
  }, [])

  const entryDates = new Set(entries.map(e => e.date))
  const today = todayStr()

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7 // Monday start

  const days: { date: Date; inMonth: boolean }[] = []

  // Previous month padding
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, inMonth: false })
  }

  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), inMonth: true })
  }

  // Next month padding
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), inMonth: false })
    }
  }

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Recent entries for list view
  const recentEntries = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)

  return (
    <div className="page">
      <h1>Calendar</h1>

      <div className="card">
        <div className="month-nav">
          <button onClick={prevMonth}>&lt;</button>
          <span className="month-label">{monthLabel}</span>
          <button onClick={nextMonth}>&gt;</button>
        </div>

        <div className="calendar-grid">
          {weekDays.map(d => (
            <div className="calendar-day-header" key={d}>{d}</div>
          ))}
          {days.map(({ date: d, inMonth }, i) => {
            const ds = dateToStr(d)
            const hasEntry = entryDates.has(ds)
            const isToday = ds === today
            const classes = [
              'calendar-day',
              !inMonth && 'other-month',
              hasEntry && 'has-entry',
              isToday && 'today',
            ].filter(Boolean).join(' ')

            return (
              <div
                key={i}
                className={classes}
                onClick={() => navigate(`/entry/${ds}`)}
              >
                {d.getDate()}
              </div>
            )
          })}
        </div>
      </div>

      <h2>Recent Entries</h2>
      {recentEntries.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📖</div>
          <p>No entries yet. Start journaling!</p>
        </div>
      ) : (
        recentEntries.map(entry => (
          <div
            className="card"
            key={entry.date}
            onClick={() => navigate(`/entry/${entry.date}`)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <strong>{formatDate(entry.date)}</strong>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                Mood {entry.mood} / Energy {entry.energy}
              </span>
            </div>
            {entry.brainDump && (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.brainDump}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  )
}

export default CalendarPage
