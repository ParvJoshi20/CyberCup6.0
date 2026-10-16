import type { ButtonHTMLAttributes } from "react";

export function Button({ className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" }) {
  return <button className={`button button-${variant} ${className}`.trim()} {...props} />;
}
