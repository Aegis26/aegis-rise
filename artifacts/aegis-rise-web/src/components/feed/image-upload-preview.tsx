import React, { useState } from 'react';
import { X, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ImageFile {
  file: File;
  preview: string;
  id: string; // for stable keys
}

interface ImageUploadPreviewProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  disabled?: boolean;
}

export function ImageUploadPreview({ images, onImagesChange, disabled }: ImageUploadPreviewProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    onImagesChange(newImages);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleRemove = (index: number) => {
    const newImages = [...images];
    URL.revokeObjectURL(newImages[index].preview);
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length || fromIndex === toIndex) {
      return;
    }
    const nextImages = [...images];
    const [image] = nextImages.splice(fromIndex, 1);
    nextImages.splice(toIndex, 0, image);
    onImagesChange(nextImages);
  };

  if (images.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mt-4" role="list" aria-label="Attached post images">
      {images.map((img, idx) => (
        <div 
          key={img.id}
          className={`relative group rounded-md overflow-hidden border border-border w-24 h-24 sm:w-28 sm:h-28 bg-muted flex-shrink-0 cursor-grab active:cursor-grabbing transition-transform ${draggedIndex === idx ? 'opacity-50 scale-95' : 'opacity-100'}`}
          draggable={!disabled}
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragEnter={(e) => handleDragEnter(e, idx)}
          onDragOver={(e) => e.preventDefault()}
          onDragEnd={handleDragEnd}
           role="listitem"
           tabIndex={disabled ? -1 : 0}
           aria-label={`Image ${idx + 1} of ${images.length}. Use left and right arrows to reorder.`}
           onKeyDown={(event) => {
             if (event.key === 'ArrowLeft') {
               event.preventDefault();
               moveImage(idx, idx - 1);
             } else if (event.key === 'ArrowRight') {
               event.preventDefault();
               moveImage(idx, idx + 1);
             } else if (event.key === 'Delete' || event.key === 'Backspace') {
               event.preventDefault();
               handleRemove(idx);
             }
           }}
        >
          <img src={img.preview} alt={`Preview ${idx}`} className="w-full h-full object-cover pointer-events-none" />
          {!disabled && (
            <>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <GripVertical className="text-white h-6 w-6" />
              </div>
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(idx);
                }}
                aria-label={`Remove image ${idx + 1}`}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-1 right-1 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 rounded-full bg-black/60 text-white hover:bg-black/80"
                  disabled={idx === 0}
                  onClick={() => moveImage(idx, idx - 1)}
                  aria-label={`Move image ${idx + 1} earlier`}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 rounded-full bg-black/60 text-white hover:bg-black/80"
                  disabled={idx === images.length - 1}
                  onClick={() => moveImage(idx, idx + 1)}
                  aria-label={`Move image ${idx + 1} later`}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none">
                {idx + 1}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
