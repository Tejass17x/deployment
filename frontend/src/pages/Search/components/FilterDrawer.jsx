import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, SlidersHorizontal } from 'lucide-react';
import FilterSidebar from './FilterSidebar';

export const FilterDrawerTrigger = ({ onClick, activeCount = 0 }) => (
  <button
    type="button"
    onClick={onClick}
    className="lg:hidden flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm font-semibold text-[#475569] shadow-sm"
  >
    <SlidersHorizontal className="w-4 h-4" style={{ color: '#2563EB' }} />
    Filters
    {activeCount > 0 && (
      <span className="bg-[#2563EB] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
        {activeCount}
      </span>
    )}
  </button>
);

const FilterDrawer = ({ open, onClose, ...sidebarProps }) => {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && open && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: reduce ? 0.01 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-0 bottom-0 w-full sm:w-[380px] bg-[#F8FAFC] p-4 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">Filters</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close filters"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E2E8F0] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <FilterSidebar {...sidebarProps} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FilterDrawer;
