'use client';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const CinematicAuth = dynamic(() => import('@/components/experience/CinematicAuth'), {
  ssr: false,
  loading: () => <div style={{ background: '#060604', width: '100vw', height: '100vh' }} />,
});

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ background: '#060604', width: '100vw', height: '100vh' }} />}>
      <CinematicAuth />
    </Suspense>
  );
}
