import React from 'react';
import { useTheme } from '../context/ThemeContext';

function ThemeToggle() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={() => {
        console.log('Toggle theme clicked, current mode:', darkMode);
        toggleTheme();
        // Forcer la mise à jour du localStorage et du DOM
        setTimeout(() => {
          const isDark = document.documentElement.classList.contains('dark');
          console.log('Dark mode active after toggle:', isDark);
        }, 100);
      }}
      className="p-2 rounded-full hover:bg-gray-800 transition-all text-gray-300 hover:text-white"
      aria-label="Toggle theme"
    >
      {darkMode ? '☀️' : '🌙'}
    </button>
  );
}

export default ThemeToggle;
