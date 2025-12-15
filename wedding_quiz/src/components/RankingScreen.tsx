import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuiz } from '../context/QuizContext';
import { quizQuestions } from '../data/quizData';

const RankingScreen: React.FC = () => {
  const { participants, participant, setPhase, setCurrentQuestion, setRevealQuestion } = useQuiz();

  // 全問正解者をタイム順にソート
  const perfectScorers = useMemo(() => {
    return participants
      .filter(p => p.correctCount === quizQuestions.length && p.totalTime)
      .sort((a, b) => (a.totalTime || 0) - (b.totalTime || 0));
  }, [participants]);

  const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(2);
    return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `${rank}`;
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setRevealQuestion(0);
    setPhase('welcome');
  };

  const isCurrentUserPerfect = participant && participant.correctCount === quizQuestions.length;
  const currentUserRank = perfectScorers.findIndex(p => p.id === participant?.id) + 1;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 md:p-12 max-w-2xl w-full"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-6xl mb-4"
          >
            🏆
          </motion.div>
          <h2 className="text-3xl font-bold gradient-text mb-2">
            全問正解者ランキング
          </h2>
          <p className="text-gray-400">
            回答時間が短い順にランキング！
          </p>
        </div>

        {/* 現在のユーザーの結果 */}
        {participant && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 p-6 rounded-xl ${
              isCurrentUserPerfect
                ? 'bg-gradient-to-r from-gold/20 to-yellow-500/20 border border-gold/50'
                : 'bg-white/5'
            }`}
          >
            <div className="text-center">
              <p className="text-gray-400 mb-2">あなたの結果</p>
              <p className="text-2xl font-bold mb-2">
                {participant.name}さん
              </p>
              <div className="flex justify-center gap-8">
                <div>
                  <p className="text-gray-400 text-sm">正解数</p>
                  <p className={`text-2xl font-bold ${
                    isCurrentUserPerfect ? 'text-gold' : 'text-primary'
                  }`}>
                    {participant.correctCount} / {quizQuestions.length}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">タイム</p>
                  <p className="text-2xl font-bold text-white">
                    {participant.totalTime ? formatTime(participant.totalTime) : '--'}
                  </p>
                </div>
              </div>
              {isCurrentUserPerfect && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4"
                >
                  <span className="text-4xl">{getRankEmoji(currentUserRank)}</span>
                  <p className="text-gold font-bold mt-2">
                    全問正解おめでとうございます！🎊
                  </p>
                  <p className="text-sm text-gray-400">
                    プレゼントをお受け取りください！
                  </p>
                </motion.div>
              )}
              {!isCurrentUserPerfect && (
                <p className="mt-4 text-gray-400">
                  惜しい！また挑戦してください！
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* ランキングリスト */}
        {perfectScorers.length > 0 ? (
          <div className="space-y-3 mb-8">
            <h3 className="text-lg font-semibold text-center mb-4">
              🎉 全問正解者 🎉
            </h3>
            {perfectScorers.map((scorer, index) => {
              const isCurrentUser = scorer.id === participant?.id;
              const rank = index + 1;
              
              return (
                <motion.div
                  key={scorer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    isCurrentUser
                      ? 'bg-gold/20 border border-gold/50'
                      : 'bg-white/5'
                  } ${rank <= 3 ? 'border border-white/20' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl w-10 text-center">
                      {getRankEmoji(rank)}
                    </span>
                    <div>
                      <p className={`font-medium ${isCurrentUser ? 'text-gold' : 'text-white'}`}>
                        {scorer.name}
                        {isCurrentUser && <span className="ml-2 text-xs">(あなた)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      rank === 1 ? 'text-gold' : 
                      rank === 2 ? 'text-gray-300' : 
                      rank === 3 ? 'text-amber-600' : 'text-gray-400'
                    }`}>
                      {formatTime(scorer.totalTime || 0)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 mb-8">
            <p className="text-gray-400">まだ全問正解者はいません</p>
          </div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRestart}
          className="btn-primary w-full py-4 rounded-xl text-white font-bold text-lg"
        >
          もう一度挑戦する
        </motion.button>
      </motion.div>
    </div>
  );
};

export default RankingScreen;
