import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getAllEntries } from '../db'
import { computeStreak, daysAgo } from '../utils'
import type { JournalEntry } from '../types'

type Range = 7 | 30 | 90

interface ChartDataPoint {
  date: string;
  label: string;
  mood: number;
  energy: number;
  stress: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="custom-tooltip">
      <div style={{ marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

function TrendsPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [range, setRange] = useState<Range>(7)

  useEffect(() => {
    getAllEntries().then(setEntries)
  }, [])

  const streak = computeStreak(entries)
  const totalEntries = entries.length

  const startDate = daysAgo(range)
  const filtered = entries
    .filter(e => e.date >= startDate)
    .sort((a, b) => a.date.localeCompare(b.date))

  const avgMood = filtered.length ? Math.round(filtered.reduce((s, e) => s + e.mood, 0) / filtered.length * 10) / 10 : 0
  const avgEnergy = filtered.length ? Math.round(filtered.reduce((s, e) => s + e.energy, 0) / filtered.length * 10) / 10 : 0
  const avgStress = filtered.length ? Math.round(filtered.reduce((s, e) => s + e.stress, 0) / filtered.length * 10) / 10 : 0

  const chartData: ChartDataPoint[] = filtered.map(e => ({
    date: e.date,
    label: new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mood: e.mood,
    energy: e.energy,
    stress: e.stress,
  }))

  return (
    <div className="page">
      <h1>Trends</h1>

      {/* Streak & total */}
      <div className="card stats-row">
        <div className="stat-pill">
          <div className="value">{streak}</div>
          <div className="label">Day Streak</div>
        </div>
        <div className="stat-pill">
          <div className="value">{totalEntries}</div>
          <div className="label">Total Entries</div>
        </div>
        <div className="stat-pill">
          <div className="value">{filtered.length}</div>
          <div className="label">In Range</div>
        </div>
      </div>

      {/* Range selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([7, 30, 90] as Range[]).map(r => (
          <button
            key={r}
            className={r === range ? 'btn-primary btn-small' : 'btn-secondary btn-small'}
            onClick={() => setRange(r)}
            style={{ flex: 1 }}
          >
            {r}d
          </button>
        ))}
      </div>

      {/* Averages */}
      <div className="card stats-row">
        <div className="stat-pill">
          <div className="value">{avgMood}</div>
          <div className="label">Avg Mood</div>
        </div>
        <div className="stat-pill">
          <div className="value">{avgEnergy}</div>
          <div className="label">Avg Energy</div>
        </div>
        <div className="stat-pill">
          <div className="value">{avgStress}</div>
          <div className="label">Avg Stress</div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div className="card">
          <h2>Mood / Energy / Stress</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="label"
                tick={{ fill: '#999', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fill: '#999', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
                width={25}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="mood" stroke="#e94560" strokeWidth={2} dot={false} name="Mood" />
              <Line type="monotone" dataKey="energy" stroke="#2ecc71" strokeWidth={2} dot={false} name="Energy" />
              <Line type="monotone" dataKey="stress" stroke="#f39c12" strokeWidth={2} dot={false} name="Stress" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="card empty-state">
          <div className="icon">📊</div>
          <p>Need at least 2 entries in this range to show charts.</p>
        </div>
      )}
    </div>
  )
}

export default TrendsPage
