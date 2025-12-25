import { branding } from '@/config/branding';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showFallback?: boolean;
}

const sizeClasses = {
  sm: 'h-6 w-auto',
  md: 'h-8 w-auto',
  lg: 'h-10 w-auto',
  xl: 'h-12 w-auto',
};

const fallbackSizeClasses = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

export const BrandLogo = ({ className, size = 'md', showFallback = true }: BrandLogoProps) => {
  if (branding.logo.src) {
    return (
      <img
        src={branding.logo.src}
        alt={branding.logo.alt}
        className={cn(sizeClasses[size], 'object-contain', className)}
      />
    );
  }

  if (showFallback) {
    return (
      <span className={cn(
        'font-bold text-primary',
        fallbackSizeClasses[size],
        className
      )}>
        {branding.companyShortName}
      </span>
    );
  }

  return null;
};

export default BrandLogo;
