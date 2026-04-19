import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import QuizPage from './pages/QuizPage';
import StatsPage from './pages/StatsPage';
import DictionaryPage from './pages/DictionaryPage';
import ErrorsPage from './pages/ErrorsPage';
import BottomNav from './components/layout/BottomNav';

function AppContent() {
  const location = useLocation();
  const isQuizPage = location.pathname.startsWith('/quiz/');

  return (
    <div className="app-shell">
      <main className="page-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/quiz/:topicId" element={<QuizPage />} />
          <Route path="/errors" element={<ErrorsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/dictionary" element={<DictionaryPage />} />
        </Routes>
      </main>
      
      {/* Нижняя навигация (скрыта на страницах квиза) */}
      {!isQuizPage && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
