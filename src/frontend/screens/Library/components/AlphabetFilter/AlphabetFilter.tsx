import React from 'react';
import './index.css'; // Import the CSS file

interface AlphabetFilterProps {
  currentFilter: string | null;
  onFilterChange: (filter: string | null) => void;
}

const AlphabetFilter: React.FC<AlphabetFilterProps> = ({ currentFilter, onFilterChange }) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const symbols = ['#']; // Using '#' for '0-9' as per suggestion

  const getButtonClassName = (value: string) => {
    let className = 'alphabet-filter-button';
    if (value === currentFilter) {
      className += ' alphabet-filter-button-active';
    }
    if (value === '#') {
      className += ' alphabet-filter-symbol'; // Add specific class for symbol if needed
    }
    return className;
  };

  const handleClick = (value: string) => {
    if (value === currentFilter) {
      onFilterChange(null);
    } else {
      onFilterChange(value);
    }
  };

  return (
    <div className="alphabet-filter-container">
      {alphabet.map((letter) => (
        <button
          key={letter}
          onClick={() => handleClick(letter)}
          className={getButtonClassName(letter)}
        >
          {letter}
        </button>
      ))}
      {symbols.map((symbol) => (
        <button
          key={symbol}
          onClick={() => handleClick(symbol)}
          className={getButtonClassName(symbol)}
        >
          {symbol}
        </button>
      ))}
    </div>
  );
};

export default AlphabetFilter;
