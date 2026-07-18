import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-all focus:outline-none"
      title="Toggle Light/Dark Theme"
    >
      {theme === 'dark' ? (
        <FaSun className="text-lg text-amber-400 hover:rotate-45 transition-transform duration-300" />
      ) : (
        <FaMoon className="text-lg text-slate-600 hover:-rotate-12 transition-transform duration-300" />
      )}
    </button>
  );
};

export default ThemeToggle;
