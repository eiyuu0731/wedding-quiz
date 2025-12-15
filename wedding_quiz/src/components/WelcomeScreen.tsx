import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuiz } from '../context/QuizContext';
import { v4 as uuidv4 } from 'uuid';

const WelcomeScreen: React.FC = () => {
  const [name, setName] = useState('');
  const { setParticipant, addParticipant, setPhase } = useQuiz();

  const handleStart = () => {
    if (!name.trim()) return;
    
    const newParticipant = {
      id: uuidv4(),
      name: name.trim(),
      answers: [],
      startTime: Date.now(),
      correctCount: 0,
    };
    
    setParticipant(newParticipant);
    addParticipant(newParticipant);
    setPhase('quiz');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="glass-card p-8 md:p-12 max-w-lg w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="text-6xl mb-6"
        >
          💒
        </motion.div>
        
        <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-4">
          Wedding Quiz
        </h1>
        
        <p className="text-gray-300 mb-8 text-lg">
          新郎新婦についてのクイズに挑戦！<br />
          全問正解者にはプレゼントがあります✨
        </p>
        
        <div className="mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="お名前を入力してください"
            className="w-full px-6 py-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-primary text-center text-lg"
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          />
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleStart}
          disabled={!name.trim()}
          className="btn-primary w-full py-4 rounded-xl text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          クイズを始める
        </motion.button>
        
        <p className="text-gray-500 text-sm mt-6">
          全3問 • 回答時間も記録されます
        </p>
      </motion.div>
    </div>
  );
};

export default WelcomeScreen;
