import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { MeshGradientBackdrop } from "@/components/three/mesh-gradient-backdrop";
import { AuthShader } from "@/components/auth/auth-shader";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-background px-4 py-16 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <MeshGradientBackdrop />
      </div>

      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Home
          </Link>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-4xl rounded-2xl border border-border bg-card shadow-premium overflow-hidden flex">
        {/* Form side */}
        <div className="relative flex-1 p-8 sm:p-12">
          {children}
          <p className="relative z-10 mt-8 text-center text-xs text-muted-foreground">
            Protected by enterprise-grade encryption.
          </p>
        </div>

        {/* Brand side */}
        <div className="relative hidden lg:flex flex-1 flex-col items-center justify-center overflow-hidden">
          {/* Solid bg — light: warm cream, dark: near-black */}
          <div className="absolute inset-0 z-0 bg-[#f0ece3] dark:bg-[#0a0a0a]" />
          <AuthShader className="absolute inset-0 z-[1] h-full w-full" />
          <div className="relative z-10 flex flex-col items-center gap-5">
            <Logo showWord={false} href={null} className="[&_svg]:size-14" />
            <div className="flex flex-col items-center gap-2">
              <span
                style={{
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  fontSize: "1.75rem",
                  letterSpacing: "0.3em",
                  fontWeight: 500,
                }}
                className="uppercase text-[#1C1C1A] dark:text-white"
              >
                Solaris
              </span>
              <div className="flex items-center gap-3 w-full">
                <span className="flex-1 h-px bg-black/20 dark:bg-white/30" />
                <span
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "0.55rem",
                    letterSpacing: "0.45em",
                    fontWeight: 500,
                  }}
                  className="uppercase text-black/40 dark:text-white/50"
                >
                  Diamond
                </span>
                <span className="flex-1 h-px bg-black/20 dark:bg-white/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}