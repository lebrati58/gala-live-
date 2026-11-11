import '@fontsource/heebo/500.css';
import '@fontsource/heebo/700.css';
import '@fontsource/heebo/800.css';
import '@fontsource/heebo/900.css';
import './quiz.css';

// Police Heebo embarquée dans le site (lisible en hébreu comme en français, même
// choix que Moreh Derech) : aucun appel externe, utile si le Wi-Fi de la salle est faible.
export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
