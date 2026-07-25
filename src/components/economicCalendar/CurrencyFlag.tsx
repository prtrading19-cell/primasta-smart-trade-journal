import { cn } from "@/lib/format";
import { CURRENCY_MAP } from "@/types/economicCalendar";

interface CurrencyFlagProps {
  currency: string;
  size?: "sm" | "md";
}

const SIZE_CLASSES = {
  sm: "text-xs gap-1",
  md: "text-sm gap-1.5",
};

export function CurrencyFlag({ currency, size = "md" }: CurrencyFlagProps) {
  const info = CURRENCY_MAP[currency];

  return (
    <span className={cn("inline-flex items-center font-medium text-text-primary", SIZE_CLASSES[size])}>
      {info?.flag && <span className="leading-none">{info.flag}</span>}
      <span>{currency}</span>
    </span>
  );
}
