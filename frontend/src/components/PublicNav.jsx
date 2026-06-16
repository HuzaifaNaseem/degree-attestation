/**
 * PublicNav — top navigation for unauthenticated marketing pages.
 * Logo + anchor links + Verify / Sign In actions. Becomes solid on scroll.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import ThemeToggle from "./ThemeToggle";
import Logo from "./Logo";

const LINKS = [
  { href: "/apply",    label: "Apply" },
  { href: "/student",  label: "Students" },
  { href: "/explorer", label: "Explorer" },
  { href: "/verify-degree", label: "Verify" },
];

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-bg/85 backdrop-blur-md border-b border-line-soft" : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/"><Logo size={32} textClass="text-fg text-sm" /></Link>

        {/* Center links */}
        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map(({ href, label }) =>
            href.startsWith("/") ? (
              <Link key={href} to={href} className="text-sm text-muted hover:text-fg transition-colors">
                {label}
              </Link>
            ) : (
              <a key={href} href={href} className="text-sm text-muted hover:text-fg transition-colors">
                {label}
              </a>
            )
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ThemeToggle compact />
          </div>
          <Link
            to="/login"
            className="text-sm font-semibold bg-accent text-accent-fg px-4 py-2 rounded-xl hover:opacity-90 transition-colors shadow-lg shadow-accent/20"
          >
            Sign In
          </Link>
          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu"
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-fg hover:bg-fg/5 transition-colors">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" d={menuOpen ? "M6 6l12 12M6 18L18 6" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-line-soft bg-bg/95 backdrop-blur-md">
          <nav className="max-w-6xl mx-auto px-6 py-3 flex flex-col">
            {LINKS.map(({ href, label }) => (
              <Link key={href} to={href} onClick={() => setMenuOpen(false)}
                className="py-2.5 text-sm font-medium text-muted hover:text-fg border-b border-line-soft last:border-0">
                {label}
              </Link>
            ))}
            <div className="pt-3 sm:hidden"><ThemeToggle compact /></div>
          </nav>
        </div>
      )}
    </motion.header>
  );
}
