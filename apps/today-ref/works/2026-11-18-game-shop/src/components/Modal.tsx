import { motion } from "motion/react";
import { useEffect, type ReactNode } from "react";

export function Modal({ label, onClose, children, wide = false }: { label: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`w-full rounded-3xl border border-line bg-panel shadow-2xl ${wide ? "max-w-3xl" : "max-w-md"}`}
        initial={{ y: 24, scale: 0.97, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
