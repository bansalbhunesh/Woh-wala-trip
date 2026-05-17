import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CinematicText, FilmGrain, LightGrain } from '@/components/ui/atoms';

// framer-motion needs to be mocked since jsdom lacks layout APIs
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      style,
    }: {
      children?: React.ReactNode;
      className?: string;
      style?: React.CSSProperties;
    }) => (
      <div className={className} style={style}>
        {children}
      </div>
    ),
  },
}));

describe('CinematicText', () => {
  it('renders children', () => {
    render(<CinematicText>Hello World</CinematicText>);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('applies heading variant classes by default', () => {
    render(<CinematicText>Test</CinematicText>);
    const el = screen.getByText('Test');
    expect(el.className).toContain('font-display');
    expect(el.className).toContain('uppercase');
  });

  it('applies data variant classes', () => {
    render(<CinematicText variant="data">Score</CinematicText>);
    const el = screen.getByText('Score');
    expect(el.className).toContain('font-ui');
    expect(el.className).toContain('tracking-[0.2em]');
  });

  it('applies eyebrow variant classes', () => {
    render(<CinematicText variant="eyebrow">LABEL</CinematicText>);
    const el = screen.getByText('LABEL');
    expect(el.className).toContain('tracking-[0.4em]');
    expect(el.className).toContain('text-[9px]');
  });

  it('applies italic variant classes', () => {
    render(<CinematicText variant="italic">Note</CinematicText>);
    const el = screen.getByText('Note');
    expect(el.className).toContain('italic');
    expect(el.className).toContain('font-display');
  });

  it('merges custom className', () => {
    render(<CinematicText className="text-red-500">Custom</CinematicText>);
    const el = screen.getByText('Custom');
    expect(el.className).toContain('text-red-500');
  });

  it('renders React node children', () => {
    render(
      <CinematicText>
        <span data-testid="inner">nested</span>
      </CinematicText>
    );
    expect(screen.getByTestId('inner')).toBeInTheDocument();
  });
});

describe('FilmGrain', () => {
  it('renders a div with film-grain class', () => {
    const { container } = render(<FilmGrain />);
    expect(container.firstChild).toHaveClass('film-grain');
  });
});

describe('LightGrain', () => {
  it('renders a div with light-grain class', () => {
    const { container } = render(<LightGrain />);
    expect(container.firstChild).toHaveClass('light-grain');
  });
});
