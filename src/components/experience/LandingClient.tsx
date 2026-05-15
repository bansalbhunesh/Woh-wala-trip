'use client';
import dynamic from 'next/dynamic';

const CinematicLanding = dynamic(() => import('./CinematicLanding'), {
  ssr: false,
  loading: () => <div style={{ background: '#060604', width: '100vw', height: '100vh' }} />,
});

export default function LandingClient() {
  return <CinematicLanding />;
}
