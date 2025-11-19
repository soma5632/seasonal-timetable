import React, { useState } from 'react';
import Home from './pages/Home';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import TimetableManager from './pages/TimetableManager';
import TermManager from './pages/TermManager';

export default function App() {
  // page に 'term' を追加
  const [page, setPage] = useState<
    'home' | 'timetable' | 'students' | 'teachers' | 'term'
  >('home');

  const renderPage = () => {
    switch (page) {
      case 'students':
        return <Students onNavigate={setPage} />;
      case 'teachers':
        return <Teachers onNavigate={setPage} />;
      case 'timetable':
        return <TimetableManager onNavigate={setPage} />;
      case 'term':
        return <TermManager onNavigate={setPage} />; // ★ ターム管理ページ
      default:
        return <Home onNavigate={setPage} />;
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      {renderPage()}
    </div>
  );
}