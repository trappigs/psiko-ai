import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CaseCard } from '@/components/case/CaseCard';

describe('CaseCard', () => {
  it('renders title, presenting, and difficulty badge', () => {
    render(
      <CaseCard
        id="c1"
        title="Sınav kaygısı"
        presenting="Son 2 aydır uyku problemi..."
        difficulty="medium"
      />
    );
    expect(screen.getByText('Sınav kaygısı')).toBeInTheDocument();
    expect(screen.getByText(/uyku problemi/)).toBeInTheDocument();
    expect(screen.getByText(/orta/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /seansa başla/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('c1'));
  });
});
