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
  { href: "#features", label: "Features" },
  { href: "#how",      label: "How it works" },
  { href: "/explorer", label: "Explorer" },
  { href: "#verify",   label: "Verify" },
];

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);

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
        </div>
      </div>
    </motion.header>
  );
}
