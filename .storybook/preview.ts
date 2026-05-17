import type { Preview } from '@storybook/react';
import '../src/app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#060604' },
        { name: 'cream', value: 'oklch(97% 0.008 70)' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
};

export default preview;
