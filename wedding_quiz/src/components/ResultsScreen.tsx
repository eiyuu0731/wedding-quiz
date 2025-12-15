import React from 'react';
import { motion } from 'framer-motion';
import { useQuiz } from '../context/QuizContext';
import { quizQuestions } from '../data/quizData';

const ResultsScreen: React.FC = () => {
  const { participant, getVotePercentages, setPhase, setRevealQuestion } = useQuiz();

  if (!participant) return null;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  const handleShowResults = () => {
    setRevealQuestion(0);
    setPhase('countdown');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="glass-card p-8 md:p-12 max-w-2xl w-full"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            className="text-6xl mb-4"
          >
            🎉
          </motion.div>
          <h2 className="text-3xl font-bold gradient-text mb-2">
            回答完了！
          </h2>
          <p className="text-gray-300">
            {participant.name}さん、ありがとうございました！
          </p>
        </div>

        {/* 回答サマリー */}
        <div className="bg-white/5 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-gray-400 text-sm mb-1">回答時間</p>
              <p className="text-2xl font-bold text-gold">
                {participant.totalTime ? formatTime(participant.totalTime) : '--'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">回答数</p>
              <p className="text-2xl font-bold text-primary">
                {participant.answers.length} / {quizQuestions.length}
              </p>
            </div>
          </div>
        </div>

        {/* 投票結果プレビュー */}
        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-semibold text-center mb-4">現在の投票状況</h3>
          {quizQuestions.map((question) => {
            const percentages = getVotePercentages(question.id);
            const userAnswer = participant.answers[question.id - 1];
            
            return (
              <div key={question.id} className="bg-white/5 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-3">Q{question.id}: {question.title}</p>
                <div className="space-y-2">
                  {question.options.map((option) => {
                    const percentage = percentages[option.id] || 0;
                    const isUserChoice = userAnswer === option.id;
                    
                    return (
                      <div key={option.id} className="relative">
                        <div className="flex justify-between text-sm mb-1">
                          <span className={isUserChoice ? 'text-gold font-medium' : 'text-gray-300'}>
                            {option.label} {isUserChoice && '(あなたの回答)'}
                          </span>
                          <span className="text-gray-400">{percentage}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className={`h-full rounded-full ${
                              isUserChoice 
                                ? 'bg-gradient-to-r from-gold to-yellow-400' 
                                : 'bg-gradient-to-r from-primary to-purple-400'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleShowResults}
          className="btn-primary w-full py-4 rounded-xl text-white font-bold text-lg pulse-glow"
        >
          正解発表を見る 🎊
        </motion.button>
      </motion.div>
    </div>
  );
};

export default ResultsScreen;
