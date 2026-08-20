import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogClose } from '@/components/ui/dialog';
import type { PostImage } from '@workspace/api-client-react';
import { cn } from '@/lib/utils';

interface PostGalleryProps {
  images: PostImage[];
  legacyImageUrl?: string | null;
}

export function PostGallery({ images, legacyImageUrl }: PostGalleryProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [initialIndex, setInitialIndex] = useState(0);

  // Normalize images
  const allImages = React.useMemo(() => {
    let list = [...(images || [])].sort((a, b) => a.position - b.position).map(img => img.imageUrl);
    if (list.length === 0 && legacyImageUrl) {
      list = [legacyImageUrl];
    }
    return list;
  }, [images, legacyImageUrl]);

  if (allImages.length === 0) return null;

  if (allImages.length === 1) {
    return (
      <>
        <div className="mt-4 relative group rounded-md overflow-hidden border border-border bg-muted/20">
          <img 
            src={allImages[0]} 
            alt="Post attachment" 
            className="w-full max-h-[500px] object-cover cursor-zoom-in"
            onClick={() => {
              setInitialIndex(0);
              setIsFullscreen(true);
            }}
          />
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-sm"
            onClick={() => {
              setInitialIndex(0);
              setIsFullscreen(true);
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        <FullscreenGallery 
          images={allImages} 
          open={isFullscreen} 
          onOpenChange={setIsFullscreen} 
          initialIndex={initialIndex}
        />
      </>
    );
  }

  return (
    <>
      <div className="mt-4 relative group rounded-md overflow-hidden border border-border bg-muted/20">
        <Carousel images={allImages} onExpand={(index) => {
          setInitialIndex(index);
          setIsFullscreen(true);
        }} />
      </div>
      <FullscreenGallery 
        images={allImages} 
        open={isFullscreen} 
        onOpenChange={setIsFullscreen} 
        initialIndex={initialIndex}
      />
    </>
  );
}

function Carousel({ images, onExpand, isFullscreen = false }: { images: string[], onExpand?: (idx: number) => void, isFullscreen?: boolean }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(images.length > 1);

  const scrollPrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    emblaApi?.scrollTo(index);
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFullscreen) {
        if (e.key === 'ArrowLeft') scrollPrev();
        if (e.key === 'ArrowRight') scrollNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, scrollPrev, scrollNext]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="overflow-hidden w-full h-full" ref={emblaRef}>
        <div className="flex w-full h-full touch-pan-y">
          {images.map((src, idx) => (
            <div key={idx} className="flex-[0_0_100%] min-w-0 relative flex items-center justify-center">
              <img 
                src={src} 
                alt={`Image ${idx + 1}`} 
                className={cn(
                  "object-contain w-full h-full",
                  isFullscreen ? "max-h-[90vh]" : "max-h-[500px] object-cover cursor-zoom-in"
                )}
                loading={idx > 0 && !isFullscreen ? "lazy" : "eager"}
                onClick={() => !isFullscreen && onExpand?.(idx)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {canScrollPrev && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-sm shadow-md"
          onClick={scrollPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {canScrollNext && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-sm shadow-md"
          onClick={scrollNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Expand Button */}
      {!isFullscreen && onExpand && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-sm z-10"
          onClick={(e) => {
            e.stopPropagation();
            onExpand(selectedIndex);
          }}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      )}

      {/* Dots Indicator */}
      <div className={cn(
        "absolute flex gap-1.5 justify-center z-10",
        isFullscreen ? "bottom-4" : "bottom-3"
      )}>
        {images.map((_, idx) => (
          <button
            key={idx}
            className={cn(
              "w-2 h-2 rounded-full transition-all shadow-sm",
              selectedIndex === idx 
                ? "bg-white scale-110" 
                : "bg-white/50 hover:bg-white/75"
            )}
            onClick={(e) => scrollTo(idx, e)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function FullscreenGallery({ images, open, onOpenChange, initialIndex }: { images: string[], open: boolean, onOpenChange: (open: boolean) => void, initialIndex: number }) {
  // We recreate the carousel component when it opens so it starts at the right index
  // Embla doesn't easily support dynamic start index on mount without refs or keys
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] max-h-[100dvh] w-full h-[100dvh] p-0 m-0 bg-black/95 border-none rounded-none shadow-none flex flex-col [&>button]:hidden">
        <DialogTitle className="sr-only">Image Gallery</DialogTitle>
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {open && (
          <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden">
             <FullscreenCarousel key={initialIndex} images={images} startIndex={initialIndex} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FullscreenCarousel({ images, startIndex }: { images: string[], startIndex: number }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, startIndex });
  const [selectedIndex, setSelectedIndex] = useState(startIndex);

  const scrollPrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    emblaApi?.scrollTo(index);
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') scrollPrev();
      if (e.key === 'ArrowRight') scrollNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollPrev, scrollNext]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className="overflow-hidden w-full h-full" ref={emblaRef}>
        <div className="flex w-full h-full touch-pan-y">
          {images.map((src, idx) => (
            <div key={idx} className="flex-[0_0_100%] min-w-0 relative flex items-center justify-center p-4 md:p-12">
              <img 
                src={src} 
                alt={`Image ${idx + 1}`} 
                className="max-w-full max-h-full object-contain"
                loading={idx === startIndex ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md"
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md"
            onClick={scrollNext}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-6 flex gap-2 justify-center z-10">
          {images.map((_, idx) => (
            <button
              key={idx}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all shadow-sm",
                selectedIndex === idx 
                  ? "bg-white scale-125" 
                  : "bg-white/40 hover:bg-white/60"
              )}
              onClick={(e) => scrollTo(idx, e)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
