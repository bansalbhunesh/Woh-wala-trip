import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    trips: {
      joinByCode: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
          error: null,
        })),
      },
    },
  },
}));

vi.mock('@/components/experience/CinematicShell', () => ({
  CinematicShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// JoinContent is the named component inside the file; use default export via page.tsx
// We test the behavior by rendering the Suspense boundary which renders JoinContent
import JoinTripPage from '@/app/trips/join/page';
import { trpc } from '@/lib/trpc/client';

describe('JoinTripPage (JoinContent)', () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (trpc.trips.joinByCode.useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
    });
  });

  it('renders the code input', async () => {
    render(<JoinTripPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('TRIPCODE')).toBeInTheDocument();
    });
  });

  it('renders the access button as disabled initially', async () => {
    render(<JoinTripPage />);
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /ACCESS ARCHIVE/i });
      expect(btn).toBeDisabled();
    });
  });

  it('converts input to uppercase', async () => {
    const user = userEvent.setup();
    render(<JoinTripPage />);
    const input = await screen.findByPlaceholderText('TRIPCODE');
    await user.type(input, 'abc123');
    expect((input as HTMLInputElement).value).toBe('ABC123');
  });

  it('caps input at 8 characters', async () => {
    const user = userEvent.setup();
    render(<JoinTripPage />);
    const input = await screen.findByPlaceholderText('TRIPCODE');
    await user.type(input, 'ABCDEFGHI'); // 9 chars
    expect((input as HTMLInputElement).value.length).toBeLessThanOrEqual(8);
  });

  it('enables button when code has ≥4 chars', async () => {
    const user = userEvent.setup();
    render(<JoinTripPage />);
    const input = await screen.findByPlaceholderText('TRIPCODE');
    await user.type(input, 'ABCD');
    const btn = screen.getByRole('button', { name: /ACCESS ARCHIVE/i });
    await waitFor(() => expect(btn).not.toBeDisabled());
  });

  it('calls mutate with trimmed uppercase code on button click', async () => {
    const user = userEvent.setup();
    render(<JoinTripPage />);
    const input = await screen.findByPlaceholderText('TRIPCODE');
    await user.type(input, 'kasol1');
    const btn = screen.getByRole('button', { name: /ACCESS ARCHIVE/i });
    await waitFor(() => expect(btn).not.toBeDisabled());
    await user.click(btn);
    expect(mockMutate).toHaveBeenCalledWith({ inviteCode: 'KASOL1' });
  });

  it('calls mutate on Enter keydown when code ≥4 chars', async () => {
    const user = userEvent.setup();
    render(<JoinTripPage />);
    const input = await screen.findByPlaceholderText('TRIPCODE');
    await user.type(input, 'ABCD1234');
    await user.keyboard('{Enter}');
    expect(mockMutate).toHaveBeenCalled();
  });

  it('shows DECRYPTING state while pending', async () => {
    (trpc.trips.joinByCode.useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      error: null,
    });
    render(<JoinTripPage />);
    await waitFor(() => {
      expect(screen.getByText(/DECRYPTING/i)).toBeInTheDocument();
    });
  });

  it('shows error message on failure', async () => {
    (trpc.trips.joinByCode.useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: { message: 'Yaar this code is literally not working (invalid or expired).' },
    });
    render(<JoinTripPage />);
    await waitFor(() => {
      expect(screen.getByText(/invalid or expired/i)).toBeInTheDocument();
    });
  });
});
