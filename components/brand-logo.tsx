import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function BrandLogo({ className, imageClassName, priority = false }: BrandLogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", className)}>
      <Image
        alt="Pulso"
        className={cn("block object-contain dark:hidden", imageClassName)}
        height={80}
        priority={priority}
        src="/logo/logo-dark.png"
        unoptimized
        width={80}
      />
      <Image
        alt="Pulso"
        className={cn("hidden object-contain dark:block", imageClassName)}
        height={80}
        priority={priority}
        src="/logo/logo-white.png"
        unoptimized
        width={80}
      />
    </div>
  );
}
