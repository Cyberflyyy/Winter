"use client";

import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: number;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

/** Na desktopie: wyśrodkowany dialog. Na telefonie: bottom sheet z przeciąganiem w dół. */
export function Modal({ open, onClose, title, children, width = 460 }: Props) {
  const mobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const controls = useDragControls();
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/65 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full overflow-hidden border border-white/10 bg-[oklch(17.5%_0_0)] shadow-2xl max-sm:max-h-[92dvh] max-sm:rounded-t-[1.75rem] sm:rounded-[1.5rem]"
            style={{ maxWidth: mobile ? undefined : width }}
            initial={mobile ? { y: "100%" } : { opacity: 0, scale: 0.94, y: 8 }}
            animate={mobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={mobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 6 }}
            transition={mobile ? { type: "spring", damping: 30, stiffness: 320 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            drag={mobile ? "y" : false}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div className="touch-none" onPointerDown={(e) => mobile && controls.start(e)}>
              {mobile && <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-white/15" />}
              <div className="flex items-center justify-between px-5 pb-1 pt-4 sm:px-6 sm:pt-5">
                <h2 className="title text-lg">{title}</h2>
                <button onClick={onClose} onPointerDown={(e) => e.stopPropagation()} className="btn-ghost h-9 w-9" aria-label="Close">
                <X size={16} />
                </button>
              </div>
            </div>
            <div className="max-h-[78dvh] overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
