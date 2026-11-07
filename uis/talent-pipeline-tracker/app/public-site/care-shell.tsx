"use client";
import { useEffect, useRef, type HTMLAttributes } from "react";
import { initializeCareForm } from "./care-behavior";
export function CareShell({language, children, ...props}: HTMLAttributes<HTMLDivElement> & {language:"es"|"en"}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { if (root.current) return initializeCareForm(root.current, language); }, [language]);
  return <div {...props} ref={root}>{children}</div>;
}
