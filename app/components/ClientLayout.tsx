'use client';

import { useEffect } from 'react';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    import('flowbite').then((flowbite) => {
      flowbite.initFlowbite();
    });
  }, []);

  return <>{children}</>;
} 