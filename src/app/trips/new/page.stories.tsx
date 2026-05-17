import type { Meta, StoryObj } from '@storybook/react';
import NewTripPage from './page';

const meta: Meta<typeof NewTripPage> = {
  title: 'Pages/NewTrip',
  component: NewTripPage,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'cream' },
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/trips/new',
        push: () => undefined,
        back: () => undefined,
      },
    },
  },
  decorators: [
    Story => {
      // Provide mocked tRPC context
      const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
      const qc = new QueryClient();
      return (
        <QueryClientProvider client={qc}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof NewTripPage>;

export const Default: Story = {};

export const WithError: Story = {
  parameters: {
    mockData: {
      'trips.create': {
        error: { message: 'Could not create season: database unavailable' },
      },
    },
  },
};
