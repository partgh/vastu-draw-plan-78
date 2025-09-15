import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Line, IText } from "fabric";
import { Room } from "./DimensionInput";
import { generateBasicLayout, optimizeLayout } from "@/utils/mapGenerator";
import { ResponsiveDrawingCanvas } from "./ResponsiveDrawingCanvas";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobilePolygonCanvas } from "./MobilePolygonCanvas";
import { Button } from "@/components/ui/button";
import { ZoomIn as ZoomInIcon, ZoomOut as ZoomOutIcon } from "lucide-react";

interface DrawingCanvasProps {
  generatedRooms?: Room[];
}

export interface DrawingCanvasHandle {
  // Simplified interface - no interactive tools needed
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(({ 
  generatedRooms = []
}: DrawingCanvasProps, ref) => {
  const SCALE_PX_PER_FT = 20; // Match Canvas Designer (20px = 1ft)
  const GRID_FT = 400; // 400 x 400 ft minimum area
  const CANVAS_SIZE = GRID_FT * SCALE_PX_PER_FT; // pixels
  const GEN_SCALE_PX_PER_FT = 15; // mapGenerator uses 15px = 1ft

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topRulerRef = useRef<HTMLCanvasElement>(null);
  const leftRulerRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({}), []);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: "transparent",
    });

    // Disable interactions - canvas is view-only
    canvas.selection = false;
    canvas.hoverCursor = 'default';
    canvas.moveCursor = 'default';

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Generate rooms from dimensions
  useEffect(() => {
    if (!fabricCanvas || generatedRooms.length === 0) return;

    // Clear all existing objects
    fabricCanvas.clear();

    // Generate and add room rectangles (using feet scale)
    const layoutRooms = generateBasicLayout(generatedRooms, GRID_FT, GRID_FT);
    const optimizedRooms = optimizeLayout(layoutRooms);

    const POS_SCALE = SCALE_PX_PER_FT / GEN_SCALE_PX_PER_FT;

    optimizedRooms.forEach(room => {
      const rect = new Rect({
        left: room.x * POS_SCALE,
        top: room.y * POS_SCALE,
        width: room.width * SCALE_PX_PER_FT, // Convert to pixels (px per foot)
        height: room.height * SCALE_PX_PER_FT,
        fill: `${room.color}40`, // Semi-transparent fill
        stroke: room.color,
        strokeWidth: 2,
        selectable: false,
      });

      // Add room label
      const label = new IText(room.type, {
        left: room.x * POS_SCALE + (room.width * SCALE_PX_PER_FT) / 2,
        top: room.y * POS_SCALE + (room.height * SCALE_PX_PER_FT) / 2,
        fontSize: 12,
        fill: "#1f2937",
        fontFamily: "Arial",
        textAlign: "center",
        originX: "center",
        originY: "center",
        selectable: false,
      });

      fabricCanvas.add(rect);
      fabricCanvas.add(label);
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, generatedRooms]);

  // Canvas is now read-only - no drawing tools needed

  // Draw grid like graph paper with feet measurements (matching reference)
  const drawGrid = (zoom: number) => {
    if (!backgroundCanvasRef.current || !fabricCanvas) return;

    const canvas = backgroundCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ensure backing resolution matches CSS size
    if (canvas.width !== CANVAS_SIZE || canvas.height !== CANVAS_SIZE) {
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
    }

    // Reset to identity to clear and paint background in screen space
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Mirror Fabric viewport transform so background grid follows pan/zoom
    const vt = fabricCanvas.viewportTransform;
    const scaleX = vt[0];
    const scaleY = vt[3];
    const transX = vt[4];
    const transY = vt[5];

    // World-space transform (so we draw grid in feet regardless of zoom)
    ctx.save();
    ctx.setTransform(scaleX, 0, 0, scaleY, transX, transY);

    // World visible bounds (in world units/pixels at zoom 1)
    const worldLeft = -transX / scaleX;
    const worldTop = -transY / scaleY;
    const worldRight = worldLeft + canvas.width / scaleX;
    const worldBottom = worldTop + canvas.height / scaleY;

    const baseGridSize = SCALE_PX_PER_FT; // px = 1ft
    const major = baseGridSize * 10; // 10ft major grid lines
    const mid = baseGridSize * 5; // 5ft intermediate lines
    const minor = baseGridSize; // 1ft minor grid lines

    // Determine zoom percentage for smart grid rendering
    const zoomPercent = scaleX * 100;

    // Always show 1ft minor grid lines (subdivision lines)
    ctx.strokeStyle = "rgba(180, 180, 180, 0.5)";
    ctx.lineWidth = 0.5 / scaleX;

    const startMinorX = Math.floor(worldLeft / minor) * minor;
    const startMinorY = Math.floor(worldTop / minor) * minor;

    // Vertical 1ft lines
    for (let x = startMinorX; x <= worldRight + minor; x += minor) {
      if (Math.round(x % mid) !== 0) { // Skip 5ft and 10ft grid positions
        ctx.beginPath();
        ctx.moveTo(x, worldTop);
        ctx.lineTo(x, worldBottom);
        ctx.stroke();
      }
    }

    // Horizontal 1ft lines  
    for (let y = startMinorY; y <= worldBottom + minor; y += minor) {
      if (Math.round(y % mid) !== 0) { // Skip 5ft and 10ft grid positions
        ctx.beginPath();
        ctx.moveTo(worldLeft, y);
        ctx.lineTo(worldRight, y);
        ctx.stroke();
      }
    }

    // Show 5ft intermediate lines when zoom >= 50%
    if (zoomPercent >= 50) {
      ctx.strokeStyle = "rgba(120, 120, 120, 0.8)";
      ctx.lineWidth = 1.2 / scaleX;

      const startMidX = Math.floor(worldLeft / mid) * mid;
      const startMidY = Math.floor(worldTop / mid) * mid;

      // Vertical 5ft lines
      for (let x = startMidX; x <= worldRight + mid; x += mid) {
        if (Math.round(x % major) !== 0) { // Skip 10ft grid positions
          ctx.beginPath();
          ctx.moveTo(x, worldTop);
          ctx.lineTo(x, worldBottom);
          ctx.stroke();
        }
      }

      // Horizontal 5ft lines
      for (let y = startMidY; y <= worldBottom + mid; y += mid) {
        if (Math.round(y % major) !== 0) { // Skip 10ft grid positions
          ctx.beginPath();
          ctx.moveTo(worldLeft, y);
          ctx.lineTo(worldRight, y);
          ctx.stroke();
        }
      }
    }

    // Major grid (10ft) - always show with bolder styling
    ctx.strokeStyle = "rgba(60, 60, 60, 0.9)";
    ctx.lineWidth = Math.max(2.0 / scaleX, 1.5 / scaleX);

    const startMajorX = Math.floor(worldLeft / major) * major;
    const startMajorY = Math.floor(worldTop / major) * major;

    // Vertical 10ft lines
    for (let x = startMajorX; x <= worldRight + major; x += major) {
      ctx.beginPath();
      ctx.moveTo(x, worldTop);
      ctx.lineTo(x, worldBottom);
      ctx.stroke();
    }

    // Horizontal 10ft lines
    for (let y = startMajorY; y <= worldBottom + major; y += major) {
      ctx.beginPath();
      ctx.moveTo(worldLeft, y);
      ctx.lineTo(worldRight, y);
      ctx.stroke();
    }

    // Done drawing lines in world space
    ctx.restore();

    // Axis labels are drawn on a sticky top ruler overlay outside the scroll area

  };

  // Update grid when canvas changes
  const drawTopRuler = useCallback(() => {
    const container = scrollContainerRef.current;
    const ruler = topRulerRef.current;
    if (!container || !ruler || !fabricCanvas) return;

    const width = container.clientWidth;
    const height = 28;
    if (ruler.width !== width) ruler.width = width;
    if (ruler.height !== height) ruler.height = height;

    const ctx = ruler.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = "center";

    const vt = (fabricCanvas as any).viewportTransform as number[];
    const scaleX = vt[0];
    const transX = vt[4];

    const scrollLeft = container.scrollLeft;
    const worldLeft = (scrollLeft - transX) / scaleX;
    const worldRight = worldLeft + width / scaleX;

    // Determine zoom percentage for smart labeling
    const zoomPercent = scaleX * 100;

    // Show all numbers (1,2,3,4,5...) when zoom > 125%
    if (zoomPercent > 125) {
      const step1ft = SCALE_PX_PER_FT;
      const start1ft = Math.floor(worldLeft / step1ft) * step1ft;

      for (let x = start1ft; x <= worldRight + step1ft; x += step1ft) {
        const sx = x * scaleX + transX - scrollLeft;
        const feet = Math.round(x / SCALE_PX_PER_FT);
        if (feet <= 0) continue;

        // Different tick heights for different intervals
        let tickHeight = 8;
        let labelOffset = 20;
        let fontWeight = "normal";
        let opacity = 0.4;
        
        if (feet % 10 === 0) {
          tickHeight = 18;
          labelOffset = 24;
          fontWeight = "bold";
          opacity = 0.9;
        } else if (feet % 5 === 0) {
          tickHeight = 12;
          labelOffset = 22;
          fontWeight = "500";
          opacity = 0.6;
        }

        ctx.strokeStyle = `rgba(48, 62, 84, ${opacity})`;
        ctx.lineWidth = feet % 10 === 0 ? 2 : feet % 5 === 0 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, tickHeight);
        ctx.stroke();

        ctx.fillStyle = `rgba(48, 62, 84, ${opacity})`;
        ctx.font = `${fontWeight} ${feet % 10 === 0 ? 12 : feet % 5 === 0 ? 11 : 10}px Arial`;
        if (sx >= -30 && sx <= width + 30) {
          ctx.fillText(`${feet}${feet % 10 === 0 ? 'ft' : ''}`, sx, labelOffset);
        }
      }
    }
    // Show major markings only (5,10,15...) when zoom 50-125%
    else if (zoomPercent >= 50) {
      const step5ft = SCALE_PX_PER_FT * 5;
      const start5ft = Math.floor(worldLeft / step5ft) * step5ft;

      for (let x = start5ft; x <= worldRight + step5ft; x += step5ft) {
        const sx = x * scaleX + transX - scrollLeft;
        const feet = Math.round(x / SCALE_PX_PER_FT);
        if (feet <= 0) continue;

        let tickHeight = feet % 10 === 0 ? 18 : 12;
        let fontWeight = feet % 10 === 0 ? "bold" : "500";
        let opacity = feet % 10 === 0 ? 0.9 : 0.6;

        ctx.strokeStyle = `rgba(48, 62, 84, ${opacity})`;
        ctx.lineWidth = feet % 10 === 0 ? 2 : 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, tickHeight);
        ctx.stroke();

        ctx.fillStyle = `rgba(48, 62, 84, ${opacity})`;
        ctx.font = `${fontWeight} ${feet % 10 === 0 ? 12 : 11}px Arial`;
        if (sx >= -30 && sx <= width + 30) {
          ctx.fillText(`${feet}${feet % 10 === 0 ? 'ft' : ''}`, sx, feet % 10 === 0 ? 24 : 22);
        }
      }
    }
    // Show super major markings only (10,20,30...) when zoom < 50%
    else {
      const step10ft = SCALE_PX_PER_FT * 10;
      const start10ft = Math.floor(worldLeft / step10ft) * step10ft;

      for (let x = start10ft; x <= worldRight + step10ft; x += step10ft) {
        const sx = x * scaleX + transX - scrollLeft;
        const feet = Math.round(x / SCALE_PX_PER_FT);
        if (feet <= 0) continue;

        ctx.strokeStyle = "rgba(48, 62, 84, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, 18);
        ctx.stroke();

        ctx.fillStyle = "rgba(48, 62, 84, 0.9)";
        ctx.font = "bold 12px Arial";
        if (sx >= -30 && sx <= width + 30) {
          ctx.fillText(`${feet}ft`, sx, 24);
        }
      }
    }
  }, [fabricCanvas]);

  const drawLeftRuler = useCallback(() => {
    const container = scrollContainerRef.current;
    const ruler = leftRulerRef.current;
    if (!container || !ruler || !fabricCanvas) return;

    const width = 28;
    const height = container.clientHeight;
    if (ruler.width !== width) ruler.width = width;
    if (ruler.height !== height) ruler.height = height;

    const ctx = ruler.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = "center";

    const vt = (fabricCanvas as any).viewportTransform as number[];
    const scaleY = vt[3];
    const transY = vt[5];

    const scrollTop = container.scrollTop;
    const worldTop = (scrollTop - transY) / scaleY;
    const worldBottom = worldTop + height / scaleY;

    // Determine zoom percentage for smart labeling
    const zoomPercent = scaleY * 100;

    // Show all numbers (1,2,3,4,5...) when zoom > 125%
    if (zoomPercent > 125) {
      const step1ft = SCALE_PX_PER_FT;
      const start1ft = Math.floor(worldTop / step1ft) * step1ft;

      for (let y = start1ft; y <= worldBottom + step1ft; y += step1ft) {
        const sy = y * scaleY + transY - scrollTop;
        const feet = Math.round(y / SCALE_PX_PER_FT);
        if (feet <= 0) continue;

        // Different tick widths for different intervals
        let tickWidth = 8;
        let labelOffset = 20;
        let fontWeight = "normal";
        let opacity = 0.4;
        
        if (feet % 10 === 0) {
          tickWidth = 18;
          labelOffset = 14;
          fontWeight = "bold";
          opacity = 0.9;
        } else if (feet % 5 === 0) {
          tickWidth = 12;
          labelOffset = 16;
          fontWeight = "500";
          opacity = 0.6;
        }

        ctx.strokeStyle = `rgba(48, 62, 84, ${opacity})`;
        ctx.lineWidth = feet % 10 === 0 ? 2 : feet % 5 === 0 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(width - tickWidth, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();

        ctx.save();
        ctx.translate(labelOffset, sy);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = `rgba(48, 62, 84, ${opacity})`;
        ctx.font = `${fontWeight} ${feet % 10 === 0 ? 12 : feet % 5 === 0 ? 11 : 10}px Arial`;
        if (sy >= -30 && sy <= height + 30) {
          ctx.fillText(`${feet}${feet % 10 === 0 ? 'ft' : ''}`, 0, 4);
        }
        ctx.restore();
      }
    }
    // Show major markings only (5,10,15...) when zoom 50-125%
    else if (zoomPercent >= 50) {
      const step5ft = SCALE_PX_PER_FT * 5;
      const start5ft = Math.floor(worldTop / step5ft) * step5ft;

      for (let y = start5ft; y <= worldBottom + step5ft; y += step5ft) {
        const sy = y * scaleY + transY - scrollTop;
        const feet = Math.round(y / SCALE_PX_PER_FT);
        if (feet <= 0) continue;

        let tickWidth = feet % 10 === 0 ? 18 : 12;
        let labelOffset = feet % 10 === 0 ? 14 : 16;
        let fontWeight = feet % 10 === 0 ? "bold" : "500";
        let opacity = feet % 10 === 0 ? 0.9 : 0.6;

        ctx.strokeStyle = `rgba(48, 62, 84, ${opacity})`;
        ctx.lineWidth = feet % 10 === 0 ? 2 : 1.5;
        ctx.beginPath();
        ctx.moveTo(width - tickWidth, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();

        ctx.save();
        ctx.translate(labelOffset, sy);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = `rgba(48, 62, 84, ${opacity})`;
        ctx.font = `${fontWeight} ${feet % 10 === 0 ? 12 : 11}px Arial`;
        if (sy >= -30 && sy <= height + 30) {
          ctx.fillText(`${feet}${feet % 10 === 0 ? 'ft' : ''}`, 0, 4);
        }
        ctx.restore();
      }
    }
    // Show super major markings only (10,20,30...) when zoom < 50%
    else {
      const step10ft = SCALE_PX_PER_FT * 10;
      const start10ft = Math.floor(worldTop / step10ft) * step10ft;

      for (let y = start10ft; y <= worldBottom + step10ft; y += step10ft) {
        const sy = y * scaleY + transY - scrollTop;
        const feet = Math.round(y / SCALE_PX_PER_FT);
        if (feet <= 0) continue;

        ctx.strokeStyle = "rgba(48, 62, 84, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width - 18, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();

        ctx.save();
        ctx.translate(14, sy);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = "rgba(48, 62, 84, 0.9)";
        ctx.font = "bold 12px Arial";
        if (sy >= -30 && sy <= height + 30) {
          ctx.fillText(`${feet}ft`, 0, 4);
        }
        ctx.restore();
      }
    }
  }, [fabricCanvas]);

  // Keep origin (0,0) pinned to top-left of the viewport
  const ensureOriginVisible = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !fabricCanvas) return;

    const vt = (fabricCanvas as any).viewportTransform as number[];
    const transX = vt[4];
    const transY = vt[5];

    // Align scroll so the world origin (0,0) sits exactly at the viewport's top-left
    container.scrollLeft = Math.max(0, Math.round(transX));
    container.scrollTop = Math.max(0, Math.round(transY));
  }, [fabricCanvas]);

  // Update grid and sticky rulers when canvas changes or on scroll/resize
  useEffect(() => {
    if (!fabricCanvas) return;

    const updateGrid = () => {
      const zoom = fabricCanvas.getZoom();
      drawGrid(zoom);
      drawTopRuler();
      drawLeftRuler();
    };

    // Initial draw
    updateGrid();

    // Redraw on fabric render (covers pan/zoom/any change)
    fabricCanvas.on('after:render', updateGrid);

    const container = scrollContainerRef.current;
    const onScrollOrResize = () => {
      drawTopRuler();
      drawLeftRuler();
    };
    container?.addEventListener('scroll', onScrollOrResize, { passive: true } as any);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      fabricCanvas.off('after:render', updateGrid);
      container?.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [fabricCanvas, drawTopRuler, drawLeftRuler]);


  return (
    <div className="relative w-full h-[800px] bg-background rounded-lg overflow-hidden">
      {/* Sticky top ruler outside the grid */}
      <canvas
        ref={topRulerRef}
        className="absolute top-0 left-8 right-0 z-20 pointer-events-none"
        style={{ height: '28px', width: 'calc(100% - 32px)' }}
      />

      {/* Sticky left ruler outside the grid */}
      <canvas
        ref={leftRulerRef}
        className="absolute top-10 left-0 z-20 pointer-events-none"
        style={{ width: '28px', height: 'calc(100% - 40px)' }}
      />

      {/* Overlay zoom controls */}
      <div className="absolute top-12 right-4 z-30 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => {
            if (!fabricCanvas) return;
            const container = scrollContainerRef.current;
            if (!container) return;
            
            // Get current center point in viewport coordinates
            const centerX = container.clientWidth / 2 + container.scrollLeft;
            const centerY = container.clientHeight / 2 + container.scrollTop;
            
            const zoom = Math.min(fabricCanvas.getZoom() * 1.1, 4);
            fabricCanvas.zoomToPoint({ x: centerX, y: centerY } as any, zoom);
            requestAnimationFrame(() => ensureOriginVisible());
            fabricCanvas.renderAll();
          }}
          aria-label="Zoom in"
        >
          <ZoomInIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => {
            if (!fabricCanvas) return;
            const container = scrollContainerRef.current;
            if (!container) return;
            
            // Get current center point in viewport coordinates  
            const centerX = container.clientWidth / 2 + container.scrollLeft;
            const centerY = container.clientHeight / 2 + container.scrollTop;
            
            const zoom = Math.max(fabricCanvas.getZoom() / 1.1, 0.1);
            fabricCanvas.zoomToPoint({ x: centerX, y: centerY } as any, zoom);
            requestAnimationFrame(() => ensureOriginVisible());
            fabricCanvas.renderAll();
          }}
          aria-label="Zoom out"
        >
          <ZoomOutIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Scrollable canvas area with visible scrollbars */}
      <div 
        ref={scrollContainerRef} 
        className="absolute top-10 left-8 right-0 bottom-0 overflow-auto canvas-scroll-container"
      >
        <div className="relative bg-white" style={{ width: CANVAS_SIZE + 'px', height: CANVAS_SIZE + 'px' }}>
          <canvas
            ref={backgroundCanvasRef}
            className="absolute inset-0 z-0"
            style={{ width: CANVAS_SIZE + 'px', height: CANVAS_SIZE + 'px' }}
            key="background-canvas-v2"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10"
            style={{ width: CANVAS_SIZE + 'px', height: CANVAS_SIZE + 'px' }}
            key="drawing-canvas-v2"
          />
        </div>
      </div>
    </div>
  );
});