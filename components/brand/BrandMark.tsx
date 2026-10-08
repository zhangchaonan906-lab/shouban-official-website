import Image from "next/image";

type BrandMarkProps = {
  size?: number;
  className?: string;
  preload?: boolean;
};

export function BrandMark({
  size = 32,
  className,
  preload = false
}: BrandMarkProps) {
  return (
    <Image
      src="/brand/shouban-mark.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      preload={preload}
    />
  );
}
