import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('renders the form with all four fields', () => {
    render(<NewTripPage />);
    // Labels are rendered (even if inputs use placeholder text)
    expect(screen.getByText('SEASON TITLE')).toBeInTheDocument();
    expect(screen.getByText('FILMING LOCATION')).toBeInTheDocument();
    expect(screen.getByText('PREMIERE DATE')).toBeInTheDocument();
    expect(screen.getByText('FINALE DATE')).toBeInTheDocument();
  });

  it('renders the submit button as disabled initially', () => {
    render(<NewTripPage />);
    const btn = screen.getByRole('button', { name: /LAUNCH THE SEASON/i });
    expect(btn).toBeDisabled();
  });

  it('enables submit button when name and dates are filled', async () => {
    const user = userEvent.setup();
    render(<NewTripPage />);

    const inputs = screen.getAllByRole('textbox');
    // name is first textbox
    await user.type(inputs[0], 'Kasol Trip');

    // date inputs (not textbox role — use type attribute)
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2024-03-15' } });
    fireEvent.change(dateInputs[1], { target: { value: '2024-03-17' } });

    const btn = screen.getByRole('button', { name: /LAUNCH THE SEASON/i });
    await waitFor(() => expect(btn).not.toBeDisabled());
  });

  it('calls createTrip.mutate with correct fields on submit', async () => {
    const user = userEvent.setup();
    render(<NewTripPage />);

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'Kasol Trip');
    await user.type(inputs[1], 'Himachal Pradesh');

    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2024-03-15' } });
    fireEvent.change(dateInputs[1], { target: { value: '2024-03-17' } });

    const btn = screen.getByRole('button', { name: /LAUNCH THE SEASON/i });
    await waitFor(() => expect(btn).not.toBeDisabled());
    await user.click(btn);

    expect(mockMutate).toHaveBeenCalledWith({
      name: 'Kasol Trip',
      destination: 'Himachal Pradesh',
      startDate: '2024-03-15',
      endDate: '2024-03-17',
    });
  });

  it('shows pending state while mutation is in flight', () => {
    (trpc.trips.create.useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      error: null,
    });
    render(<NewTripPage />);
    expect(screen.getByText(/CREATING/i)).toBeInTheDocument();
  });

  it('shows error message when mutation fails', () => {
    (trpc.trips.create.useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: { message: 'Could not create season: network error' },
    });
    render(<NewTripPage />);
    expect(screen.getByText(/Could not create season/i)).toBeInTheDocument();
  });

  it('does not call mutate if name is empty', async () => {
    const user = userEvent.setup();
    render(<NewTripPage />);

    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2024-03-15' } });
    fireEvent.change(dateInputs[1], { target: { value: '2024-03-17' } });

    const btn = screen.getByRole('button', { name: /LAUNCH THE SEASON/i });
    // Button is still disabled without name, so click should not fire
    await user.click(btn);
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
