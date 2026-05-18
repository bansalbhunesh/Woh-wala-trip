import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock heavy dependencies before importing the component
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    trips: {
      create: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
          error: null,
        })),
      },
    },
  },
}));

vi.mock('@/lib/analytics', () => ({
  analytics: {
    tripCreated: vi.fn(),
  },
}));

import NewTripPage from '@/app/trips/new/page';
import { trpc } from '@/lib/trpc/client';

describe('NewTripPage', () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (trpc.trips.create.useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    });
  });

  const runWizard = async (
    user: ReturnType<typeof userEvent.setup>,
    name: string,
    destination: string,
    startDate: string,
    endDate: string
  ) => {
    // Step 0: Welcome
    const startBtn = screen.getByRole('button', { name: /INITIATE ARCHIVE LOGS/i });
    await user.click(startBtn);

    // Step 1: Title
    const titleInput = await screen.findByRole('textbox');
    await user.type(titleInput, name);
    const continue1 = screen.getByRole('button', { name: /CONTINUE/i });
    await user.click(continue1);

    // Wait for Step 1 input to fade out
    await waitForElementToBeRemoved(titleInput);

    // Step 2: Destination
    const destInput = await screen.findByRole('textbox');
    await user.type(destInput, destination);
    const continue2 = screen.getByRole('button', { name: /CONTINUE/i });
    await user.click(continue2);

    // Wait for Step 2 input to fade out
    await waitForElementToBeRemoved(destInput);

    // Step 3: Start Date
    await screen.findByText('When did the descent start?');
    const startInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: startDate } });
    const continue3 = screen.getByRole('button', { name: /CONTINUE/i });
    await user.click(continue3);

    // Wait for Step 3 input to fade out
    await waitForElementToBeRemoved(startInput);

    // Step 4: End Date
    await screen.findByText('When did the curtain fall?');
    const endInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(endInput, { target: { value: endDate } });
    const continue4 = screen.getByRole('button', { name: /REVIEW DETAILS/i });
    await user.click(continue4);

    // Wait for Step 5 to load
    await screen.findByText('Confirm Dossier Details');
  };

  it('renders the initial welcome state', () => {
    render(<NewTripPage />);
    expect(screen.getByText('LORE SYSTEM INITIALIZATION')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /INITIATE ARCHIVE LOGS/i })).toBeInTheDocument();
  });

  it('progresses through all steps to review summary', async () => {
    const user = userEvent.setup();
    render(<NewTripPage />);

    await runWizard(user, 'Kasol Trip', 'Himachal Pradesh', '2024-03-15', '2024-03-17');

    // Step 5: Summary
    expect(screen.getByText('SEASON TITLE')).toBeInTheDocument();
    expect(screen.getByText('LOCATION')).toBeInTheDocument();
    expect(screen.getByText('PREMIERE DATE')).toBeInTheDocument();
    expect(screen.getByText('FINALE DATE')).toBeInTheDocument();
    expect(screen.getByText('Kasol Trip')).toBeInTheDocument();
    expect(screen.getByText('Himachal Pradesh')).toBeInTheDocument();
    expect(screen.getByText('2024-03-15')).toBeInTheDocument();
    expect(screen.getByText('2024-03-17')).toBeInTheDocument();
  });

  it('calls createTrip.mutate with correct fields on launch click', async () => {
    const user = userEvent.setup();
    render(<NewTripPage />);

    await runWizard(user, 'Kasol Trip', 'Himachal Pradesh', '2024-03-15', '2024-03-17');

    const launchBtn = screen.getByRole('button', { name: /LAUNCH THE SAGA/i });
    await user.click(launchBtn);

    expect(mockMutate).toHaveBeenCalledWith({
      name: 'Kasol Trip',
      destination: 'Himachal Pradesh',
      startDate: '2024-03-15',
      endDate: '2024-03-17',
    });
  });

  it('shows pending state while mutation is in flight', async () => {
    (trpc.trips.create.useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      error: null,
    });
    const user = userEvent.setup();
    render(<NewTripPage />);

    await runWizard(user, 'Kasol Trip', 'Himachal Pradesh', '2024-03-15', '2024-03-17');

    expect(screen.getByText(/CREATING PORTAL.../i)).toBeInTheDocument();
  });

  it('shows error message when mutation fails', async () => {
    (trpc.trips.create.useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: { message: 'Could not create season: network error' },
    });
    const user = userEvent.setup();
    render(<NewTripPage />);

    await runWizard(user, 'Kasol Trip', 'Himachal Pradesh', '2024-03-15', '2024-03-17');

    expect(screen.getByText(/Could not create season: network error/i)).toBeInTheDocument();
  });
});
