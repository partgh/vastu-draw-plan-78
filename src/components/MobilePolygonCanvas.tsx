import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { Canvas as FabricCanvas, Polygon, IText, Circle, Line, Rect } from "fabric";
import { Room } from "./DimensionInput";
import { MobileAreaSelector } from "./MobileAreaSelector";
import { MobileZoomControls } from "./MobileZoomControls";
import { TouchCanvasWrapper } from "./TouchCanvasWrapper";
import { generateBasicLayout, optimizeLayout } from "@/utils/mapGenerator";
import { toast } from "sonner";

interface MobilePolygonCanvasProps {
  activeTool: "select" | "rectangle" | "circle" | "line" | "pen" | "text" | "area";
  generatedRooms?: Room[];
  canvasHistory: string[];
  historyIndex: number;
  onCanvasChange: (stateJSON: string) => void;
}

export interface MobilePolygonCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  exportPNGCropped: () => string | null;
}

interface AreaData {
  id: string;
  type: string;
  points: { x: number; y: number }[];
  areaSqFt: number;
  color: string;
  fabricPolygon?: Polygon;
  fabricLabel?: IText;
  fabricHandles?: Circle[];
}

const GRID_SIZE = 20; // 20px = 1 foot
const CANVAS_SIZE = 2500;

const areaColors: { [key: string]: string } = {
  bedroom: "#3b82f6",
  kitchen: "#ef4444", 
  "living-room": "#10b981",
  washroom: "#06b6d4",
  balcony: "#84cc16",
  entrance: "#8b5cf6",
  stairs: "#6b7280",
  lobby: "#f59e0b"
};

export const MobilePolygonCanvas = forwardRef<MobilePolygonCanvasHandle, MobilePolygonCanvasProps>(({ 
  activeTool,
  generatedRooms = [],
  canvasHistory,
  historyIndex,
  onCanvasChange
}: MobilePolygonCanvasProps, ref) => {
  console.log('MobilePolygonCanvas rendered with activeTool:', activeTool); // Debug log
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  
  // Canvas state
  const [zoomLevel, setZoomLevel] = useState(0.4);
  const [panOffset, setPanOffset] = useState({ x: 200, y: 200 });
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [showGrid, setShowGrid] = useState(true);
  
  // Area drawing state
  const [selectedAreaType, setSelectedAreaType] = useState("bedroom");
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [currentPolygonPoints, setCurrentPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  
  // Touch handling state
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Responsive sizing
  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current) return;
    
    const viewportHeight = window.innerHeight;
    const headerHeight = 60;
    const bottomSelectorHeight = 180;
    const availableHeight = viewportHeight - headerHeight - bottomSelectorHeight;
    
    const newContainerSize = {
      width: window.innerWidth,
      height: Math.max(availableHeight, 400)
    };
    
    setContainerSize(newContainerSize);
  }, []);

  // Canvas methods
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (!fabricCanvas) return;
      const newZoom = Math.min(zoomLevel * 1.2, 3);
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

  // Utility functions
  const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;
  
  const calculatePolygonArea = (points: { x: number; y: number }[]): number => {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    return Math.round(area / (GRID_SIZE * GRID_SIZE)); // Convert to square feet
  };

  const getCanvasPoint = (clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas || !fabricCanvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // More accurate coordinate calculation accounting for CSS transforms
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    
    // Inverse transform to get canvas coordinates
    const canvasX = (relativeX / zoomLevel) - panOffset.x;
    const canvasY = (relativeY / zoomLevel) - panOffset.y;
    
    console.log('Touch coords:', { clientX, clientY, relativeX, relativeY });
    console.log('Canvas coords:', { canvasX, canvasY });
    console.log('Transform:', { zoomLevel, panOffset });
    
    return { 
      x: snapToGrid(canvasX), 
      y: snapToGrid(canvasY) 
    };
  };

  // Initialize canvas
  useEffect(() => {
    updateCanvasSize();
    
    const handleResize = () => {
      setTimeout(updateCanvasSize, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [updateCanvasSize]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: "transparent",
    });

    canvas.enableRetinaScaling = true;

    // Zoom and pan handling
    canvas.on('mouse:wheel', (opt: any) => {
      if (opt.e.touches) return; // Ignore wheel events from touch
      
      const e = opt.e;
      let zoom = canvas.getZoom();
      const delta = e.deltaY;
      zoom *= Math.pow(0.999, delta);
      zoom = Math.min(Math.max(zoom, 0.1), 3);
      
      const point = { x: e.offsetX, y: e.offsetY } as any;
      canvas.zoomToPoint(point, zoom);
      setZoomLevel(zoom);
      canvas.requestRenderAll();
      e.preventDefault();
      e.stopPropagation();
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Update canvas dimensions
  useEffect(() => {
    if (!fabricCanvas) return;
    
    fabricCanvas.setDimensions({
      width: CANVAS_SIZE,
      height: CANVAS_SIZE
    });
    fabricCanvas.renderAll();
  }, [fabricCanvas, containerSize]);

  // Generate rooms from dimensions (add this missing functionality)
  useEffect(() => {
    if (!fabricCanvas || generatedRooms.length === 0) return;

    console.log('MobilePolygonCanvas: Rendering generated rooms', generatedRooms); // Debug log

    // Clear existing generated room objects but keep areas and paths
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      // Remove objects that are generated rooms (rectangles and text that aren't areas)
      if ((obj.type === 'rect' || obj.type === 'i-text') && !(obj as any).isArea) {
        fabricCanvas.remove(obj);
      }
    });

    // Generate and add room rectangles using the same logic as DrawingCanvas
    const layoutRooms = generateBasicLayout(generatedRooms, 400, 400); // Use same grid size
    const optimizedRooms = optimizeLayout(layoutRooms);

    const POS_SCALE = GRID_SIZE / 15; // Convert from mapGenerator scale to our scale

    optimizedRooms.forEach(room => {
      const rect = new Rect({
        left: room.x * POS_SCALE,
        top: room.y * POS_SCALE,
        width: room.width * GRID_SIZE,
        height: room.height * GRID_SIZE,
        fill: `${room.color}40`, // Semi-transparent fill
        stroke: room.color,
        strokeWidth: 2,
        selectable: true,
        isGeneratedRoom: true, // Mark as generated room
      });

      // Add room label
      const label = new IText(room.type, {
        left: room.x * POS_SCALE + (room.width * GRID_SIZE) / 2,
        top: room.y * POS_SCALE + (room.height * GRID_SIZE) / 2,
        fontSize: 12,
        fill: "#1f2937",
        fontFamily: "Arial",
        textAlign: "center",
        originX: "center",
        originY: "center",
        selectable: true,
        isGeneratedRoom: true, // Mark as generated room
      });

      fabricCanvas.add(rect);
      fabricCanvas.add(label);
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, generatedRooms]);

  // Handle area creation and management
  const createFabricArea = (areaData: AreaData) => {
    if (!fabricCanvas) return;

    // Create polygon using simple point array format
    const points = areaData.points;
    const polygon = new Polygon(points, {
      fill: areaData.color + '40',
      stroke: areaData.color,
      strokeWidth: 2,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      transparentCorners: false,
      cornerColor: areaData.color,
      cornerStyle: 'circle',
      cornerSize: 8,
      borderColor: areaData.color,
      borderDashArray: [5, 5],
    });

    // Calculate centroid for label placement
    const centroidX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const centroidY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    // Create label with proper capitalization
    const areaName = areaData.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const label = new IText(`${areaName}\n${areaData.areaSqFt} sq ft`, {
      left: centroidX,
      top: centroidY,
      fontSize: 16,
      fill: areaData.color,
      fontFamily: "Arial, sans-serif",
      fontWeight: 'bold',
      textAlign: "center",
      originX: "center",
      originY: "center",
      selectable: false,
      evented: false,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      padding: 4,
    });

    // Store references
    areaData.fabricPolygon = polygon;
    areaData.fabricLabel = label;

    // Add to canvas
    fabricCanvas.add(polygon);
    fabricCanvas.add(label);

    // Handle selection
    polygon.on('selected', () => {
      setSelectedAreaId(areaData.id);
    });

    polygon.on('deselected', () => {
      setSelectedAreaId(null);
    });

    // Update label position when polygon moves
    polygon.on('moving', () => {
      const center = polygon.getCenterPoint();
      label.set({
        left: center.x,
        top: center.y
      });
    });

    fabricCanvas.renderAll();
  };

  const handleCanvasTouch = (e: React.TouchEvent | React.MouseEvent) => {
    console.log('🔥 Canvas touch event triggered:', e.type, 'activeTool:', activeTool, 'isDrawing:', isDrawingPolygon); // Debug log
    
    // Only handle area tool interactions
    if (activeTool !== "area") {
      console.log('❌ Not area tool, ignoring touch');
      return;
    }
    
    // CRITICAL: Stop event propagation to prevent other handlers from interfering
    e.stopPropagation();
    e.preventDefault();
    
    let clientX: number, clientY: number;
    let isTouchEvent = false;
    
    if ('touches' in e) {
      // Handle both ongoing touches and changedTouches
      const touches = e.type === "touchend" ? e.changedTouches : e.touches;
      console.log('👆 Touch event - touches length:', touches.length);
      if (touches.length !== 1) {
        console.log('❌ Multiple touches detected, ignoring');
        return;
      }
      const touch = touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
      isTouchEvent = true;
      console.log('📍 Touch coordinates:', { clientX, clientY });
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
      console.log('🖱️ Mouse coordinates:', { clientX, clientY });
    }
    
    const point = getCanvasPoint(clientX, clientY);
    console.log('🎯 Calculated canvas point:', point);
    
    if (e.type === "touchstart" || e.type === "mousedown") {
      console.log('⬇️ Touch/Mouse DOWN detected');
      setTouchStartPos(point);
      setTouchStartTime(Date.now());
      
      if (isTouchEvent) {
        const timer = setTimeout(() => {
          console.log('⏰ Long press timeout triggered');
        }, 600);
        setLongPressTimer(timer);
      }
      
    } else if (e.type === "touchend" || e.type === "mouseup") {
      console.log('⬆️ Touch/Mouse UP detected');
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      
      const timeDiff = Date.now() - touchStartTime;
      const distance = Math.sqrt(
        Math.pow(point.x - touchStartPos.x, 2) + 
        Math.pow(point.y - touchStartPos.y, 2)
      );
      
      console.log('📏 Touch end analysis - time:', timeDiff, 'distance:', distance);
      
      // More generous tap detection for mobile
      if (distance < 40 && timeDiff < 800) {
        console.log('✅ Valid tap detected, calling handleCanvasTap');
        handleCanvasTap(point);
      } else {
        console.log('❌ Invalid tap - distance too far or time too long');
      }
    }
  };

  const handleCanvasTap = (point: { x: number; y: number }) => {
    console.log('🎯 Canvas tap at point:', point, 'isDrawing:', isDrawingPolygon, 'currentPoints:', currentPolygonPoints.length);
    
    if (!isDrawingPolygon) {
      // Start new polygon
      console.log('🆕 Starting new polygon');
      setIsDrawingPolygon(true);
      setCurrentPolygonPoints([point]);
      toast(`Started drawing ${selectedAreaType.replace('-', ' ')}. Tap to add points, tap near start to finish.`);
    } else {
      const firstPoint = currentPolygonPoints[0];
      const distance = Math.sqrt(
        Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
      );
      
      console.log('📏 Distance to first point:', distance);
      
      // Close polygon if near start point and have at least 3 points
      if (distance < 60 && currentPolygonPoints.length >= 3) {
        console.log('🔄 Closing polygon');
        const newArea: AreaData = {
          id: `area-${Date.now()}`,
          type: selectedAreaType,
          points: [...currentPolygonPoints],
          areaSqFt: calculatePolygonArea(currentPolygonPoints),
          color: areaColors[selectedAreaType] || "#6b7280"
        };
        
        console.log('✨ Creating area:', newArea);
        setAreas(prev => [...prev, newArea]);
        createFabricArea(newArea);
        setCurrentPolygonPoints([]);
        setIsDrawingPolygon(false);
        
        toast(`${selectedAreaType.replace('-', ' ')} created (${newArea.areaSqFt} sq ft)`);
        if (fabricCanvas) {
          onCanvasChange(JSON.stringify(fabricCanvas.toJSON()));
        }
      } else {
        // Add point to current polygon
        console.log('➕ Adding point to polygon');
        setCurrentPolygonPoints(prev => [...prev, point]);
        toast(`Point ${currentPolygonPoints.length + 1} added. ${currentPolygonPoints.length >= 2 ? 'Tap near start point to finish.' : ''}`);
      }
    }
  };

  const handleDeleteArea = (areaId: string) => {
    const areaToDelete = areas.find(a => a.id === areaId);
    if (!areaToDelete || !fabricCanvas) return;

    // Remove from canvas
    if (areaToDelete.fabricPolygon) fabricCanvas.remove(areaToDelete.fabricPolygon);
    if (areaToDelete.fabricLabel) fabricCanvas.remove(areaToDelete.fabricLabel);
    if (areaToDelete.fabricHandles) {
      areaToDelete.fabricHandles.forEach(handle => fabricCanvas.remove(handle));
    }

    // Remove from state
    setAreas(prev => prev.filter(a => a.id !== areaId));
    setSelectedAreaId(null);
    
    fabricCanvas.renderAll();
    onCanvasChange(JSON.stringify(fabricCanvas.toJSON()));
    toast("Area deleted");
  };

  // Grid drawing
  const drawGrid = useCallback(() => {
    if (!backgroundCanvasRef.current || !showGrid) return;

    const canvas = backgroundCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = containerSize.width * window.devicePixelRatio;
    canvas.height = containerSize.height * window.devicePixelRatio;
    canvas.style.width = `${containerSize.width}px`;
    canvas.style.height = `${containerSize.height}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear
    ctx.clearRect(0, 0, containerSize.width, containerSize.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, containerSize.width, containerSize.height);

    // Apply transforms
    ctx.save();
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(panOffset.x, panOffset.y);

    // Calculate grid steps based on zoom level
    const step = GRID_SIZE; // 20px = 1 foot
    const majorStep = GRID_SIZE * 5; // 100px = 5 feet
    const superMajorStep = GRID_SIZE * 25; // 500px = 25 feet
    
    const viewLeft = -panOffset.x;
    const viewTop = -panOffset.y;
    const viewRight = viewLeft + containerSize.width / zoomLevel;
    const viewBottom = viewTop + containerSize.height / zoomLevel;
    
    // Determine which grid levels to show based on zoom
    const showMinorGrid = zoomLevel >= 0.6; // Show 1-foot grid when zoomed in
    const showMajorGrid = zoomLevel >= 0.2; // Show 5-foot grid at medium zoom
    const showSuperMajorGrid = true; // Always show 25-foot grid
    
    // Super major grid lines (25 feet) - always visible
    if (showSuperMajorGrid) {
      ctx.strokeStyle = "rgba(80, 80, 80, 0.8)";
      ctx.lineWidth = 2 / zoomLevel;
      
      for (let x = Math.floor(viewLeft / superMajorStep) * superMajorStep; x <= viewRight; x += superMajorStep) {
        ctx.beginPath();
        ctx.moveTo(x, viewTop);
        ctx.lineTo(x, viewBottom);
        ctx.stroke();
      }
      
      for (let y = Math.floor(viewTop / superMajorStep) * superMajorStep; y <= viewBottom; y += superMajorStep) {
        ctx.beginPath();
        ctx.moveTo(viewLeft, y);
        ctx.lineTo(viewRight, y);
        ctx.stroke();
      }
    }
    
    // Major grid lines (5 feet)
    if (showMajorGrid) {
      ctx.strokeStyle = "rgba(120, 120, 120, 0.6)";
      ctx.lineWidth = 1 / zoomLevel;
      
      for (let x = Math.floor(viewLeft / majorStep) * majorStep; x <= viewRight; x += majorStep) {
        if (x % superMajorStep !== 0) { // Don't draw over super major lines
          ctx.beginPath();
          ctx.moveTo(x, viewTop);
          ctx.lineTo(x, viewBottom);
          ctx.stroke();
        }
      }
      
      for (let y = Math.floor(viewTop / majorStep) * majorStep; y <= viewBottom; y += majorStep) {
        if (y % superMajorStep !== 0) { // Don't draw over super major lines
          ctx.beginPath();
          ctx.moveTo(viewLeft, y);
          ctx.lineTo(viewRight, y);
          ctx.stroke();
        }
      }
    }

    // Minor grid lines (1 foot) - only when zoomed in
    if (showMinorGrid) {
      ctx.strokeStyle = "rgba(200, 200, 200, 0.4)";
      ctx.lineWidth = 0.5 / zoomLevel;
      
      for (let x = Math.floor(viewLeft / step) * step; x <= viewRight; x += step) {
        if (x % majorStep !== 0) { // Don't draw over major lines
          ctx.beginPath();
          ctx.moveTo(x, viewTop);
          ctx.lineTo(x, viewBottom);
          ctx.stroke();
        }
      }
      
      for (let y = Math.floor(viewTop / step) * step; y <= viewBottom; y += step) {
        if (y % majorStep !== 0) { // Don't draw over major lines
          ctx.beginPath();
          ctx.moveTo(viewLeft, y);
          ctx.lineTo(viewRight, y);
          ctx.stroke();
        }
      }
    }

    // Draw rulers with appropriate markings based on zoom
    const rulerHeight = 30;
    const rulerWidth = 30;
    
    // Top ruler
    ctx.fillStyle = "rgba(240, 240, 240, 0.9)";
    ctx.fillRect(viewLeft, viewTop, viewRight - viewLeft, rulerHeight);
    
    // Left ruler  
    ctx.fillRect(viewLeft, viewTop, rulerWidth, viewBottom - viewTop);
    
    // Ruler markings
    ctx.fillStyle = "rgba(60, 60, 60, 0.8)";
    ctx.font = `${Math.max(10, 12 / zoomLevel)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Top ruler markings
    const rulerStep = showMinorGrid ? majorStep : superMajorStep;
    for (let x = Math.ceil(viewLeft / rulerStep) * rulerStep; x <= viewRight; x += rulerStep) {
      const feet = Math.round(x / GRID_SIZE);
      if (feet !== 0) {
        // Tick mark
        ctx.strokeStyle = "rgba(60, 60, 60, 0.8)";
        ctx.lineWidth = 1 / zoomLevel;
        ctx.beginPath();
        ctx.moveTo(x, viewTop + rulerHeight - 8);
        ctx.lineTo(x, viewTop + rulerHeight);
        ctx.stroke();
        
        // Number
        ctx.fillText(feet.toString(), x, viewTop + rulerHeight / 2);
      }
    }
    
    // Left ruler markings
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = Math.ceil(viewTop / rulerStep) * rulerStep; y <= viewBottom; y += rulerStep) {
      const feet = Math.round(y / GRID_SIZE);
      if (feet !== 0) {
        // Tick mark
        ctx.strokeStyle = "rgba(60, 60, 60, 0.8)";
        ctx.lineWidth = 1 / zoomLevel;
        ctx.beginPath();
        ctx.moveTo(viewLeft + rulerWidth - 8, y);
        ctx.lineTo(viewLeft + rulerWidth, y);
        ctx.stroke();
        
        // Number (rotated)
        ctx.save();
        ctx.translate(viewLeft + rulerWidth / 2, y);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(feet.toString(), 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();

    ctx.restore();
  }, [containerSize, zoomLevel, panOffset, showGrid]);

  // Draw current polygon being created
  useEffect(() => {
    if (!fabricCanvas) return;
    
    // Remove previous temp objects
    const tempObjects = fabricCanvas.getObjects().filter((obj: any) => obj.isTemp);
    tempObjects.forEach(obj => fabricCanvas.remove(obj));
    
    if (currentPolygonPoints.length > 0) {
      // Draw temporary polygon outline
      for (let i = 0; i < currentPolygonPoints.length; i++) {
        const point = currentPolygonPoints[i];
        
        // Draw point
        const circle = new Circle({
          left: point.x,
          top: point.y,
          radius: 4,
          fill: i === 0 ? "#ef4444" : areaColors[selectedAreaType] || "#6b7280",
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
          //@ts-ignore
          isTemp: true
        });
        
        fabricCanvas.add(circle);
        
        // Draw line to previous point
        if (i > 0) {
          const prevPoint = currentPolygonPoints[i - 1];
          const line = new Line([prevPoint.x, prevPoint.y, point.x, point.y], {
            stroke: areaColors[selectedAreaType] || "#6b7280",
            strokeWidth: 2,
            selectable: false,
            evented: false,
            //@ts-ignore
            isTemp: true
          });
          
          fabricCanvas.add(line);
        }
      }
    }
    
    fabricCanvas.renderAll();
  }, [currentPolygonPoints, selectedAreaType, fabricCanvas]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
    if (fabricCanvas) {
      fabricCanvas.setZoom(newZoom);
      fabricCanvas.renderAll();
    }
  };

  const handlePanChange = (newOffset: { x: number; y: number }) => {
    setPanOffset(newOffset);
    if (fabricCanvas) {
      fabricCanvas.viewportTransform = [zoomLevel, 0, 0, zoomLevel, newOffset.x * zoomLevel, newOffset.y * zoomLevel];
      fabricCanvas.renderAll();
    }
  };

  const canvasContent = (
    <div ref={containerRef} className="relative w-full h-full bg-background">
      {/* Debug Info - Make it more visible */}
      <div className="absolute top-2 left-2 z-[100] bg-red-600 text-white p-3 rounded-lg shadow-lg text-sm font-mono border-2 border-white">
        <div>🎯 MOBILE POLYGON CANVAS ACTIVE</div>
        <div>Tool: {activeTool}</div>
        <div>Drawing: {isDrawingPolygon ? 'YES' : 'NO'}</div>
        <div>Points: {currentPolygonPoints.length}</div>
        <div>Selected: {selectedAreaType}</div>
        <div>Zoom: {zoomLevel.toFixed(2)}</div>
        <div>Canvas Size: {containerSize.width}x{containerSize.height}</div>
      </div>
      
      {/* Background grid canvas */}
      <canvas
        ref={backgroundCanvasRef}
        className="absolute inset-0 z-0"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Main Fabric canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10"
        style={{ 
          width: `${containerSize.width}px`, 
          height: `${containerSize.height}px`,
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: '0 0',
          touchAction: 'none' // Disable default touch behaviors
        }}
        onTouchStart={(e) => {
          console.log('🟢 CANVAS TOUCHSTART FIRED');
          handleCanvasTouch(e);
        }}
        onTouchEnd={(e) => {
          console.log('🔴 CANVAS TOUCHEND FIRED');
          handleCanvasTouch(e);
        }}
        onTouchMove={(e) => {
          console.log('🟡 CANVAS TOUCHMOVE FIRED - preventing default');
          e.preventDefault();
        }}
        onMouseDown={(e) => {
          console.log('🟢 CANVAS MOUSEDOWN FIRED');
          handleCanvasTouch(e);
        }}
        onMouseUp={(e) => {
          console.log('🔴 CANVAS MOUSEUP FIRED');
          handleCanvasTouch(e);
        }}
      />

      {/* Zoom Controls - Always visible */}
      <MobileZoomControls
        onZoomIn={() => ref && 'current' in ref && ref.current?.zoomIn()}
        onZoomOut={() => ref && 'current' in ref && ref.current?.zoomOut()}
        onResetZoom={() => {
          setZoomLevel(0.4);
          setPanOffset({ x: 200, y: 200 });
          if (fabricCanvas) {
            fabricCanvas.setZoom(0.4);
            fabricCanvas.viewportTransform = [0.4, 0, 0, 0.4, 200, 200];
            fabricCanvas.renderAll();
          }
        }}
        onToggleGrid={() => setShowGrid(!showGrid)}
        showGrid={showGrid}
        zoomLevel={zoomLevel}
      />

      {/* Area Selector - Bottom UI */}
      <MobileAreaSelector
        selectedAreaType={selectedAreaType}
        onAreaTypeSelect={setSelectedAreaType}
        isDrawingMode={isDrawingPolygon}
        areas={areas}
        onDeleteArea={handleDeleteArea}
        selectedAreaId={selectedAreaId}
      />
    </div>
  );

  // Temporarily disable TouchCanvasWrapper to debug touch issues
  return canvasContent;
  
  /* Disabled TouchCanvasWrapper for debugging
  return (
    <TouchCanvasWrapper
      onZoomChange={handleZoomChange}
      onPanChange={handlePanChange}
      zoomLevel={zoomLevel}
      panOffset={panOffset}
      disabled={isDrawingPolygon} // Disable pan/zoom gestures while drawing areas
      className="w-full h-full"
    >
      {canvasContent}
    </TouchCanvasWrapper>
  );
  */
});