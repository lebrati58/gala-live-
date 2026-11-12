export type Lang = 'fr' | 'he';

export const categories: Record<string, { fr: string; he: string; emoji: string }> = {
  ei_israel: { fr: "EI d'Israël", he: 'EI ישראל', emoji: '🇮🇱' },
  eeif: { fr: 'EEIF — France', he: 'EEIF — צרפת', emoji: '🇫🇷' },
  scoutisme: { fr: 'Scoutisme', he: 'צופיות', emoji: '⛺' },
  israel: { fr: "Histoire d'Israël", he: 'ההיסטוריה של ישראל', emoji: '📜' },
};

export const t = {
  fr: {
    title: 'Le grand quiz du gala',
    subtitle: 'EI, scoutisme et histoire d’Israël',
    chooseLang: 'Choisissez votre langue',
    nickname: 'Votre prénom ou pseudo',
    table: 'Numéro de votre table',
    join: 'Je joue !',
    joining: 'Connexion…',
    closed: 'Le quiz n’a pas encore commencé. Restez sur cette page, il va bientôt démarrer !',
    waitingStart: 'Vous êtes inscrit ! Le quiz va commencer…',
    waitingNext: 'Prochaine question dans un instant…',
    question: 'Question',
    of: 'sur',
    secondsLeft: 's',
    answered: 'Réponse enregistrée !',
    answeredHint: 'On attend les autres joueurs…',
    timeUp: 'Temps écoulé !',
    correct: 'Bonne réponse !',
    wrong: 'Pas cette fois…',
    noAnswer: 'Pas de réponse',
    goodAnswerWas: 'La bonne réponse :',
    points: 'points',
    score: 'Score',
    myTable: 'Table',
    tableRank: 'Classement de votre table',
    finished: 'Merci d’avoir joué !',
    finalScore: 'Votre score final',
    leaderboard: 'Classement des tables',
    avg: 'pts / joueur',
    players: 'joueurs',
    source: 'Source',
    switchLang: 'עברית',
    errors: {
      nickname: 'Indiquez un prénom (30 caractères max).',
      table: 'Indiquez un numéro de table entre 1 et 500.',
      closed: 'Le quiz n’est pas ouvert pour le moment.',
      full: 'Le quiz est complet.',
      network: 'Connexion difficile… on réessaie.',
      generic: 'Une erreur est survenue, réessayez.',
    },
    changePlayer: 'Changer de joueur',
    presence: 'Présence dans la salle',
    warmupBadge: 'Échauffement · pour le plaisir',
    warmupSeniors: 'facile pour les anciens 👴',
    warmupJuniors: 'facile pour les jeunes 🧒',
    warmupNoPoints: 'Les questions d’échauffement ne comptent pas dans le score.',
    warmupAt: 'L’échauffement démarre à',
    gameAt: 'Le grand jeu démarre à',
    warmupDone: 'Échauffement terminé ! Le grand jeu arrive…',
    inviteFriends: 'Faites scanner vos voisins de table !',
  },
  he: {
    title: 'החידון הגדול של הגאלה',
    subtitle: 'EI, צופיות וההיסטוריה של ישראל',
    chooseLang: 'בחרו שפה',
    nickname: 'השם או הכינוי שלכם',
    table: 'מספר השולחן שלכם',
    join: 'אני משחק/ת!',
    joining: 'מתחברים…',
    closed: 'החידון עוד לא התחיל. הישארו בעמוד הזה, הוא יתחיל בקרוב!',
    waitingStart: 'נרשמתם! החידון עומד להתחיל…',
    waitingNext: 'השאלה הבאה תכף מגיעה…',
    question: 'שאלה',
    of: 'מתוך',
    secondsLeft: 'שנ׳',
    answered: 'התשובה נקלטה!',
    answeredHint: 'מחכים לשאר השחקנים…',
    timeUp: 'נגמר הזמן!',
    correct: 'תשובה נכונה!',
    wrong: 'לא הפעם…',
    noAnswer: 'לא נשלחה תשובה',
    goodAnswerWas: 'התשובה הנכונה:',
    points: 'נקודות',
    score: 'ניקוד',
    myTable: 'שולחן',
    tableRank: 'המיקום של השולחן שלכם',
    finished: 'תודה ששיחקתם!',
    finalScore: 'הניקוד הסופי שלכם',
    leaderboard: 'דירוג השולחנות',
    avg: 'נק׳ לשחקן',
    players: 'שחקנים',
    source: 'מקור',
    switchLang: 'Français',
    errors: {
      nickname: 'נא לכתוב שם (עד 30 תווים).',
      table: 'נא לכתוב מספר שולחן בין 1 ל-500.',
      closed: 'החידון אינו פתוח כרגע.',
      full: 'החידון מלא.',
      network: 'החיבור קשה… מנסים שוב.',
      generic: 'אירעה שגיאה, נסו שוב.',
    },
    changePlayer: 'החלפת שחקן',
    presence: 'נוכחות באולם',
    warmupBadge: 'חימום · בשביל הכיף',
    warmupSeniors: 'קל לוותיקים 👴',
    warmupJuniors: 'קל לצעירים 🧒',
    warmupNoPoints: 'שאלות החימום לא נספרות בניקוד.',
    warmupAt: 'החימום מתחיל ב-',
    gameAt: 'המשחק הגדול מתחיל ב-',
    warmupDone: 'החימום הסתיים! המשחק הגדול מתקרב…',
    inviteFriends: 'בקשו מהשכנים לשולחן לסרוק גם הם!',
  },
} as const;

// Formes + couleurs façon jeu télé : reconnaissables même sans lire.
export const answerStyles = [
  { shape: '▲', bg: '#c0392b', label: 'A' },
  { shape: '◆', bg: '#1d5fc4', label: 'B' },
  { shape: '●', bg: '#a85c00', label: 'C' },
  { shape: '■', bg: '#1e7d47', label: 'D' },
];

export type QuizQuestion = {
  id: string; category: string; question_fr: string; question_he: string;
  options_fr: string[]; options_he: string[]; time_limit_s: number; warmup: 'seniors' | 'juniors' | null;
};
export type TableRow = { table_number: number; players: number; total: number; avg_points: number };
export type QuizState = {
  status: 'idle' | 'lobby' | 'question' | 'reveal' | 'finished';
  run_id: string | null; index: number; total: number; server_now: string; players: number;
  expected_players: number; warmup_start_pct: number; game_start_pct: number; auto_start: boolean;
  next_is_warmup: boolean; warmups: number; updated_at: string;
  question?: QuizQuestion; started_at?: string; deadline?: string; answers?: number;
  reveal?: { correct_index: number; explanation_fr: string; explanation_he: string; source_label: string; source_url: string; distribution: number[] };
  tables?: TableRow[];
  player?: null | { id: string; nickname: string; table_number: number; score: number; answered: number; choice?: number; correct?: boolean; points?: number; table_rank?: number };
};
