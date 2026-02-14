import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAllEntries, saveReport, getAllReports, getReport } from '../db'
import { generateWeeklyReport, formatDate } from '../utils'
import type { WeeklyReport } from '../types'

function ReportsPage() {
  const { id: paramId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [activeReport, setActiveReport] = useState<WeeklyReport | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadReports()
  }, [])

  useEffect(() => {
    if (paramId) {
      getReport(paramId).then(r => {
        if (r) setActiveReport(r)
      })
    } else {
      setActiveReport(null)
    }
  }, [paramId])

  const loadReports = async () => {
    const all = await getAllReports()
    setReports(all.sort((a, b) => b.id.localeCompare(a.id)))
  }

  const generateThisWeek = async () => {
    setGenerating(true)
    const entries = await getAllEntries()
    const report = generateWeeklyReport(entries, new Date())
    await saveReport(report)
    setActiveReport(report)
    await loadReports()
    setGenerating(false)
    navigate(`/reports/${report.id}`, { replace: true })
  }

  const generateForWeek = async (weeksAgo: number) => {
    setGenerating(true)
    const d = new Date()
    d.setDate(d.getDate() - weeksAgo * 7)
    const entries = await getAllEntries()
    const report = generateWeeklyReport(entries, d)
    await saveReport(report)
    setActiveReport(report)
    await loadReports()
    setGenerating(false)
    navigate(`/reports/${report.id}`, { replace: true })
  }

  if (activeReport) {
    return (
      <div className="page">
        <button
          className="btn-secondary btn-small"
          onClick={() => { setActiveReport(null); navigate('/reports', { replace: true }) }}
          style={{ marginBottom: 12 }}
        >
          &lt; All Reports
        </button>

        <h1>Week of {formatDate(activeReport.weekStart)}</h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: 16, marginTop: -8, fontSize: '0.85rem' }}>
          {formatDate(activeReport.weekStart)} - {formatDate(activeReport.weekEnd)}
        </p>

        {/* Stats */}
        <div className="card stats-row">
          <div className="stat-pill">
            <div className="value">{activeReport.entries}</div>
            <div className="label">Entries</div>
          </div>
          <div className="stat-pill">
            <div className="value">{activeReport.streak}</div>
            <div className="label">Streak</div>
          </div>
          <div className="stat-pill">
            <div className="value">{activeReport.avgMood}</div>
            <div className="label">Avg Mood</div>
          </div>
        </div>

        <div className="card stats-row">
          <div className="stat-pill">
            <div className="value">{activeReport.avgEnergy}</div>
            <div className="label">Avg Energy</div>
          </div>
          <div className="stat-pill">
            <div className="value">{activeReport.avgStress}</div>
            <div className="label">Avg Stress</div>
          </div>
          <div className="stat-pill">
            <div className="value" style={{ fontSize: '1rem' }}>
              {activeReport.bestDay ? formatDate(activeReport.bestDay.date) : '-'}
            </div>
            <div className="label">Best Day</div>
          </div>
        </div>

        {/* Themes */}
        {activeReport.themes.length > 0 && (
          <div className="card report-section">
            <h3>Themes</h3>
            <div>
              {activeReport.themes.map((t, i) => (
                <span className="tag" key={i}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Wins */}
        {activeReport.wins.length > 0 && (
          <div className="card report-section">
            <h3>Wins</h3>
            <ul>
              {activeReport.wins.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Stressors */}
        {activeReport.stressors.length > 0 && (
          <div className="card report-section">
            <h3>Stressors</h3>
            <ul>
              {activeReport.stressors.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Worst day */}
        {activeReport.worstDay && (
          <div className="card report-section">
            <h3>Toughest Day</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              {formatDate(activeReport.worstDay.date)} (score: {activeReport.worstDay.score})
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <h1>Weekly Reports</h1>

      {/* Generate buttons */}
      <div className="card">
        <button
          className="btn-primary"
          onClick={generateThisWeek}
          disabled={generating}
          style={{ width: '100%', padding: 14, fontSize: '1rem', marginBottom: 8 }}
        >
          {generating ? 'Generating...' : `Generate This Week's Report`}
        </button>
        <button
          className="btn-secondary"
          onClick={() => generateForWeek(1)}
          disabled={generating}
          style={{ width: '100%', padding: 10, fontSize: '0.9rem' }}
        >
          Generate Last Week's Report
        </button>
      </div>

      {/* Saved reports list */}
      <h2 style={{ marginTop: 8 }}>Saved Reports</h2>
      {reports.length === 0 ? (
        <div className="card empty-state">
          <div className="icon">📋</div>
          <p>No reports yet. Generate your first weekly report!</p>
        </div>
      ) : (
        <div className="card">
          {reports.map(r => (
            <div
              key={r.id}
              className="report-list-item"
              onClick={() => { setActiveReport(r); navigate(`/reports/${r.id}`, { replace: true }) }}
            >
              <div>
                <strong>{r.id}</strong>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                  {r.entries} entries / Mood {r.avgMood}
                </div>
              </div>
              <span style={{ color: 'var(--text-dim)' }}>&gt;</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ReportsPage
