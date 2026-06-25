import { clsx, type ClassValue } from "clsx";

export function cn(...values: ClassValue[]) {
  return clsx(values);
}

export function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value || 0);
}

export function percent(value: number) {
  return `${(value || 0).toFixed(1)}%`;
}

export function number(value: number, digits = 2) {
  return (value || 0).toFixed(digits);
}

export function shortDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}
