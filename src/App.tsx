import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppHeader } from './components/AppHeader'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import './styles.css'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const PresentationPage = lazy(() => import('./pages/PresentationPage').then((module) => ({ default: module.PresentationPage })))
const ResultsPage = lazy(() => import('./pages/ResultsPage').then((module) => ({ default: module.ResultsPage })))
const StudentSurveyPage = lazy(() => import('./pages/StudentSurveyPage').then((module) => ({ default: module.StudentSurveyPage })))
const SurveyEditorPage = lazy(() => import('./pages/SurveyEditorPage').then((module) => ({ default: module.SurveyEditorPage })))

function NotFoundPage() {
  return <><AppHeader showDashboard={false} /><main className="center-state"><section className="panel student-message"><h1>Page not found</h1><Link className="button button-primary" to="/">Return home</Link></section></main></>
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<main className="center-state">Loading page…</main>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/s/:slug" element={<StudentSurveyPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/surveys/new" element={<SurveyEditorPage />} />
              <Route path="/surveys/:id/edit" element={<SurveyEditorPage />} />
              <Route path="/surveys/:id/present" element={<PresentationPage />} />
              <Route path="/surveys/:id/results" element={<ResultsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

