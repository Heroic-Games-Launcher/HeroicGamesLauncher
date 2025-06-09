import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AlphabetFilter from './AlphabetFilter';
import { GameInfo } from 'common/types'; // 1. Import GameInfo

// Helper to create mock GameInfo objects
const createMockGame = (title: string): GameInfo => ({
  title,
  app_name: title.toLowerCase().replace(/\s/g, '_'),
  runner: 'steam', // Default runner, can be changed if needed for specific tests
  // Add other GameInfo properties if they become relevant for filtering/display
  // For AlphabetFilter, only 'title' is currently used.
} as GameInfo); // Cast as GameInfo to satisfy type, fill in more props if needed by component

// 2. Mock allGames Data
const mockGamesAllLetters: GameInfo[] = [
  createMockGame('Apple Game'),
  createMockGame('Banana Fun'),
  createMockGame('Cherry Chase'),
  createMockGame('123 Blast'),
  createMockGame('Zebra Zoom'),
];

const mockGamesSpecificLetters: GameInfo[] = [
  createMockGame('Avalanche'),
  createMockGame('Anthem'),
  createMockGame('2048 Blocks'),
];

const mockGamesOnlyNumbers: GameInfo[] = [
  createMockGame('7 Days to Die'),
  createMockGame('198X'),
];

const mockGamesEmpty: GameInfo[] = [];

const mockGamesNullTitles: GameInfo[] = [
  createMockGame('Valid Game'),
  { app_name: 'no_title_game', runner: 'gog' } as GameInfo, // Game with no title
  createMockGame('Another Valid Game')
];


describe('AlphabetFilter Component', () => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const mockOnFilterChange = jest.fn();
  const disabledClass = 'alphabet-filter-button--disabled';
  const activeClass = 'alphabet-filter-button--active';

  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  test('renders all letter buttons (A-Z) and the # button', () => {
    // This test should still pass, rendering is independent of game list for button existence
    render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} allGames={mockGamesEmpty} />);
    alphabet.forEach(letter => {
      expect(screen.getByRole('button', { name: letter })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '#' })).toBeInTheDocument();
  });

  // 3. Update Existing Tests
  test('clicking an enabled letter button calls onFilterChange with the correct letter', () => {
    render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} allGames={mockGamesAllLetters} />);
    const buttonB = screen.getByRole('button', { name: 'B' }); // 'Banana Fun'
    expect(buttonB).not.toHaveClass(disabledClass);
    expect(buttonB).toBeEnabled();
    fireEvent.click(buttonB);
    expect(mockOnFilterChange).toHaveBeenCalledWith('B');
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
  });

  test('clicking an enabled # button calls onFilterChange with #', () => {
    render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} allGames={mockGamesAllLetters} />);
    const buttonHash = screen.getByRole('button', { name: '#' }); // '123 Blast'
    expect(buttonHash).not.toHaveClass(disabledClass);
    expect(buttonHash).toBeEnabled();
    fireEvent.click(buttonHash);
    expect(mockOnFilterChange).toHaveBeenCalledWith('#');
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
  });

  test('clicking an active (and enabled) letter filter button calls onFilterChange with null', () => {
    render(<AlphabetFilter currentFilter="C" onFilterChange={mockOnFilterChange} allGames={mockGamesAllLetters} />);
    const buttonC = screen.getByRole('button', { name: 'C' }); // 'Cherry Chase'
    expect(buttonC).toHaveClass(activeClass);
    expect(buttonC).toBeEnabled();
    fireEvent.click(buttonC);
    expect(mockOnFilterChange).toHaveBeenCalledWith(null);
  });

  test('clicking an active (and enabled) # filter button calls onFilterChange with null', () => {
    render(<AlphabetFilter currentFilter="#" onFilterChange={mockOnFilterChange} allGames={mockGamesAllLetters} />);
    const buttonHash = screen.getByRole('button', { name: '#' }); // '123 Blast'
    expect(buttonHash).toHaveClass(activeClass);
    expect(buttonHash).toBeEnabled();
    fireEvent.click(buttonHash);
    expect(mockOnFilterChange).toHaveBeenCalledWith(null);
  });

  test('the correct enabled button has an active class when currentFilter is set', () => {
    render(<AlphabetFilter currentFilter="A" onFilterChange={mockOnFilterChange} allGames={mockGamesSpecificLetters} />);
    const buttonA = screen.getByRole('button', { name: 'A' });
    expect(buttonA).toHaveClass(activeClass);
    expect(buttonA).toBeEnabled();

    const buttonHash = screen.getByRole('button', { name: '#' }); // From '2048 Blocks'
    expect(buttonHash).not.toHaveClass(activeClass);
    expect(buttonHash).toBeEnabled(); // Should be enabled
  });

  test('no button has active class when currentFilter is null (even if some are disabled)', () => {
    render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} allGames={mockGamesSpecificLetters} />);
    alphabet.forEach(letter => {
      const button = screen.getByRole('button', { name: letter });
      expect(button).not.toHaveClass(activeClass);
    });
    expect(screen.getByRole('button', { name: '#' })).not.toHaveClass(activeClass);
  });

  // 4. Add New Test Cases
  describe('Button Disabled States', () => {
    test('buttons are disabled if no games start with that letter/number', () => {
      render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} allGames={mockGamesSpecificLetters} />);
      // mockGamesSpecificLetters has 'A' and '#' (from '2048 Blocks')
      const buttonA = screen.getByRole('button', { name: 'A' });
      expect(buttonA).toBeEnabled();
      expect(buttonA).not.toHaveClass(disabledClass);

      const buttonHash = screen.getByRole('button', { name: '#' });
      expect(buttonHash).toBeEnabled();
      expect(buttonHash).not.toHaveClass(disabledClass);

      const buttonB = screen.getByRole('button', { name: 'B' });
      expect(buttonB).toBeDisabled();
      expect(buttonB).toHaveClass(disabledClass);

      const buttonZ = screen.getByRole('button', { name: 'Z' });
      expect(buttonZ).toBeDisabled();
      expect(buttonZ).toHaveClass(disabledClass);
    });

    test('# button is disabled if no games start with numbers', () => {
      const gamesNoNumbers = [createMockGame("Alpha"), createMockGame("Beta")];
      render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} allGames={gamesNoNumbers} />);
      const buttonHash = screen.getByRole('button', { name: '#' });
      expect(buttonHash).toBeDisabled();
      expect(buttonHash).toHaveClass(disabledClass);
    });

    test('clicking a disabled button does not call onFilterChange', () => {
      render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} allGames={mockGamesSpecificLetters} />);
      const buttonZ = screen.getByRole('button', { name: 'Z' }); // Disabled
      expect(buttonZ).toBeDisabled();
      fireEvent.click(buttonZ);
      expect(mockOnFilterChange).not.toHaveBeenCalled();
    });

    test('all letter and # buttons are enabled when games cover all categories', () => {
      const comprehensiveGames = [
        ...alphabet.map(char => createMockGame(`${char} Game`)),
        createMockGame('1 Number Game')
      ];
      render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} allGames={comprehensiveGames} />);
      alphabet.forEach(letter => {
        const button = screen.getByRole('button', { name: letter });
        expect(button).toBeEnabled();
        expect(button).not.toHaveClass(disabledClass);
      });
      const buttonHash = screen.getByRole('button', { name: '#' });
      expect(buttonHash).toBeEnabled();
      expect(buttonHash).not.toHaveClass(disabledClass);
    });

    test('all letter and # buttons are disabled with an empty game list', () => {
      render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} allGames={mockGamesEmpty} />);
      alphabet.forEach(letter => {
        const button = screen.getByRole('button', { name: letter });
        expect(button).toBeDisabled();
        expect(button).toHaveClass(disabledClass);
      });
      const buttonHash = screen.getByRole('button', { name: '#' });
      expect(buttonHash).toBeDisabled();
      expect(buttonHash).toHaveClass(disabledClass);
    });

    test('handles games with null or undefined titles gracefully for availableChars', () => {
      render(<AlphabetFilter currentFilter={null} onFilterChange={mockOnFilterChange} allGames={mockGamesNullTitles} />);
      // 'Valid Game' -> V, 'Another Valid Game' -> A
      expect(screen.getByRole('button', { name: 'V' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'A' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'N' })).toBeDisabled(); // No game starting with N
    });


    test('active button is correctly styled and enabled, others are disabled/enabled as appropriate', () => {
      const games = [createMockGame("Apple"), createMockGame("Ant"), createMockGame("Cherry")];
      render(<AlphabetFilter currentFilter="A" onFilterChange={mockOnFilterChange} allGames={games} />);

      const buttonA = screen.getByRole('button', { name: 'A' });
      expect(buttonA).toHaveClass(activeClass);
      expect(buttonA).toBeEnabled();
      expect(buttonA).not.toHaveClass(disabledClass);

      const buttonC = screen.getByRole('button', { name: 'C' });
      expect(buttonC).not.toHaveClass(activeClass);
      expect(buttonC).toBeEnabled(); // Cherry game exists
      expect(buttonC).not.toHaveClass(disabledClass);

      const buttonB = screen.getByRole('button', { name: 'B' });
      expect(buttonB).not.toHaveClass(activeClass);
      expect(buttonB).toBeDisabled(); // No B game
      expect(buttonB).toHaveClass(disabledClass);
    });
  });
});

[end of src/frontend/screens/Library/components/AlphabetFilter/AlphabetFilter.test.tsx]
