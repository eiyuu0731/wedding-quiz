import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuiz } from '../context/QuizContext';
import { quizQuestions } from '../data/quizData';

const CountdownScreen: React.FC = () => {
  const [count, setCount] = useState(3);
  const { revealQuestion, setPhase } = useQuiz();
  
  const question = quizQuestions[revealQuestion];

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setPhase('reveal'), 500);
      return () => clearTimeout(timer);
    }
  }, [count, setPhase]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl text-gray-300 mb-4"
        >
          Q{revealQuestion + 1}: {question?.title}
        </motion.p>
        
        <p className="text-2xl text-gold mb-8">正解発表まで...</p>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={count}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="countdown-number"
          >
            {count > 0 ? count : '🎉'}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default CountdownScreen;
