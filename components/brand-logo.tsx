type BrandLogoProps = {
  className?: string;
  as?: "span" | "h1";
};

/** Renders "Routine.ai" with no gap between the word and suffix. */
export function BrandLogo({ className = "", as: Tag = "span" }: BrandLogoProps) {
  return (
    <Tag className={`inline-flex items-baseline whitespace-nowrap text-white ${className}`}>
      <span className="text-white">Routine</span>
      <span className="text-cyan-400 shrink-0">.ai</span>
    </Tag>
  );
}
