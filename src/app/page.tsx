"use client";

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with window/iframe
const AppShell = dynamic(() => import('@/components/AppShell'), { ssr: false });

export default function Home() {
  return (
    <main>
      <AppShell />
    </main>
  );
}
