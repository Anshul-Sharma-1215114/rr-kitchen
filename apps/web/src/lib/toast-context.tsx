"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import Link from "next/link";

interface Toast {
  id: number;
  message: string;
  href?: string;
}

interface ToastContextValue {
  notify: (message: string, href?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, href?: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, href }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-full bg-charcoal px-4 py-2 text-sm text-cream-50 shadow-lg"
          >
            {t.href ? (
              <Link href={t.href} className="underline">
                {t.message}
              </Link>
            ) : (
              <span>{t.message}</span>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
