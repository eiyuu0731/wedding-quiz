export interface QuizOption {
  id: string;
  label: string;
  color?: string;
}

export interface QuizQuestion {
  id: number;
  title: string;
  subtitle: string;
  options: QuizOption[];
  correctAnswer: string;
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    title: "カラードレスの色当て",
    subtitle: "新婦のカラードレスは何色でしょう？",
    options: [
      { id: "pink", label: "ピンク", color: "#FFB6C1" },
      { id: "blue", label: "ブルー", color: "#87CEEB" },
      { id: "green", label: "グリーン", color: "#98FB98" },
      { id: "purple", label: "パープル", color: "#DDA0DD" },
    ],
    correctAnswer: "pink", // デモ用のデフォルト正解
  },
  {
    id: 2,
    title: "2人の思い出の曲",
    subtitle: "2人の思い出の曲はどれでしょう？",
    options: [
      { id: "song1", label: "糸 / 中島みゆき" },
      { id: "song2", label: "Lemon / 米津玄師" },
      { id: "song3", label: "ハナミズキ / 一青窈" },
      { id: "song4", label: "家族になろうよ / 福山雅治" },
    ],
    correctAnswer: "song2", // デモ用のデフォルト正解
  },
  {
    id: 3,
    title: "2人の思い出の場所",
    subtitle: "2人の思い出の場所はどこでしょう？",
    options: [
      { id: "place1", label: "東京ディズニーランド" },
      { id: "place2", label: "沖縄" },
      { id: "place3", label: "京都" },
      { id: "place4", label: "北海道" },
    ],
    correctAnswer: "place2", // デモ用のデフォルト正解
  },
];

export interface Participant {
  id: string;
  name: string;
  answers: string[];
  startTime: number;
  endTime?: number;
  totalTime?: number;
  correctCount: number;
}
