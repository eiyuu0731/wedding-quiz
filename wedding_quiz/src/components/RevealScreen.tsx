import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuiz } from '../context/QuizContext';
import { quizQuestions } from '../data/quizData';

const RevealScreen: React.FC = () => {
  const { revealQuestion, setRevealQuestion, getVotePercentages, setPhase, participant } = useQuiz();
  const [showAnswer, setShowAnswer] = useState(false);
  
  const question = quizQuestions[revealQuestion];

  useEffect(() => {
    const timer = setTimeout(() => setShowAnswer(true), 1500);
    return () => clearTimeout(timer);
  }, [revealQuestion]);

  if (!question) return null;

  const percentages = getVotePercentages(question.id);
  const correctOption = question.options.find(o => o.id === question.correctAnswer);
  const userAnswer = participant?.answers[revealQuestion];
  const isCorrect = userAnswer === question.correctAnswer;

  const handleNext = () => {
    setShowAnswer(false);
    if (revealQuestion < quizQuestions.length - 1) {
      setRevealQuestion(revealQuestion + 1);
      setPhase('countdown');
    } else {
      setPhase('ranking');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 md:p-12 max-w-2xl w-full"
      >
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-4">
            Q{question.id} 正解発表
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {question.title}
          </h2>
          <p className="text-gray-400">{question.subtitle}</p>
        </div>

        {/* 投票結果 */}
        <div className="space-y-4 mb-8">
          {question.options.map((option, index) => {
            const percentage = percentages[option.id] || 0;
            const isCorrectAnswer = option.id === question.correctAnswer;
            const isUserChoice = userAnswer === option.id;
            
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-xl p-4 ${
                  showAnswer && isCorrectAnswer
                    ? 'bg-green-500/20 border-2 border-green-400'
                    : 'bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {option.color && (
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white/30"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className={`font-medium ${
                      showAnswer && isCorrectAnswer ? 'text-green-400' : 'text-white'
                    }`}>
                      {option.label}
                    </span>
                    {isUserChoice && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gold/20 text-gold">
                        あなた
                      </span>
                    )}
                    {showAnswer && isCorrectAnswer && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-2xl"
                      >
                        ✨
                      </motion.span>
                    )}
                  </div>
                  <span className="text-gray-400">{percentage}%</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className={`h-full rounded-full ${
                      showAnswer && isCorrectAnswer
                        ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                        : 'bg-gradient-to-r from-primary to-purple-400'
                    }`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 正解表示 */}
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className={`inline-block px-6 py-3 rounded-xl ${
              isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <span className="text-2xl mr-2">{isCorrect ? '⭕' : '❌'}</span>
              <span className="font-bold">
                {isCorrect ? '正解！' : '不正解...'}
              </span>
            </div>
            <p className="mt-4 text-lg">
              正解は <span className="text-green-400 font-bold">{correctOption?.label}</span> でした！
            </p>
          </motion.div>
        )}

        {showAnswer && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className="btn-primary w-full py-4 rounded-xl text-white font-bold text-lg"
          >
            {revealQuestion < quizQuestions.length - 1 ? '次の正解発表へ' : 'ランキングを見る 🏆'}
          </motion.button>
        )}
      </motion.div>
    </div>
  );
};

export default RevealScreen;
