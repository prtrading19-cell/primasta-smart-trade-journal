interface ConfidenceBadgeProps {
  confidence: number;
}

function getConfidenceColor(c: number): string {
  if (c >= 70) return "text-profit";
  if (c >= 40) return "text-gold";
  return "text-loss";
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  return (
    <span className={`text-xs font-medium ${getConfidenceColor(confidence)}`}>
      {confidence}%
    </span>
  );
}
