"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Delete, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { apiGet, apiSend, PinRequiredError } from "@/lib/pos/client";
import type { PosPinStatusDTO } from "@/lib/pos/types";

/**
 * Admin PIN gate for the POS. The server is the real boundary (protected
 * routes answer 403 PIN_REQUIRED); this context keeps the UI in sync, shows
 * the keypad dialog, and retries the failed call after a successful unlock.
 */

interface PinContextValue {
  status: PosPinStatusDTO | null;
  refreshStatus: () => Promise<void>;
  /** Resolves true once admin access is available (prompting if needed). */
  ensureUnlocked: () => Promise<boolean>;
  /** Runs `fn`; when it hits a PIN wall, prompts and retries once. */
  guard: <T>(fn: () => Promise<T>) => Promise<T>;
  lockNow: () => Promise<void>;
}

const PinContext = createContext<PinContextValue | null>(null);

export function usePinGate(): PinContextValue {
  const ctx = useContext(PinContext);
  if (!ctx) throw new Error("usePinGate must be used inside PinProvider");
  return ctx;
}

export function PinProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<PosPinStatusDTO | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await apiGet<PosPinStatusDTO>("/api/pos/pin"));
    } catch {
      /* transient — leave previous status */
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const ensureUnlocked = useCallback(async (): Promise<boolean> => {
    const current = await apiGet<PosPinStatusDTO>("/api/pos/pin").catch(() => null);
    if (current) setStatus(current);
    if (current?.unlocked) return true;
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialogOpen(true);
    });
  }, []);

  const guard = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (e) {
        if (!(e instanceof PinRequiredError)) throw e;
        setStatus((s) => (s ? { ...s, unlocked: false } : s));
        const ok = await ensureUnlocked();
        if (!ok) throw e;
        return fn();
      }
    },
    [ensureUnlocked],
  );

  const lockNow = useCallback(async () => {
    await apiSend("/api/pos/pin", "DELETE");
    setStatus((s) => (s ? { ...s, unlocked: !s.pinRequired || !s.pinSet } : s));
    toast.success("Admin areas locked");
  }, []);

  const settle = (ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
  };

  return (
    <PinContext.Provider
      value={{ status, refreshStatus, ensureUnlocked, guard, lockNow }}
    >
      {children}
      <PinDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) settle(false);
        }}
        onVerified={() => {
          setStatus((s) => (s ? { ...s, unlocked: true } : s));
          setDialogOpen(false);
          settle(true);
        }}
      />
    </PinContext.Provider>
  );
}

// --- Keypad dialog -------------------------------------------------------------

const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

function PinDialog({
  open,
  onOpenChange,
  onVerified,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onVerified: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setPin("");
      setError(false);
      setBusy(false);
    }
  }, [open]);

  const submit = useCallback(
    async (candidate: string) => {
      if (busy || candidate.length < 4) return;
      setBusy(true);
      try {
        await apiSend("/api/pos/pin", "POST", { pin: candidate });
        onVerified();
      } catch {
        setError(true);
        setPin("");
        setBusy(false);
      }
    },
    [busy, onVerified],
  );

  const press = (key: string) => {
    setError(false);
    if (key === "⌫") return setPin((p) => p.slice(0, -1));
    if (!key || pin.length >= 8) return;
    setPin((p) => p + key);
  };

  // Physical keyboard support.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("⌫");
      else if (e.key === "Enter") submit(pin);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pin, submit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-accent" /> Admin PIN
          </DialogTitle>
          <DialogDescription>
            Enter the admin PIN to unlock protected areas for 15 minutes.
          </DialogDescription>
        </DialogHeader>

        {/* PIN dots */}
        <div
          className={cn(
            "flex items-center justify-center gap-3 py-3",
            error && "animate-[shake_0.35s_ease-in-out]",
          )}
        >
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-3.5 rounded-full border transition-all duration-150",
                i < pin.length
                  ? "scale-110 border-accent bg-accent"
                  : "border-border bg-secondary",
              )}
            />
          ))}
        </div>
        {error && (
          <p className="-mt-2 text-center text-xs text-destructive">
            Incorrect PIN. Try again.
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {KEYPAD.map((key, i) =>
            key === "" ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                disabled={busy}
                onClick={() => press(key)}
                className={cn(
                  "h-14 rounded-xl border border-border bg-card text-lg font-medium transition-all",
                  "hover:border-foreground/25 hover:bg-secondary/60 active:scale-95",
                  "disabled:opacity-50",
                )}
              >
                {key === "⌫" ? <Delete className="mx-auto size-5" /> : key}
              </button>
            ),
          )}
        </div>

        <Button
          variant="accent"
          size="lg"
          className="w-full"
          disabled={pin.length < 4 || busy}
          onClick={() => submit(pin)}
        >
          {busy ? "Verifying…" : "Unlock"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// --- Locked panel ----------------------------------------------------------------

export function LockedPanel({
  title,
  description,
  onUnlocked,
}: {
  title: string;
  description: string;
  onUnlocked: () => void;
}) {
  const { ensureUnlocked } = usePinGate();
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-border bg-secondary">
        <Lock className="size-7 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      <Button
        variant="accent"
        onClick={async () => {
          if (await ensureUnlocked()) onUnlocked();
        }}
      >
        <ShieldCheck className="size-4" /> Unlock with PIN
      </Button>
    </div>
  );
}
