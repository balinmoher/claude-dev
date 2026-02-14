import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getAllEntries, saveReport, getAllReports, getReport, getAIOutputsForKey } from '../db'
import { generateWeeklyReport, formatDate, getWeekId, getMonday } from '../utils'
import { hasApiKey, aiWeeklyInsight, aiWeeklyCompare, aiWeeklyExperiments } from '../ai'
import type { WeeklyReport, AIOutput } from '../types'

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

function ReportsPage() {
  const { id: paramId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const isOnline = useOnline()
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [activeReport, setActiveReport] = useState<WeeklyReport | null>(null)
  const [generating, setGenerating] = useState(false)

  // AI state
  const [aiResults, setAiResults] = useState<Record<string, AIOutput>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [aiError, setAiError] = useState<Record<string, string>>({})

  const canUseAI = isOnline && hasApiKey() && !!activeReport

  useEffect(() => {
    loadReports()
  }, [])

  useEffect(() => {
    if (paramId) {
      getReport(paramId).then(r => {
        if (r) {
          setActiveReport(r)
          loadAIOutputs(r.id)
        }
      })
    } else {
      setActiveReport(null)
      setAiResults({})
      setAiError({})
    }
  }, [paramId])

  const loadReports = async () => {
    const all = await getAllReports()
    setReports(all.sort((a, b) => b.id.localeCompare(a.id)))
  }

  const loadAIOutputs = async (weekId: string) => {
    const outputs = await getAIOutputsForKey(weekId)
    const results: Record<string, AIOutput> = {}
    for (const o of outputs) {
      results[o.type] = o
    }
    setAiResults(results)
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

  // AI handlers
  const runAI = async (type: string, fn: () => Promise<AIOutput>) => {
    setLoading(prev => ({ ...prev, [type]: true }))
    setAiError(prev => ({ ...prev, [type]: '' }))
    try {
      const result = await fn()
      setAiResults(prev => ({ ...prev, [type]: result }))
    } catch (e) {
      setAiError(prev => ({ ...prev, [type]: e instanceof Error ? e.message : 'Unknown error' }))
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleWeeklyInsight = async () => {
    if (!activeReport) return
    const entries = await getAllEntries()
    runAI('weekly-insight', () => aiWeeklyInsight(activeReport, entries))
  }

  const handleWeeklyCompare = async () => {
    if (!activeReport) return
    // Find previous week's report
    const monday = getMonday(new Date(activeReport.weekStart + 'T00:00:00'))
    const prevMonday = new Date(monday)
    prevMonday.setDate(prevMonday.getDate() - 7)
    const prevWeekId = getWeekId(prevMonday)
    const prevReport = await getReport(prevWeekId)
    if (!prevReport) {
      setAiError(prev => ({ ...prev, 'weekly-compare': 'No report found for previous week. Generate it first.' }))
      return
    }
    const entries = await getAllEntries()
    runAI('weekly-compare', () => aiWeeklyCompare(activeReport, prevReport, entries, entries))
  }

  const handleWeeklyExperiments = async () => {
    if (!activeReport) return
    const entries = await getAllEntries()
    runAI('weekly-experiments', () => aiWeeklyExperiments(activeReport, entries))
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

        {/* AI Analysis Section */}
        <div className="ai-section">
          <h2 className="ai-section-title">AI Analysis</h2>

          {!isOnline && <p className="ai-status-msg">Requires internet connection</p>}
          {isOnline && !hasApiKey() && (
            <p className="ai-status-msg">
              <Link to="/settings" style={{ color: 'var(--accent-light)' }}>Configure your API key</Link> to unlock AI features
            </p>
          )}

          <div className="ai-buttons">
            <button
              className="ai-btn ai-btn-wide"
              onClick={handleWeeklyInsight}
              disabled={!canUseAI || loading['weekly-insight']}
            >
              {loading['weekly-insight'] ? 'Generating...' : aiResults['weekly-insight'] ? 'Regenerate Weekly Insight' : 'Generate Weekly Insight'}
            </button>
            <button
              className="ai-btn"
              onClick={handleWeeklyCompare}
              disabled={!canUseAI || loading['weekly-compare']}
            >
              {loading['weekly-compare'] ? 'Comparing...' : aiResults['weekly-compare'] ? 'Re-compare' : 'What Changed vs Last Week?'}
            </button>
            <button
              className="ai-btn"
              onClick={handleWeeklyExperiments}
              disabled={!canUseAI || loading['weekly-experiments']}
            >
              {loading['weekly-experiments'] ? 'Thinking...' : aiResults['weekly-experiments'] ? 'New Experiments' : 'Pick Next Week Experiments'}
            </button>
          </div>

          {/* AI Results */}
          {aiResults['weekly-insight'] && (
            <div className="ai-result ai-result-long">
              <h3>Weekly Chapter</h3>
              <div className="ai-content-formatted">{aiResults['weekly-insight'].content}</div>
            </div>
          )}
          {aiError['weekly-insight'] && <div className="ai-error">{aiError['weekly-insight']}</div>}

          {aiResults['weekly-compare'] && (
            <div className="ai-result">
              <h3>Week-over-Week</h3>
              <div className="ai-content-formatted">{aiResults['weekly-compare'].content}</div>
            </div>
          )}
          {aiError['weekly-compare'] && <div className="ai-error">{aiError['weekly-compare']}</div>}

          {aiResults['weekly-experiments'] && (
            <div className="ai-result">
              <h3>Suggested Experiments</h3>
              <div className="ai-content-formatted">{aiResults['weekly-experiments'].content}</div>
            </div>
          )}
          {aiError['weekly-experiments'] && <div className="ai-error">{aiError['weekly-experiments']}</div>}
        </div>
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
