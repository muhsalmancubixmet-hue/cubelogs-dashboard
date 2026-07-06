import { redirect } from 'next/navigation';

export default function LogoPage() {
  redirect('/admin/settings?tab=logo');
}
