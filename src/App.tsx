import React, { useState } from 'react';
import Home from './pages/Home';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import TimetableManager from './pages/TimetableManager';
import TermManager from './pages/TermManager';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ProgressPage from './pages/ProgressPage';

export default function App() {
  const [page, setPage] = useState<
    'login' | 'signup' | 'home' | 'timetable' | 'students' | 'teachers' | 'term' | 'progress'
  >('login');

  const [currentUserId, setCurrentUserId] = useState<string>(
    localStorage.getItem("userId") || ""
  );

  const handleLogin = (id: string) => {
    setCurrentUserId(id);
    localStorage.setItem("userId", id);
  };

  const renderPage = () => {
    switch (page) {
      case 'signup':
        return <SignUp onNavigate={setPage} />;

      case 'students':
        return <Students onNavigate={setPage} currentUserId={currentUserId} />;

      case 'teachers':
        return <Teachers onNavigate={setPage} currentUserId={currentUserId} />;

      case 'timetable':
        return <TimetableManager onNavigate={setPage} currentUserId={currentUserId} />;

      case 'term':
        return <TermManager onNavigate={setPage} currentUserId={currentUserId} />;

      case 'progress':
        return (
          <ProgressPage
            onNavigate={setPage}
            currentUserId={currentUserId}
          />
        );

      case 'home':
        return (
          <Home
            onNavigate={setPage}
            currentUserId={currentUserId}
            onLogout={() => {
              localStorage.removeItem("userId");
              setCurrentUserId("");
              setPage("login");
            }}
          />
        );

      default:
        return <Login onLogin={handleLogin} onNavigate={setPage} />;
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      {renderPage()}
    </div>
  );
}