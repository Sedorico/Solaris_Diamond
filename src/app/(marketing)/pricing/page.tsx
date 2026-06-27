import { redirect } from "next/navigation";

// Pricing has been replaced by the Payment page; the detailed per-service plans
// now live on /services. Forward any old links there so nothing 404s.
export default function PricingPage() {
  redirect("/services");
}
