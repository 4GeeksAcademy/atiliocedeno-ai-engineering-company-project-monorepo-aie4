import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  inverse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  ariaLabel?: string;
};

/** Shared HealthCore mark and wordmark, matching the sign-in screen. */
export default function BrandLogo({ href = "/", inverse = false, size = "md", className = "", ariaLabel = "HealthCore - Ir al inicio" }: BrandLogoProps) {
  const dimensions = {
    sm: { mark: "h-8 w-8 rounded-lg text-lg", wordmark: "text-lg" },
    md: { mark: "h-10 w-10 rounded-xl text-xl", wordmark: "text-xl" },
    lg: { mark: "h-12 w-12 rounded-2xl text-2xl", wordmark: "text-2xl" },
  }[size];

  return (
    <Link href={href} className={`inline-flex items-center gap-3 font-extrabold tracking-tight ${dimensions.wordmark} ${inverse ? "text-white" : "text-[#2563EB]"} ${className}`.trim()} aria-label={ariaLabel}>
      <span className={`grid shrink-0 place-items-center ${dimensions.mark} ${inverse ? "bg-white/15 text-white" : "bg-blue-50 text-blue-700"}`} aria-hidden="true">✚</span>
      <span>Health<span className={inverse ? "text-teal-200" : "text-teal-500"}>Core</span></span>
    </Link>
  );
}