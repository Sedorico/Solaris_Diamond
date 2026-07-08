"use client";

import { useState } from "react";
import { LoginScreen } from "./login-screen";
import { EmployeeDashboard } from "./employee-dashboard";

export function PortalApp({
  slug,
  businessName,
  logoUrl,
  initialAuthed,
}: {
  slug: string;
  businessName: string;
  logoUrl: string | null;
  initialAuthed: boolean;
}) {
  const [authed, setAuthed] = useState(initialAuthed);

  if (authed) {
    return (
      <EmployeeDashboard
        slug={slug}
        businessName={businessName}
        logoUrl={logoUrl}
        onLogout={() => setAuthed(false)}
      />
    );
  }
  return (
    <LoginScreen
      slug={slug}
      businessName={businessName}
      logoUrl={logoUrl}
      onSignedIn={() => setAuthed(true)}
    />
  );
}
