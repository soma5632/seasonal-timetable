import React, { useState } from 'react';
import Home from './pages/Home';
import Holidays from './pages/Holidays';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Timetable from './pages/Timetable';

export default function App() {
  const [page, setPage] = useState<'home' | 'holidays' | 'students' | 'teachers' | 'timetable'>('home');

  const renderPage = () => {
    switch (page) {
      case 'holidays': return <Holidays />;
      case 'students': return <Students />;
      case 'teachers': return <Teachers />;
      case 'timetable': return <Timetable />;
      default: return <Home onNavigate={setPage} />;
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      {renderPage()}
    </div>
  );
}