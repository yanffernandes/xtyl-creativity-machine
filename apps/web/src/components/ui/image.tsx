/**
 * Image Component
 * Simple wrapper around img element for compatibility with Next.js Image usage
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fill?: boolean;
  priority?: boolean;
  quality?: number;
}

export const Image = forwardRef<HTMLImageElement, ImageProps>(
  ({ className, fill, alt, ...props }, ref) => {
    return (
      <img
        ref={ref}
        alt={alt}
        className={cn(fill && 'object-cover w-full h-full', className)}
        {...props}
      />
    );
  }
);

Image.displayName = 'Image';

export default Image;
