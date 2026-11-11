import { redirect } from 'next/navigation';
import { adminAuthorized } from '@/lib/auth';
import QuizAdmin from './panel';

export const dynamic = 'force-dynamic';
export default function Page() {
  if (!adminAuthorized()) redirect('/admin/login');
  return <QuizAdmin />;
}
