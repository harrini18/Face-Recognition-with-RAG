import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HiMoon, HiSun } from 'react-icons/hi';

const ThemeToggle = () => {
  // Since we're always using dark theme in this app, this is just for UI display purposes
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
    // In a real app, you would apply the theme change here
  };

  return (
    <motion.button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-full bg-slate-800/50 backdrop-blur-md border border-slate-700/50 flex items-center justify-center"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {isDark ? <HiSun className="text-yellow-400" /> : <HiMoon className="text-slate-400" />}
    </motion.button>
  );
};

export default ThemeToggle;