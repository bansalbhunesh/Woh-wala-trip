import type { Metadata } from 'next';
import { DEMO_LORE, DEMO_MEMBERS } from '@/lib/demo-trip';
import DemoStoryClient from './DemoStoryClient';

export const metadata: Metadata = {
  title: 'Yaarlore Demo — Manali 2024',
  description:
    'See what Yaarlore does to your trip photos. Pre-generated lore for a Manali group trip — chaos scores, character cards, and cinematic storytelling.',
};

// No auth check. This page is intentionally public — that is the whole point.
export default function DemoPage() {
  return <DemoStoryClient lore={DEMO_LORE} members={DEMO_MEMBERS} />;
}
