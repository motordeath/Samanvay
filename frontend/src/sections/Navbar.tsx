import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('samanvay_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('samanvay_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 max-w-[1280px] mx-auto"
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="font-headline text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Samanvay
        </span>
      </div>

      {/* Links - Hidden on mobile */}
      <div className="hidden md:flex items-center gap-8 px-8 py-3 rounded-2xl bg-[var(--color-surface)]/80 backdrop-blur-md border border-[var(--color-border)] shadow-sm">
        {['Platform', 'Impact', 'Network', 'Stories'].map((item) => (
          <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-300">
            {item}
          </a>
        ))}
      </div>

      {/* CTA */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors p-2 cursor-pointer"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        <Button variant="ghost" onClick={() => navigate('/login')} className="hidden sm:inline-flex text-sm py-2 px-5 cursor-pointer text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] border border-transparent">
          Sign In
        </Button>
        <Button variant="secondary" onClick={() => navigate('/signup')} className="hidden sm:inline-flex text-sm py-2 px-5 cursor-pointer bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] border-transparent">
          Get Started
        </Button>
      </div>
    </motion.nav>
  );
};
