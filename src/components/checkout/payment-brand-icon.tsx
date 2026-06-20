interface PaymentBrandIconProps {
  id: "gcash" | "maya" | "paypal" | "bank";
  className?: string;
}

/**
 * Real brand marks for supported payment methods, drawn as inline SVG so
 * there's no external asset/network dependency. Each is a simplified but
 * recognizable rendition of the official logo.
 */
export function PaymentBrandIcon({ id, className }: PaymentBrandIconProps) {
  switch (id) {
    case "gcash":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#0072CE" />
          <path
            d="M24 11c-7.18 0-13 5.82-13 13s5.82 13 13 13c5.06 0 9.45-2.9 11.58-7.12.3-.6-.12-1.3-.79-1.3h-9.45a1 1 0 0 0-1 1v2.3a1 1 0 0 0 1 1h4.36c-1.4 1.96-3.68 3.24-6.26 3.5a9.38 9.38 0 1 1 6.62-15.92 1 1 0 0 0 1.42 0l1.7-1.7a1 1 0 0 0 0-1.42A12.96 12.96 0 0 0 24 11Z"
            fill="white"
          />
        </svg>
      );
    case "maya":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#00D283" />
          <path
            d="M14 30.5 19.5 17h3.2l3.1 8.4 3.1-8.4h3.2L37.5 30.5h-3.6l-3.4-9.2-3 8.2h-2.8l-3-8.2-3.4 9.2H14Z"
            fill="white"
          />
        </svg>
      );
    case "paypal":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#003087" />
          <path
            d="M20.7 32.4h-3.4a.6.6 0 0 1-.6-.7l2.6-16.5a.9.9 0 0 1 .9-.7h6.5c3.4 0 5.6 1.7 5 5-.6 3.7-3.4 5.6-7 5.6h-2.4l-.7 4.6c-.1.4-.4.7-.9.7Z"
            fill="#009CDE"
          />
          <path
            d="M24.2 24.4h2.1c2 0 3.4-1 3.7-2.9.3-2-.9-2.9-2.8-2.9h-1.9l-1.1 5.8Z"
            fill="#003087"
          />
        </svg>
      );
    case "bank":
      return (
        <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="12" fill="#7C7CE0" />
          <path
            d="M24 12 12 18.5v1.7h24v-1.7L24 12Z"
            fill="white"
          />
          <path
            d="M14 22v9.5h3V22h-3Zm8.5 0v9.5h3V22h-3ZM31 22v9.5h3V22h-3Z"
            fill="white"
          />
          <path d="M12.5 33.5h23v2.2h-23v-2.2Z" fill="white" />
        </svg>
      );
  }
}