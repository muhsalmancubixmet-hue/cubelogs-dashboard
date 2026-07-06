'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LocationsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/settings?tab=locations');
  }, [router]);

  return null;
}
