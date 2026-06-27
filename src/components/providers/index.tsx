"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { useTheme } from "next-themes";
import { ThemeProvider } from "./theme-provider";
import { QueryProvider } from "./query-provider";
import { SessionProvider } from "@/lib/auth/hooks";
import { ScrollProgress } from "@/components/motion/scroll-progress";

function AppToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="bottom-right"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      richColors
      closeButton
      expand
      toastOptions={{
        duration: 5000,
        classNames: {
          toast:
            "!rounded-xl !border !shadow-premium !bg-card !text-foreground !border-border",
          title: "!font-semibold !text-foreground",
          description: "!text-muted-foreground",
          actionButton:
            "!bg-accent !text-accent-foreground hover:!bg-accent/90",
          cancelButton: "!bg-secondary !text-foreground",
          success:
            "!bg-card !text-foreground !border-success/40 [&_[data-icon]]:!text-success",
          error:
            "!bg-card !text-foreground !border-destructive/50 [&_[data-icon]]:!text-destructive",
          warning:
            "!bg-card !text-foreground !border-warning/50 [&_[data-icon]]:!text-warning",
          info: "!bg-card !text-foreground !border-accent/50 [&_[data-icon]]:!text-accent",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        <SessionProvider>
          <ScrollProgress />
          {children}
          <AppToaster />
        </SessionProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
