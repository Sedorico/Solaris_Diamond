interface PaymentBrandIconProps {
  id: "gcash" | "maya" | "paypal" | "bank";
  className?: string;
}

const SANS = "'Helvetica Neue',Arial,sans-serif";

/**
 * Recognizable brand marks for supported payment methods, drawn as inline SVG
 * (no external asset/network dependency). Each mirrors the brand's real
 * presentation: GCash's blue "G", the lowercase "maya" wordmark, PayPal's
 * two-tone double-P monogram, and a neutral bank glyph.
 */
export function PaymentBrandIcon({ id, className }: PaymentBrandIconProps) {
  switch (id) {
    case "gcash":
      return (
        <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gcash-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#159AF0" />
              <stop offset="100%" stopColor="#0061D3" />
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="12" fill="url(#gcash-bg)" />
          {/* GCash coin-style "G" */}
          <path
            d="M24 12.5a11.5 11.5 0 1 0 10.4 16.4 1 1 0 0 0-.9-1.43H25.6a1 1 0 0 0-1 1v1.7a1 1 0 0 0 1 1h3.1A7.2 7.2 0 1 1 29 18.2a1 1 0 0 0 1.36-.13l1.27-1.5a1 1 0 0 0-.12-1.4A11.45 11.45 0 0 0 24 12.5Z"
            fill="#fff"
          />
        </svg>
      );
    case "maya":
      return (
        <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#00B85C" />
          <text
            x="24"
            y="30"
            textAnchor="middle"
            fontFamily={SANS}
            fontWeight="700"
            fontSize="15"
            letterSpacing="0.3"
            fill="#fff"
          >
            maya
          </text>
        </svg>
      );
    case "paypal":
      return (
        <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#ffffff" />
          {/* Back P (dark blue) — italic, overlapping: PayPal's double-P mark */}
          <text x="15" y="36" textAnchor="middle" fontStyle="italic" fontFamily={SANS} fontWeight="800" fontSize="32" fill="#253B80">
            P
          </text>
          {/* Front P (light blue) */}
          <text x="28" y="36" textAnchor="middle" fontStyle="italic" fontFamily={SANS} fontWeight="800" fontSize="32" fill="#179BD7">
            P
          </text>
        </svg>
      );
    case "bank":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#3D5A80" />
          <path d="M24 12 12 18.5v1.7h24v-1.7L24 12Z" fill="white" />
          <path d="M14 22v9.5h3V22h-3Zm8.5 0v9.5h3V22h-3ZM31 22v9.5h3V22h-3Z" fill="white" />
          <path d="M12.5 33.5h23v2.2h-23v-2.2Z" fill="white" />
        </svg>
      );
  }
}
