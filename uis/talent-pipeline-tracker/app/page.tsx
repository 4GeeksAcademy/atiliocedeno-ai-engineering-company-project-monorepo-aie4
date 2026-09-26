import { redirect } from "next/navigation";

export default function HomePage() {
  // The corporate HealthCore landing page is the static site in /public.
  // Talent Tracker remains available independently at /talents.
  redirect("/index.html");
}
