import React, { useState } from 'react';
import Home from './pages/Home';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import TimetableManager from './pages/TimetableManager';
import TermManager from './pages/TermManager';
import Login from './pages/Login';
import SignUp from './pages/SignUp';


export default function App() {
  const [page, setPage] = useState<
    'login' | "signup" | 'home' | 'timetable' | 'students' | 'teachers' | 'term'
  >('login'); // ← 初期ページを login に

  const [currentUserId, setCurrentUserId] = useState<string>(
    localStorage.getItem("currentUserId") || ""
  );

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
      case 'home':
        return (
            <Home
              onNavigate={setPage}
              currentUserId={currentUserId}
              onLogout={() => {
                localStorage.removeItem("currentUserId");
                setCurrentUserId("");
                setPage("login");
              }}
            />
        );

      default:
        return <Login onLogin={setCurrentUserId} onNavigate={setPage} />;
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      {renderPage()}
    </div>
  );
}