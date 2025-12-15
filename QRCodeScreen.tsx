import React from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeScreenProps {
  url: string;
}

const QRCodeScreen: React.FC<QRCodeScreenProps> = ({ url }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-dark via-primary-dark/20 to-dark">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 md:p-12 max-w-lg w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="text-5xl mb-6"
        >
          💒✨
        </motion.div>
        
        <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-4">
          Wedding Quiz
        </h1>
        
        <p className="text-gray-300 mb-8 text-lg">
          QRコードを読み取って<br />
          クイズに参加しよう！
        </p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-2xl inline-block mb-8"
        >
          <QRCodeSVG
            value={url}
            size={200}
            level="H"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#1a1a2e"
          />
        </motion.div>
        
        <div className="space-y-2 text-gray-400">
          <p className="text-sm">全3問のクイズに挑戦！</p>
          <p className="text-sm">全問正解者にはプレゼントがあります🎁</p>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-xs text-gray-500">
            {url}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default QRCodeScreen;
