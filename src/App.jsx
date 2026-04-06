import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import QuizPage from './pages/QuizPage';
import StatsPage from './pages/StatsPage';
import DictionaryPage from './pages/DictionaryPage';
import BottomNav from './components/layout/BottomNav';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <main className="page-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/quiz/:topicId" element={<QuizPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/dictionary" element={<DictionaryPage />} />
          </Routes>
        </main>
        
        {/* Нижняя навигация (постоянная) */}
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}

export default App;
