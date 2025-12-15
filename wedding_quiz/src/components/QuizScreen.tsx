import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuiz } from '../context/QuizContext';
import { quizQuestions } from '../data/quizData';

const QuizScreen: React.FC = () => {
  const { 
    currentQuestion, 
    setCurrentQuestion, 
    participant, 
    updateParticipant, 
    addVote,
    setPhase 
  } = useQuiz();
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const question = quizQuestions[currentQuestion];
  
  if (!question || !participant) return null;

  const handleOptionSelect = (optionId: string) => {
    if (isSubmitting) return;
    setSelectedOption(optionId);
  };

  const handleSubmit = () => {
    if (!selectedOption || isSubmitting) return;
    
    setIsSubmitting(true);
    
    // 回答を記録
    const newAnswers = [...participant.answers, selectedOption];
    const isCorrect = selectedOption === question.correctAnswer;
    const newCorrectCount = participant.correctCount + (isCorrect ? 1 : 0);
    
    // 投票を追加
    addVote(question.id, selectedOption);
    
    // 参加者情報を更新
    updateParticipant(participant.id, {
      answers: newAnswers,
      correctCount: newCorrectCount,
    });
    
    setTimeout(() => {
      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedOption(null);
        setIsSubmitting(false);
      } else {
        // 最後の問題の場合、終了時間を記録
        const endTime = Date.now();
        const totalTime = endTime - participant.startTime;
        updateParticipant(participant.id, {
          endTime,
          totalTime,
        });
        setPhase('results');
      }
    }, 500);
  };

  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* プログレスバー */}
      <div className="w-full max-w-2xl mx-auto mb-8">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Question {currentQuestion + 1} / {quizQuestions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="progress-bar h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* クイズカード */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="glass-card p-6 md:p-10 max-w-2xl w-full"
          >
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-4">
                Q{question.id}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold gradient-text mb-3">
                {question.title}
              </h2>
              <p className="text-gray-300 text-lg">
                {question.subtitle}
              </p>
            </div>

            {/* 選択肢 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {question.options.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleOptionSelect(option.id)}
                  className={`option-card p-5 rounded-xl text-left ${
                    selectedOption === option.id ? 'selected' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {option.color && (
                      <div
                        className="w-10 h-10 rounded-full border-2 border-white/30"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className="text-lg font-medium">{option.label}</span>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* 送信ボタン */}
            <motion.button
              whileHover={{ scale: selectedOption ? 1.02 : 1 }}
              whileTap={{ scale: selectedOption ? 0.98 : 1 }}
              onClick={handleSubmit}
              disabled={!selectedOption || isSubmitting}
              className="btn-primary w-full py-4 rounded-xl text-white font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentQuestion < quizQuestions.length - 1 ? '次の問題へ' : '結果を見る'}
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizScreen;
