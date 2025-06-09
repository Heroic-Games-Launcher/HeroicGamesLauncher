import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AlphabetFilter from './AlphabetFilter';

describe('AlphabetFilter Component', () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  test('renders all letter buttons (A-Z) and the # button', () => {
    render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} />);

    alphabet.forEach(letter => {
      expect(screen.getByRole('button', { name: letter })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '#' })).toBeInTheDocument();
  });

  test('clicking a letter button calls onFilterChange with the correct letter', () => {
    render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} />);

    const buttonB = screen.getByRole('button', { name: 'B' });
    fireEvent.click(buttonB);
    expect(mockOnFilterChange).toHaveBeenCalledWith('B');
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
  });

  test('clicking the # button calls onFilterChange with #', () => {
    render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} />);

    const buttonHash = screen.getByRole('button', { name: '#' });
    fireEvent.click(buttonHash);
    expect(mockOnFilterChange).toHaveBeenCalledWith('#');
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
  });

  test('clicking an active letter filter button calls onFilterChange with null', () => {
    render(<AlphabetFilter currentFilter="C" onFilterChange={mockOnFilterChange} />);

    const buttonC = screen.getByRole('button', { name: 'C' });
    fireEvent.click(buttonC);
    expect(mockOnFilterChange).toHaveBeenCalledWith(null);
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
  });

  test('clicking an active # filter button calls onFilterChange with null', () => {
    render(<AlphabetFilter currentFilter="#" onFilterChange={mockOnFilterChange} />);

    const buttonHash = screen.getByRole('button', { name: '#' });
    fireEvent.click(buttonHash);
    expect(mockOnFilterChange).toHaveBeenCalledWith(null);
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
  });

  test('the correct letter button has an active class/style when currentFilter is set', () => {
    const { rerender } = render(<AlphabetFilter currentFilter="D" onFilterChange={mockOnFilterChange} />);

    const buttonD = screen.getByRole('button', { name: 'D' });
    // Assuming 'alphabet-filter-button-active' is the class for active state
    expect(buttonD).toHaveClass('alphabet-filter-button-active');

    const buttonE = screen.getByRole('button', { name: 'E' });
    expect(buttonE).not.toHaveClass('alphabet-filter-button-active');

    // Test with '#'
    rerender(<AlphabetFilter currentFilter="#" onFilterChange={mockOnFilterChange} />);
    const buttonHash = screen.getByRole('button', { name: '#' });
    expect(buttonHash).toHaveClass('alphabet-filter-button-active');
  });

  test('no button has active class when currentFilter is null', () => {
    render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} />);

    alphabet.forEach(letter => {
      const button = screen.getByRole('button', { name: letter });
      expect(button).not.toHaveClass('alphabet-filter-button-active');
    });
    const buttonHash = screen.getByRole('button', { name: '#' });
    expect(buttonHash).not.toHaveClass('alphabet-filter-button-active');
  });
});
