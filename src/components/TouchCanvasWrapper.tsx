import { useRef, useState, useCallback, useEffect } from "react";
import { useGesture } from "react-use-gesture";

interface TouchCanvasWrapperProps {
  children: React.ReactNode;
  onZoomChange: (zoom: number) => void;
  onPanChange: (offset: { x: number; y: number }) => void;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  className?: string;
  disabled?: boolean;
}

export const TouchCanvasWrapper = ({
  children,
  onZoomChange,
  onPanChange,
  zoomLevel,
  panOffset,
  className = "",
  disabled = false
}: TouchCanvasWrapperProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Constrain zoom and pan values for mobile-friendly limits
  const constrainZoom = (zoom: number) => Math.min(Math.max(zoom, 0.2), 5);
  
  const constrainPan = (offset: { x: number; y: number }, zoom: number) => {
    // Much more generous pan limits for large canvas area
    const maxPanX = 2500 / zoom;
    const maxPanY = 2500 / zoom;
    const minPanX = -2500 / zoom;
    const minPanY = -2500 / zoom;
    
    return {
      x: Math.min(Math.max(offset.x, minPanX), maxPanX),
      y: Math.min(Math.max(offset.y, minPanY), maxPanY)
    };
  };

  const bind = useGesture(
    {
      onDrag: ({ offset: [x, y], movement: [mx, my], touches, first, last }) => {
        if (disabled) return;
        
        // Only handle two-finger pan to avoid interfering with single taps
        if (touches !== 2) return;
        
        if (first) {
          setIsDragging(true);
        }
        
        if (last) {
          setIsDragging(false);
        }
        
        // Smoother panning with velocity consideration for touch
        const sensitivity = 1.5;
        const newOffset = {
          x: panOffset.x + (mx * sensitivity) / zoomLevel,
          y: panOffset.y + (my * sensitivity) / zoomLevel
        };
        
        const constrainedOffset = constrainPan(newOffset, zoomLevel);
        onPanChange(constrainedOffset);
      }
    },
    {
      drag: {
        filterTaps: true,
        threshold: 10
      }
    }
  );

  return (
    <div
      ref={ref}
      {...bind()}
      className={`touch-pan-y ${className} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        touchAction: disabled ? 'auto' : 'pan-x pan-y',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      {children}
    </div>
  );
};