import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Layouts
import { StudentLayout } from './layouts/StudentLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Auth Pages
import { StudentLogin } from './pages/auth/StudentLogin';
import { AdminLogin } from './pages/auth/AdminLogin';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { ProblemList } from './pages/student/ProblemList';
import { ProblemSolve } from './pages/student/ProblemSolve';
import { SubmissionsPage } from './pages/student/SubmissionsPage';
import { MCQPage } from './pages/student/MCQPage';
import { ContestList } from './pages/student/ContestList';
import { ContestArena } from './pages/student/ContestArena';
import { StudentContestResult } from './pages/student/StudentContestResult';
import { LeaderboardPage } from './pages/student/LeaderboardPage';
import { ProfilePage } from './pages/student/ProfilePage';
import { NotificationsPage } from './pages/student/NotificationsPage';
import { PlaygroundPage } from './pages/student/PlaygroundPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManageStudents } from './pages/admin/ManageStudents';
import { ManageProblems } from './pages/admin/ManageProblems';
import { ManageContests } from './pages/admin/ManageContests';
import { ManageAttendance } from './pages/admin/ManageAttendance';
import { ManageContestReports } from './pages/admin/ManageContestReports';
import { ManageSubmissions } from './pages/admin/ManageSubmissions';
import { ManageMCQs } from './pages/admin/ManageMCQs';
import { AdminSettings } from './pages/admin/AdminSettings';
import { ManageNotifications } from './pages/admin/ManageNotifications';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Root URL -> Student Login page */}
            <Route path="/" element={<StudentLogin />} />

            {/* Admin Login page */}
            <Route path="/loginadmin" element={<AdminLogin />} />

            {/* Student Protected Routes -> Only accessible after logging in */}
            <Route
              element={
                <ProtectedRoute requiredRole="STUDENT">
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<StudentDashboard />} />
              <Route path="/problems" element={<ProblemList />} />
              <Route path="/problems/:id" element={<ProblemSolve />} />
              <Route path="/submissions" element={<SubmissionsPage />} />
              <Route path="/mcqs" element={<MCQPage />} />
              <Route path="/contests" element={<ContestList />} />
              <Route path="/contests/:id" element={<ContestArena />} />
              <Route path="/contests/:id/result" element={<StudentContestResult />} />
              <Route path="/contests/:id/leaderboard" element={<LeaderboardPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/playground" element={<PlaygroundPage />} />
            </Route>

            {/* Admin Protected Routes -> Only accessible after admin login */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="students" element={<ManageStudents />} />
              <Route path="problems" element={<ManageProblems />} />
              <Route path="mcqs" element={<ManageMCQs />} />
              <Route path="contests" element={<ManageContests />} />
              <Route path="attendance" element={<ManageAttendance />} />
              <Route path="reports" element={<ManageContestReports />} />
              <Route path="submissions" element={<ManageSubmissions />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>

            {/* Any unknown route -> Go to Student Login */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
