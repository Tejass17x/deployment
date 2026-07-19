import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Search } from 'lucide-react';
import { fadeUp, fadeIn } from './animations';

const PHRASES = [
  "MILLIONS OF PUBLICATIONS",
  "TOP GLOBAL RESEARCHERS",
  "INNOVATIVE PROJECTS",
  "YOUR NEXT COLLABORATION",
  "GROUNDBREAKING RESEARCH"
];

const Hero = ({ children }) => {
  const reduce = useReducedMotion();
  const [text, setText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (reduce) {
      setText(PHRASES[0]);
      return;
    }

    const currentPhrase = PHRASES[phraseIndex];
    let timeout;

    if (isDeleting) {
      timeout = setTimeout(() => {
        setText(currentPhrase.substring(0, text.length - 1));
        if (text.length === 0) {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
        }
      }, 40); // Deleting speed
    } else {
      timeout = setTimeout(() => {
        setText(currentPhrase.substring(0, text.length + 1));
        if (text.length === currentPhrase.length) {
          setTimeout(() => setIsDeleting(true), 2500); // Pause before deleting
        }
      }, 70); // Typing speed
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIndex, reduce]);

  return (
    <div className="pt-6 pb-2 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-4">
        <motion.div
          variants={fadeIn(reduce, 0.1)}
          initial="hidden"
          animate="show"
          className="flex flex-wrap items-center gap-4 text-slate-900"
        >
          {/* Square Search Icon with Tilt Animation */}
          <motion.div 
            className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20"
            animate={{ rotate: [-4, 4, -4] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <Search className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
          </motion.div>
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 flex flex-wrap items-center gap-3 uppercase">
            DISCOVER
            <span className="text-blue-600 relative" aria-live="polite">
              {text}
              <span
                className="absolute -right-2 sm:-right-3 top-1 sm:top-2 bottom-1 sm:bottom-2 w-[4px] sm:w-[5px] bg-blue-600 rounded-full"
                style={{ animation: 'gs-blink 1s step-start infinite' }}
                aria-hidden
              />
            </span>
          </h1>
        </motion.div>
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
};

export default Hero;
