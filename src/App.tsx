import React, { useState } from 'react';
import Home from './pages/Home';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
// import Timetable from './pages/Timetable'; // ← これも置き換え
import TimetableManager from './pages/TimetableManager'; // 新しい時間割管理ページ

export default function App() {
  const [page, setPage] = useState<'home' | 'timetable' | 'students' | 'teachers'>('home');

  const renderPage = () => {
    switch (page) {
      case 'students': return <Students />;
      case 'teachers': return <Teachers />;
      case 'timetable': return <TimetableManager />;
      default: return <Home onNavigate={setPage} />;
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      {renderPage()}
    </div>
  );
}