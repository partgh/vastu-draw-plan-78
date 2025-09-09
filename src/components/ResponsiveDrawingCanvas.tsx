import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Line, IText } from "fabric";
import { Room } from "./DimensionInput";
import { generateBasicLayout, optimizeLayout } from "@/utils/mapGenerator";
import { TouchCanvasWrapper } from "./TouchCanvasWrapper";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResponsiveDrawingCanvasProps {
  activeTool: "select" | "rectangle" | "circle" | "line" | "pen" | "text" | "area";
  generatedRooms?: Room[];
  canvasHistory: string[];
  historyIndex: number;
  onCanvasChange: (stateJSON: string) => void;
}

export interface ResponsiveDrawingCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  exportPNGCropped: () => string | null;
}

export const ResponsiveDrawingCanvas = forwardRef<ResponsiveDrawingCanvasHandle, ResponsiveDrawingCanvasProps>(({ 
  activeTool,
  generatedRooms = [],
  canvasHistory,
  historyIndex,
  onCanvasChange
}: ResponsiveDrawingCanvasProps, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 2500, height: 2500 });
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const isMobile = useIsMobile();

  // Calculate responsive canvas dimensions
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate available space (subtract mobile bottom nav height if needed)
    const bottomNavHeight = isMobile ? 80 : 0;
    const availableWidth = rect.width;
    const availableHeight = window.innerHeight - rect.top - bottomNavHeight - 20; // 20px padding
    
    const newContainerSize = {
      width: Math.max(availableWidth, 300),
      height: Math.max(availableHeight, 400)
    };
    
    setContainerSize(newContainerSize);
    
    // Scale canvas size based on container while maintaining aspect ratio
    const scale = Math.min(newContainerSize.width / 2500, newContainerSize.height / 2500);
    const scaledCanvasSize = {
      width: Math.max(newContainerSize.width * 2, 2500), // Always larger than container
      height: Math.max(newContainerSize.height * 2, 2500)
    };
    
    setCanvasSize(scaledCanvasSize);
  }, [isMobile]);

  // Handle window resize and rotation
  useEffect(() => {
    updateCanvasSize();
    
    const handleResize = () => {
      setTimeout(updateCanvasSize, 100); // Delay to allow for layout changes
    };
    
    const handleOrientationChange = () => {
      setTimeout(updateCanvasSize, 300); // Longer delay for orientation changes
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateCanvasSize]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (!fabricCanvas) return;
      const newZoom = Math.min(zoomLevel * 1.2, 4);
      setZoomLevel(newZoom);
      fabricCanvas.zoomToPoint({ x: containerSize.width / 2, y: containerSize.height / 2 } as any, newZoom);
    },
    zoomOut: () => {
      if (!fabricCanvas) return;
      const newZoom = Math.max(zoomLevel / 1.2, 0.1);
      setZoomLevel(newZoom);
      fabricCanvas.zoomToPoint({ x: containerSize.width / 2, y: containerSize.height / 2 } as any, newZoom);
    },
    exportPNGCropped: () => {
      if (!fabricCanvas) return null;
      const objs = fabricCanvas.getObjects();
      if (objs.length === 0) return null;
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      objs.forEach((obj: any) => {
        const rect = obj.getBoundingRect(true, true);
        minX = Math.min(minX, rect.left);
        minY = Math.min(minY, rect.top);
        maxX = Math.max(maxX, rect.left + rect.width);
        maxY = Math.max(maxY, rect.top + rect.height);
      });
      
      const left = Math.max(minX - 10, 0);
      const top = Math.max(minY - 10, 0);
      const width = Math.max(maxX - minX + 20, 1);
      const height = Math.max(maxY - minY + 20, 1);
      
      return fabricCanvas.toDataURL({
        left,
        top,
        width,
        height,
        format: "png",
        multiplier: 2,
      } as any);
    },
  }), [fabricCanvas, zoomLevel, containerSize]);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: "transparent",
    });

    // Configure for touch interactions
    canvas.enableRetinaScaling = true;
    canvas.isDrawingMode = false;

    // Set up drawing brush after canvas is ready
    setTimeout(() => {
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = "#2563eb";
        canvas.freeDrawingBrush.width = isMobile ? 4 : 3;
      }
    }, 0);

    // Canvas event handlers
    canvas.on('path:created', () => {
      setTimeout(() => onCanvasChange(JSON.stringify(canvas.toJSON())), 10);
    });

    canvas.on('object:modified', () => {
      onCanvasChange(JSON.stringify(canvas.toJSON()));
    });

    // Mouse wheel zoom (desktop only)
    if (!isMobile) {
      canvas.on('mouse:wheel', (opt: any) => {
        const e = opt.e;
        let zoom = canvas.getZoom();
        const delta = e.deltaY;
        zoom *= Math.pow(0.999, delta);
        zoom = Math.min(Math.max(zoom, 0.1), 4);
        const point = { x: e.offsetX, y: e.offsetY } as any;
        canvas.zoomToPoint(point, zoom);
        setZoomLevel(zoom);
        canvas.requestRenderAll();
        e.preventDefault();
        e.stopPropagation();
      });
    }

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, [canvasSize, isMobile]);

  // Update canvas size when dimensions change
  useEffect(() => {
    if (!fabricCanvas) return;
    
    // Ensure canvas is fully initialized before setting dimensions
    setTimeout(() => {
      try {
        // Check if the canvas lower element exists before setting dimensions
        if (fabricCanvas && (fabricCanvas as any).lower && (fabricCanvas as any).lower.el) {
          fabricCanvas.setDimensions({
            width: canvasSize.width,
            height: canvasSize.height
          });
          fabricCanvas.renderAll();
        }
      } catch (error) {
        console.warn('Failed to set canvas dimensions:', error);
      }
    }, 0);
  }, [fabricCanvas, canvasSize]);

  // Generate rooms from dimensions
  useEffect(() => {
    if (!fabricCanvas || generatedRooms.length === 0) return;

    // Clear existing objects except free drawings
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if (obj.type !== 'path') {
        fabricCanvas.remove(obj);
      }
    });

    // Generate and add room rectangles
    const layoutRooms = generateBasicLayout(generatedRooms, canvasSize.width / 15, canvasSize.height / 15);
    const optimizedRooms = optimizeLayout(layoutRooms);

    optimizedRooms.forEach(room => {
      const rect = new Rect({
        left: room.x,
        top: room.y,
        width: room.width * 15,
        height: room.height * 15,
        fill: `${room.color}40`,
        stroke: room.color,
        strokeWidth: 2,
        selectable: true,
      });

      const label = new IText(room.type, {
        left: room.x + (room.width * 15) / 2,
        top: room.y + (room.height * 15) / 2,
        fontSize: isMobile ? 14 : 12,
        fill: "#1f2937",
        fontFamily: "Arial",
        textAlign: "center",
        originX: "center",
        originY: "center",
        selectable: true,
      });

      fabricCanvas.add(rect);
      fabricCanvas.add(label);
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, generatedRooms, canvasSize, isMobile]);

  // Update drawing mode based on active tool
  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "pen";
    fabricCanvas.selection = activeTool !== "pen";
    (fabricCanvas as any).skipTargetFind = activeTool === "pen";
    
    if (fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = "#2563eb";
      fabricCanvas.freeDrawingBrush.width = isMobile ? 4 : 3;
      (fabricCanvas.freeDrawingBrush as any).decimate = 2;
    }
  }, [activeTool, fabricCanvas, isMobile]);

  // Handle shape creation with touch-optimized sizes
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (e: any) => {
      if (activeTool === "select" || activeTool === "pen") return;

      const pointer = fabricCanvas.getPointer(e.e);
      const touchScale = isMobile ? 1.5 : 1; // Make shapes larger on mobile
      
      switch (activeTool) {
        case "rectangle":
          const rect = new Rect({
            left: pointer.x,
            top: pointer.y,
            width: 100 * touchScale,
            height: 60 * touchScale,
            fill: "transparent",
            stroke: "#d97706",
            strokeWidth: isMobile ? 3 : 2,
          });
          fabricCanvas.add(rect);
          fabricCanvas.setActiveObject(rect);
          setTimeout(() => onCanvasChange(JSON.stringify(fabricCanvas.toJSON())), 10);
          break;

        case "circle":
          const circle = new Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 40 * touchScale,
            fill: "transparent",
            stroke: "#dc2626",
            strokeWidth: isMobile ? 3 : 2,
          });
          fabricCanvas.add(circle);
          fabricCanvas.setActiveObject(circle);
          setTimeout(() => onCanvasChange(JSON.stringify(fabricCanvas.toJSON())), 10);
          break;

        case "line":
          const line = new Line([pointer.x, pointer.y, pointer.x + 100 * touchScale, pointer.y], {
            stroke: "#059669",
            strokeWidth: isMobile ? 3 : 2,
          });
          fabricCanvas.add(line);
          fabricCanvas.setActiveObject(line);
          setTimeout(() => onCanvasChange(JSON.stringify(fabricCanvas.toJSON())), 10);
          break;

        case "text":
          const text = new IText("Room Label", {
            left: pointer.x,
            top: pointer.y,
            fontSize: isMobile ? 18 : 16,
            fill: "#1f2937",
            fontFamily: "Arial",
          });
          fabricCanvas.add(text);
          fabricCanvas.setActiveObject(text);
          if (!isMobile) {
            text.enterEditing();
          }
          setTimeout(() => onCanvasChange(JSON.stringify(fabricCanvas.toJSON())), 10);
          break;
      }

      fabricCanvas.renderAll();
    };

    fabricCanvas.on("mouse:down", handleMouseDown);

    return () => {
      fabricCanvas.off("mouse:down", handleMouseDown);
    };
  }, [activeTool, fabricCanvas, isMobile]);

  // Handle undo/redo (avoid redundant reload that causes flicker)
  useEffect(() => {
    if (!fabricCanvas || canvasHistory.length === 0 || historyIndex < 0) return;

    const historyState = canvasHistory[historyIndex];
    if (!historyState) return;

    try {
      const currentState = JSON.stringify(fabricCanvas.toJSON());
      if (currentState === historyState) return; // Already at this state

      fabricCanvas.loadFromJSON(JSON.parse(historyState), () => {
        fabricCanvas.renderAll();
      });
    } catch (e) {
      console.warn('Failed to load canvas history state', e);
    }
  }, [fabricCanvas, canvasHistory, historyIndex]);

  // Draw responsive grid
  const drawGrid = useCallback((zoom: number) => {
    if (!backgroundCanvasRef.current || !fabricCanvas) return;

    const canvas = backgroundCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match fabric canvas
    if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
    }

    // Clear and set background
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Get viewport transform from Fabric
    const vt = fabricCanvas.viewportTransform;
    const scaleX = vt[0];
    const scaleY = vt[3];
    const transX = vt[4];
    const transY = vt[5];

    // Apply transform
    ctx.save();
    ctx.setTransform(scaleX, 0, 0, scaleY, transX, transY);

    // Calculate visible bounds
    const worldLeft = -transX / scaleX;
    const worldTop = -transY / scaleY;
    const worldRight = worldLeft + canvas.width / scaleX;
    const worldBottom = worldTop + canvas.height / scaleY;

    // Grid sizes (responsive to canvas size and zoom)
    const baseGridSize = Math.min(canvasSize.width, canvasSize.height) / 50; // Adaptive grid size
    const major = baseGridSize * 5; // Major lines every 5 units
    const minor = baseGridSize; // Minor lines every unit

    // Determine grid levels based on zoom
    const zoomPercent = scaleX * 100;
    
    // Show minor grid lines only when zoomed in enough
    const showMinorGrid = zoomPercent >= 125;
    
    // Minor grid lines (1ft intervals)
    if (showMinorGrid) {
      ctx.strokeStyle = "rgba(200, 200, 200, 0.4)";
      ctx.lineWidth = Math.max(0.5 / scaleX, 0.3 / scaleX);

      const startMinorX = Math.floor(worldLeft / minor) * minor;
      const startMinorY = Math.floor(worldTop / minor) * minor;

      for (let x = startMinorX; x <= worldRight + minor; x += minor) {
        if (Math.round(x % major) !== 0) {
          ctx.beginPath();
          ctx.moveTo(x, worldTop);
          ctx.lineTo(x, worldBottom);
          ctx.stroke();
        }
      }

      for (let y = startMinorY; y <= worldBottom + minor; y += minor) {
        if (Math.round(y % major) !== 0) {
          ctx.beginPath();
          ctx.moveTo(worldLeft, y);
          ctx.lineTo(worldRight, y);
          ctx.stroke();
        }
      }
    }

    // Major grid lines (5ft intervals) - always show above 50%
    if (zoomPercent >= 50) {
      ctx.strokeStyle = "rgba(120, 120, 120, 0.7)";
      ctx.lineWidth = Math.max(1.2 / scaleX, 0.8 / scaleX);

      const startMajorX = Math.floor(worldLeft / major) * major;
      const startMajorY = Math.floor(worldTop / major) * major;

      for (let x = startMajorX; x <= worldRight + major; x += major) {
        ctx.beginPath();
        ctx.moveTo(x, worldTop);
        ctx.lineTo(x, worldBottom);
        ctx.stroke();
      }

      for (let y = startMajorY; y <= worldBottom + major; y += major) {
        ctx.beginPath();
        ctx.moveTo(worldLeft, y);
        ctx.lineTo(worldRight, y);
        ctx.stroke();
      }
    }

    // Super major grid lines (10ft intervals) - always show
    ctx.strokeStyle = "rgba(80, 80, 80, 0.8)";
    ctx.lineWidth = Math.max(1.5 / scaleX, 1 / scaleX);

    const superMajor = major * 2; // 10ft intervals
    const startSuperMajorX = Math.floor(worldLeft / superMajor) * superMajor;
    const startSuperMajorY = Math.floor(worldTop / superMajor) * superMajor;

    for (let x = startSuperMajorX; x <= worldRight + superMajor; x += superMajor) {
      ctx.beginPath();
      ctx.moveTo(x, worldTop);
      ctx.lineTo(x, worldBottom);
      ctx.stroke();
    }

    for (let y = startSuperMajorY; y <= worldBottom + superMajor; y += superMajor) {
      ctx.beginPath();
      ctx.moveTo(worldLeft, y);
      ctx.lineTo(worldRight, y);
      ctx.stroke();
    }

    ctx.restore();

    // Draw compass and labels in screen space
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(48, 62, 84, 0.9)";
    ctx.font = `${isMobile ? 14 : 12}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Determine label interval based on zoom level
    let labelInterval, labelStep;
    if (zoomPercent >= 125) {
      // Show all numbers (1,2,3,4,5...)
      labelInterval = minor;
      labelStep = 1;
    } else if (zoomPercent >= 50) {
      // Show major markings only (5,10,15...)
      labelInterval = major;
      labelStep = 5;
    } else {
      // Show super major markings only (10,20,30...)
      labelInterval = superMajor;
      labelStep = 10;
    }

    // X labels (top)
    const startLabelX = Math.floor(worldLeft / labelInterval) * labelInterval;
    for (let x = startLabelX; x <= worldRight + labelInterval; x += labelInterval) {
      const meters = Math.round(x / baseGridSize);
      if (meters % labelStep === 0 || zoomPercent >= 125) {
        const sx = x * scaleX + transX;
        if (sx >= 20 && sx <= canvas.width - 20) {
          ctx.fillText(`${meters}ft`, sx, 15);
        }
      }
    }

    // Y labels (left)
    const startLabelY = Math.floor(worldTop / labelInterval) * labelInterval;
    for (let y = startLabelY; y <= worldBottom + labelInterval; y += labelInterval) {
      const meters = Math.round(y / baseGridSize);
      if (meters % labelStep === 0 || zoomPercent >= 125) {
        const sy = y * scaleY + transY;
        if (sy >= 20 && sy <= canvas.height - 20) {
          ctx.save();
          ctx.translate(15, sy);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(`${meters}ft`, 0, 0);
          ctx.restore();
        }
      }
    }

    // Compass
    const compassSize = isMobile ? 30 : 22;
    const compassX = isMobile ? 80 : 65;
    const compassY = isMobile ? 80 : 65;

    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.strokeStyle = "rgba(80, 80, 80, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(compassX, compassY, compassSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // North arrow
    ctx.strokeStyle = "rgba(80, 80, 80, 0.9)";
    ctx.fillStyle = "rgba(80, 80, 80, 0.9)";
    ctx.beginPath();
    ctx.moveTo(compassX, compassY + compassSize * 0.5);
    ctx.lineTo(compassX, compassY - compassSize * 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(compassX, compassY - compassSize * 0.5);
    ctx.lineTo(compassX - 5, compassY - compassSize * 0.3);
    ctx.lineTo(compassX + 5, compassY - compassSize * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.font = `${isMobile ? 16 : 13}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("N", compassX, compassY - compassSize - 12);
    ctx.restore();
  }, [fabricCanvas, canvasSize, isMobile]);

  // Update grid when canvas changes
  useEffect(() => {
    if (!fabricCanvas) return;

    const updateGrid = () => {
      const zoom = fabricCanvas.getZoom();
      drawGrid(zoom);
    };

    updateGrid();
    fabricCanvas.on('after:render', updateGrid);

    return () => {
      fabricCanvas.off('after:render', updateGrid);
    };
  }, [fabricCanvas, drawGrid]);

  // Touch gesture handlers
  const handleZoomChange = useCallback((newZoom: number) => {
    if (!fabricCanvas) return;
    setZoomLevel(newZoom);
    fabricCanvas.zoomToPoint({ x: containerSize.width / 2, y: containerSize.height / 2 } as any, newZoom);
  }, [fabricCanvas, containerSize]);

  const handlePanChange = useCallback((newOffset: { x: number; y: number }) => {
    if (!fabricCanvas) return;
    setPanOffset(newOffset);
    const vt = fabricCanvas.viewportTransform;
    vt[4] = newOffset.x * zoomLevel;
    vt[5] = newOffset.y * zoomLevel;
    fabricCanvas.requestRenderAll();
  }, [fabricCanvas, zoomLevel]);

  const canvasContent = (
    <div 
      ref={containerRef}
      className="relative w-full bg-background rounded-lg overflow-hidden"
      style={{ height: `${containerSize.height}px` }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="relative bg-white"
          style={{ 
            width: `${canvasSize.width}px`, 
            height: `${canvasSize.height}px`,
            minWidth: '100%',
            minHeight: '100%'
          }}
        >
          <canvas
            ref={backgroundCanvasRef}
            className="absolute inset-0 z-0"
            style={{ 
              width: `${canvasSize.width}px`, 
              height: `${canvasSize.height}px` 
            }}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10"
            style={{ 
              width: `${canvasSize.width}px`, 
              height: `${canvasSize.height}px` 
            }}
          />
        </div>
      </div>
    </div>
  );

  // Wrap with touch gestures on mobile
  if (isMobile) {
    return (
      <TouchCanvasWrapper
        onZoomChange={handleZoomChange}
        onPanChange={handlePanChange}
        zoomLevel={zoomLevel}
        panOffset={panOffset}
        disabled={activeTool === "pen"} // Disable gestures when drawing
        className="w-full"
      >
        {canvasContent}
      </TouchCanvasWrapper>
    );
  }

  return canvasContent;
});

ResponsiveDrawingCanvas.displayName = "ResponsiveDrawingCanvas";