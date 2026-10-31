"use client";
import { useEffect, useId, useRef, type InputHTMLAttributes } from "react";
import { phoneError } from "../auth/phone";
import { useLanguage } from "./language-context";
export function PhoneInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null), id = useId();
  const {language} = useLanguage();
  const error = phoneError(String(props.value ?? ""), language);
  useEffect(() => { ref.current?.setCustomValidity(error); }, [error]);
  return <><input {...props} ref={ref} type="tel" inputMode="tel" aria-invalid={!!error} aria-describedby={error ? id : undefined} />
    {error && <span id={id} role="alert" className="text-sm text-red-700">{error}</span>}</>;
}
