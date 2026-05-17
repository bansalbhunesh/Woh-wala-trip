import type { Meta, StoryObj } from '@storybook/react';
import { CinematicText, AtmosphericBlob, FilmGrain, LightGrain } from './atoms';

// ── CinematicText ──────────────────────────────────────────────────────────

const textMeta: Meta<typeof CinematicText> = {
  title: 'UI/CinematicText',
  component: CinematicText,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'dark' },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['heading', 'data', 'eyebrow', 'italic'],
    },
  },
};

export default textMeta;
type TextStory = StoryObj<typeof CinematicText>;

export const Heading: TextStory = {
  args: {
    variant: 'heading',
    children: 'PEAK DELUSION',
  },
};

export const Data: TextStory = {
  args: {
    variant: 'data',
    children: 'CHAOS SCORE: 77',
  },
};

export const Eyebrow: TextStory = {
  args: {
    variant: 'eyebrow',
    children: 'SEASON 2024',
  },
};

export const Italic: TextStory = {
  args: {
    variant: 'italic',
    children: '"We planned a trek. We found a cafe."',
  },
};

export const AllVariants: TextStory = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 32, color: 'white' }}>
      <CinematicText variant="eyebrow">KASOL ARCHIVE · MARCH 2024</CinematicText>
      <CinematicText variant="heading" className="text-5xl">
        PEAK DELUSION
      </CinematicText>
      <CinematicText variant="italic" className="text-2xl">
        "We planned a trek. We found a cafe."
      </CinematicText>
      <CinematicText variant="data" className="text-sm">
        CHAOS SCORE: 77 · TREKKERS WHO FORGOT TO TREK
      </CinematicText>
    </div>
  ),
};
