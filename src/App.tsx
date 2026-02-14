import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import EntryPage from './pages/EntryPage'
import CalendarPage from './pages/CalendarPage'
import TrendsPage from './pages/TrendsPage'
import ReportsPage from './pages/ReportsPage'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<EntryPage />} />
        <Route path="/entry/:date" element={<EntryPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<ReportsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <nav className="bottom-nav">
        <NavLink to="/" end>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Journal
        </NavLink>
        <NavLink to="/calendar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Calendar
        </NavLink>
        <NavLink to="/trends">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Trends
        </NavLink>
        <NavLink to="/reports">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
          </svg>
          Reports
        </NavLink>
      </nav>
    </>
  )
}

export default App
