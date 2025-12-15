import React from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { QuizProvider, useQuiz } from './context/QuizContext';
import WelcomeScreen from './components/WelcomeScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import CountdownScreen from './components/CountdownScreen';
import RevealScreen from './components/RevealScreen';
import RankingScreen from './components/RankingScreen';
import QRCodeScreen from './components/QRCodeScreen';

const QuizApp: React.FC = () => {
  const { phase } = useQuiz();

  switch (phase) {
    case 'welcome':
      return <WelcomeScreen />;
    case 'quiz':
      return <QuizScreen />;
    case 'results':
      return <ResultsScreen />;
    case 'countdown':
      return <CountdownScreen />;
    case 'reveal':
      return <RevealScreen />;
    case 'ranking':
      return <RankingScreen />;
    default:
      return <WelcomeScreen />;
  }
};

const QRPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const customUrl = searchParams.get('url');
  const baseUrl = customUrl || window.location.origin;
  
  return <QRCodeScreen url={baseUrl} />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <QuizProvider>
        <Routes>
          <Route path="/" element={<QuizApp />} />
          <Route path="/qr" element={<QRPage />} />
        </Routes>
      </QuizProvider>
    </BrowserRouter>
  );
};

export default App;
