import {
  createContext, useCallback, useContext, useState, type ReactNode,
} from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastKind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: ToastKind; message: string }
interface ToastCtx { toast: (message: string, kind?: ToastKind) => void }
const Ctx = createContext<ToastCtx>({ toast: () => {} });

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++counter;
    setToasts(t => [...t, { id, kind, message }].slice(-3));
    window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-900/95 px-4 py-3 text-sm font-medium text-ink-50 shadow-2xl backdrop-blur"
            >
              {t.kind === 'success' && <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-jade-400" />}
              {t.kind === 'error' && <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-400" />}
              {t.kind === 'info' && <Info size={18} className="mt-0.5 shrink-0 text-brass-400" />}
              <span className="flex-1">{t.message}</span>
              <button onClick={() => setToasts(x => x.filter(y => y.id !== t.id))} className="text-ink-400 hover:text-white" aria-label="Dismiss">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Keep the context hook beside its provider.
export function useToast() {
  return useContext(Ctx);
}
