import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { quizQuestions, type Participant } from '../data/quizData';

interface VoteResult {
  questionId: number;
  votes: { [optionId: string]: number };
}

interface QuizContextType {
  currentQuestion: number;
  setCurrentQuestion: (q: number) => void;
  participant: Participant | null;
  setParticipant: (p: Participant | null) => void;
  participants: Participant[];
  addParticipant: (p: Participant) => void;
  updateParticipant: (id: string, updates: Partial<Participant>) => void;
  voteResults: VoteResult[];
  addVote: (questionId: number, optionId: string) => void;
  getVotePercentages: (questionId: number) => { [optionId: string]: number };
  phase: 'welcome' | 'quiz' | 'results' | 'countdown' | 'reveal' | 'ranking';
  setPhase: (p: 'welcome' | 'quiz' | 'results' | 'countdown' | 'reveal' | 'ranking') => void;
  revealQuestion: number;
  setRevealQuestion: (q: number) => void;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [voteResults, setVoteResults] = useState<VoteResult[]>(
    quizQuestions.map(q => ({
      questionId: q.id,
      votes: q.options.reduce((acc, opt) => ({ ...acc, [opt.id]: 0 }), {}),
    }))
  );
  const [phase, setPhase] = useState<'welcome' | 'quiz' | 'results' | 'countdown' | 'reveal' | 'ranking'>('welcome');
  const [revealQuestion, setRevealQuestion] = useState(0);

  const addParticipant = useCallback((p: Participant) => {
    setParticipants(prev => [...prev, p]);
  }, []);

  const updateParticipant = useCallback((id: string, updates: Partial<Participant>) => {
    setParticipants(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p))
    );
    if (participant?.id === id) {
      setParticipant(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [participant]);

  const addVote = useCallback((questionId: number, optionId: string) => {
    setVoteResults(prev =>
      prev.map(vr =>
        vr.questionId === questionId
          ? { ...vr, votes: { ...vr.votes, [optionId]: (vr.votes[optionId] || 0) + 1 } }
          : vr
      )
    );
  }, []);

  const getVotePercentages = useCallback((questionId: number) => {
    const result = voteResults.find(vr => vr.questionId === questionId);
    if (!result) return {};
    
    const totalVotes = Object.values(result.votes).reduce((sum, v) => sum + v, 0);
    if (totalVotes === 0) return result.votes;
    
    return Object.entries(result.votes).reduce((acc, [key, value]) => {
      acc[key] = Math.round((value / totalVotes) * 100);
      return acc;
    }, {} as { [key: string]: number });
  }, [voteResults]);

  return (
    <QuizContext.Provider
      value={{
        currentQuestion,
        setCurrentQuestion,
        participant,
        setParticipant,
        participants,
        addParticipant,
        updateParticipant,
        voteResults,
        addVote,
        getVotePercentages,
        phase,
        setPhase,
        revealQuestion,
        setRevealQuestion,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within a QuizProvider');
  }
  return context;
};
