import { headers } from "next/headers";
import type { ReactNode } from "react";
import PrivateNavigation from "./private-navigation";
import "./private-layout.css";

export default async function PrivateLayout({ children }: { children: ReactNode }) {
  const isAdmin = (await headers()).get("x-healthcore-role") === "admin";
  return <div className="private-layout">
    <PrivateNavigation isAdmin={isAdmin} />
    <div className="private-content">{children}</div>
  </div>;
}
