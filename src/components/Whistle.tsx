// Referee whistle icon. lucide-react has no whistle, so this is a hand-rolled
// icon following lucide's conventions (24px viewBox, currentColor stroke, round
// caps) and sized via a `className` like `size-3`, same as a lucide icon.
//
// The outline is a single path: a round resonating chamber whose mouthpiece top
// edge blends tangentially into the dome (the cubic), so there's no hard corner
// where the spout meets the body, with a small inner circle for the pea. The
// whole shape is tilted -15° for a dynamic, "final whistle" look.
export function Whistle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <g transform="rotate(-15 12 12)">
        <path d="M21 9 H12.5 C10.8 9 10.3 8.5 9 8.5 A5.5 5.5 0 1 0 14.29 12.5 H21 Z" />
        <circle cx="9" cy="14" r="2" />
      </g>
    </svg>
  )
}
