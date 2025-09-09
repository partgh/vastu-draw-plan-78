import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { MobileBottomTabs } from "./MobileBottomTabs";
import { FloatingActionButtons } from "./FloatingActionButtons";
import { TouchCanvasWrapper } from "./TouchCanvasWrapper";
import { MobileEditPanel } from "./MobileEditPanel";
import { MobileZoomControls } from "./MobileZoomControls";

interface MobileCanvasDesignerV2Props {
  onBack: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface AreaData {
  id: string;
  type: string;
  points: Point[];
  areaSqFt: number;
  color: string;
  furniture?: FurnitureItem[];
}

interface FurnitureItem {
  id: string;
  name: string;
  position: Point;
  areaId: string;
  size: { width: number; height: number };
  color?: string;
}

const GRID_SIZE = 20; // 20px = 1ft
const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;

export const MobileCanvasDesignerV2 = ({ onBack }: MobileCanvasDesignerV2Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [selectedAreaType, setSelectedAreaType] = useState<string>("bedroom");
  const [showGrid, setShowGrid] = useState(true);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [zoomLevel, setZoomLevel] = useState(0.4);
  const [panOffset, setPanOffset] = useState({ x: 200, y: 200 });
  
  // Drawing states
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Furniture states
  const [selectedFurnitureItem, setSelectedFurnitureItem] = useState<string | null>(null);
  const [isPlacingFurniture, setIsPlacingFurniture] = useState(false);
  const [pendingFurniture, setPendingFurniture] = useState<{name: string, areaId: string} | null>(null);
  
  // Edit panel state
  const [editPanelOpen, setEditPanelOpen] = useState(false);
  const [editingFurniture, setEditingFurniture] = useState<FurnitureItem | null>(null);
  
  // Long press handling
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<Point>({ x: 0, y: 0 });
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  
  // Grid highlighting
  const [highlightedCell, setHighlightedCell] = useState<Point | null>(null);

  // Utility functions
  const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  const getAreaColor = (areaType: string) => {
    const colors: { [key: string]: string } = {
      bedroom: "#3b82f6",
      washroom: "#06b6d4", 
      kitchen: "#ef4444",
      "living-room": "#10b981",
      balcony: "#84cc16",
      lobby: "#f59e0b",
      stairs: "#6b7280",
      entrance: "#8b5cf6"
    };
    return colors[areaType] || "#6b7280";
  };

  const calculatePolygonArea = (points: Point[]): number => {
    if (points.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    return Math.round(area / (GRID_SIZE * GRID_SIZE));
  };

  const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
          (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
        inside = !inside;
      }
    }
    return inside;
  };

  // Canvas drawing
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to fill viewport properly
    const container = canvas.parentElement;
    if (container) {
      // Calculate available height (viewport minus header, rulers and bottom nav)
      const viewportHeight = window.innerHeight;
      const headerHeight = 80; // Header height
      const bottomNavHeight = 80; // Bottom navigation height
      const rulerHeight = 40; // Top ruler height
      const availableHeight = viewportHeight - headerHeight - bottomNavHeight - rulerHeight;
      
      // Use full viewport width and calculated height (accounting for left ruler)
      const rulerWidth = 40; // Left ruler width
      const canvasWidth = window.innerWidth - rulerWidth;
      const canvasHeight = Math.max(availableHeight, 400);
      
      canvas.width = canvasWidth * window.devicePixelRatio;
      canvas.height = canvasHeight * window.devicePixelRatio;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply transforms
    ctx.save();
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(panOffset.x, panOffset.y);

    // Draw grid that covers entire canvas area
    if (showGrid) {
      const viewLeft = -panOffset.x;
      const viewTop = -panOffset.y;
      const viewRight = viewLeft + (canvas.width / window.devicePixelRatio) / zoomLevel;
      const viewBottom = viewTop + (canvas.height / window.devicePixelRatio) / zoomLevel;
      
      const step = GRID_SIZE;
      const stepMajor = GRID_SIZE * 5;
      
      // Extend grid to fill entire canvas area
      const gridLeft = Math.floor(viewLeft / step) * step - step * 10;
      const gridTop = Math.floor(viewTop / step) * step - step * 10;
      const gridRight = viewRight + step * 10;
      const gridBottom = viewBottom + step * 10;
      
      // Minor lines (1ft grid)
      ctx.strokeStyle = "rgba(200, 200, 200, 0.4)";
      ctx.lineWidth = Math.max(0.5 / zoomLevel, 0.25);
      
      for (let x = gridLeft; x <= gridRight; x += step) {
        if (x % stepMajor !== 0) {
          ctx.beginPath();
          ctx.moveTo(x, gridTop);
          ctx.lineTo(x, gridBottom);
          ctx.stroke();
        }
      }
      
      for (let y = gridTop; y <= gridBottom; y += step) {
        if (y % stepMajor !== 0) {
          ctx.beginPath();
          ctx.moveTo(gridLeft, y);
          ctx.lineTo(gridRight, y);
          ctx.stroke();
        }
      }

      // Major lines (5ft grid)
      ctx.strokeStyle = "rgba(120, 120, 120, 0.6)";
      ctx.lineWidth = Math.max(1.5 / zoomLevel, 0.75);
      
      for (let x = Math.floor(gridLeft / stepMajor) * stepMajor; x <= gridRight; x += stepMajor) {
        ctx.beginPath();
        ctx.moveTo(x, gridTop);
        ctx.lineTo(x, gridBottom);
        ctx.stroke();
      }
      
      for (let y = Math.floor(gridTop / stepMajor) * stepMajor; y <= gridBottom; y += stepMajor) {
        ctx.beginPath();
        ctx.moveTo(gridLeft, y);
        ctx.lineTo(gridRight, y);
        ctx.stroke();
      }

      // Draw grid dots for better visual selection
      ctx.fillStyle = "rgba(100, 100, 100, 0.3)";
      const dotSize = Math.max(3 / zoomLevel, 2);
      
      for (let x = gridLeft; x <= gridRight; x += step) {
        for (let y = gridTop; y <= gridBottom; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Highlight selected cell
      if (highlightedCell) {
        ctx.fillStyle = "rgba(59, 130, 246, 0.5)"; // Blue highlight
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = Math.max(2 / zoomLevel, 1);
        
        const cellSize = GRID_SIZE;
        const halfSize = cellSize / 2;
        
        ctx.fillRect(
          highlightedCell.x - halfSize,
          highlightedCell.y - halfSize,
          cellSize,
          cellSize
        );
        ctx.strokeRect(
          highlightedCell.x - halfSize,
          highlightedCell.y - halfSize,
          cellSize,
          cellSize
        );
        
        // Draw center dot
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(highlightedCell.x, highlightedCell.y, Math.max(4 / zoomLevel, 2), 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Draw areas
    areas.forEach(area => {
      if (area.points.length < 3) return;

      // Fill
      ctx.fillStyle = `${area.color}30`;
      ctx.strokeStyle = area.color;
      ctx.lineWidth = Math.max(2 / zoomLevel, 1);

      ctx.beginPath();
      ctx.moveTo(area.points[0].x, area.points[0].y);
      area.points.forEach((point, i) => {
        if (i > 0) ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Vertices
      const vertexSize = Math.max(8 / zoomLevel, 4);
      area.points.forEach(point => {
        ctx.fillStyle = area.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, vertexSize, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Furniture
      if (area.furniture) {
        area.furniture.forEach(furniture => {
          const isSelected = selectedFurnitureItem === furniture.id;
          
          ctx.fillStyle = furniture.color || "#8B4513";
          ctx.strokeStyle = isSelected ? "#007ACC" : "#654321";
          ctx.lineWidth = isSelected ? Math.max(3 / zoomLevel, 2) : Math.max(2 / zoomLevel, 1);

          const w = furniture.size.width;
          const h = furniture.size.height;
          
          ctx.fillRect(furniture.position.x - w/2, furniture.position.y - h/2, w, h);
          ctx.strokeRect(furniture.position.x - w/2, furniture.position.y - h/2, w, h);

          // Selection handles
          if (isSelected) {
            const handleSize = Math.max(24 / zoomLevel, 12);
            const corners = [
              { x: furniture.position.x - w/2, y: furniture.position.y - h/2 },
              { x: furniture.position.x + w/2, y: furniture.position.y - h/2 },
              { x: furniture.position.x - w/2, y: furniture.position.y + h/2 },
              { x: furniture.position.x + w/2, y: furniture.position.y + h/2 }
            ];
            
            corners.forEach(corner => {
              ctx.fillStyle = "#FF6B35";
              ctx.strokeStyle = "#FFFFFF";
              ctx.lineWidth = Math.max(2 / zoomLevel, 1);
              
              ctx.beginPath();
              ctx.arc(corner.x, corner.y, handleSize / 2, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
            });
          }

          // Label
          ctx.fillStyle = "#000000";
          ctx.font = `${Math.max(10, 12 / zoomLevel)}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(furniture.name, furniture.position.x, furniture.position.y + h/2 + 4);
        });
      }

      // Area label
      const centroid = area.points.reduce(
        (acc, point) => ({
          x: acc.x + point.x / area.points.length,
          y: acc.y + point.y / area.points.length
        }),
        { x: 0, y: 0 }
      );

      ctx.fillStyle = area.color;
      ctx.font = `bold ${Math.max(12, 14 / zoomLevel)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${area.areaSqFt} sq ft`, centroid.x, centroid.y);
    });

    // Draw current polygon
    if (currentPolygon.length > 0) {
      ctx.strokeStyle = getAreaColor(selectedAreaType);
      ctx.lineWidth = Math.max(2 / zoomLevel, 1);
      
      ctx.beginPath();
      ctx.moveTo(currentPolygon[0].x, currentPolygon[0].y);
      currentPolygon.forEach((point, i) => {
        if (i > 0) ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      // Vertices
      currentPolygon.forEach((point, index) => {
        ctx.fillStyle = index === 0 ? "#ff0000" : getAreaColor(selectedAreaType);
        ctx.beginPath();
        ctx.arc(point.x, point.y, Math.max(6 / zoomLevel, 3), 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    ctx.restore();
  }, [areas, currentPolygon, selectedAreaType, showGrid, zoomLevel, panOffset, selectedFurnitureItem]);

  // Event handlers
  const getCanvasPoint = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    // Apply zoom and pan transforms correctly, accounting for rulers
    const x = (clientX - rect.left) / zoomLevel - panOffset.x;
    const y = (clientY - rect.top) / zoomLevel - panOffset.y;
    
    return { x: snapToGrid(x), y: snapToGrid(y) };
  };

  const handleCanvasTouch = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    let clientX: number, clientY: number;
    let isTouchEvent = false;
    
    if ('touches' in e) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
      isTouchEvent = true;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const point = getCanvasPoint(clientX, clientY);
    
    if (e.type === "touchstart" || e.type === "mousedown") {
      setTouchStartPos(point);
      setTouchStartTime(Date.now());
      setHighlightedCell(point); // Show immediate feedback
      
      // Long press timer (only for touch)
      if (isTouchEvent) {
        const timer = setTimeout(() => {
          handleLongPress(point);
        }, 600);
        setLongPressTimer(timer);
      }
      
    } else if (e.type === "touchend" || e.type === "mouseup") {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      
      const timeDiff = Date.now() - touchStartTime;
      const distance = Math.sqrt(
        Math.pow(point.x - touchStartPos.x, 2) + 
        Math.pow(point.y - touchStartPos.y, 2)
      );
      
      if (distance < 20 && timeDiff < 500) {
        handleCanvasTap(point);
      }
      
      // Clear highlight after a delay
      setTimeout(() => setHighlightedCell(null), 200);
    } else if (e.type === "touchmove" || e.type === "mousemove") {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      
      // Update highlight during drag for better feedback
      setHighlightedCell(point);
    }
  };

  const handleLongPress = (point: Point) => {
    // Check for furniture under long press
    for (const area of areas) {
      if (area.furniture) {
        for (const furniture of area.furniture) {
          const halfWidth = furniture.size.width / 2;
          const halfHeight = furniture.size.height / 2;
          
          if (point.x >= furniture.position.x - halfWidth &&
              point.x <= furniture.position.x + halfWidth &&
              point.y >= furniture.position.y - halfHeight &&
              point.y <= furniture.position.y + halfHeight) {
            
            setSelectedFurnitureItem(furniture.id);
            setEditingFurniture(furniture);
            setEditPanelOpen(true);
            toast("Furniture selected");
            return;
          }
        }
      }
    }
  };

  const handleCanvasTap = (point: Point) => {
    // Furniture placement
    if (isPlacingFurniture && pendingFurniture) {
      const targetArea = areas.find(a => a.id === pendingFurniture.areaId);
      if (targetArea && isPointInPolygon(point, targetArea.points)) {
        const newFurniture: FurnitureItem = {
          id: `furniture-${Date.now()}`,
          name: pendingFurniture.name,
          position: point,
          areaId: pendingFurniture.areaId,
          size: { width: 60, height: 40 },
          color: "#8B4513"
        };

        setAreas(prev => prev.map(area => 
          area.id === pendingFurniture.areaId 
            ? { ...area, furniture: [...(area.furniture || []), newFurniture] }
            : area
        ));

        setIsPlacingFurniture(false);
        setPendingFurniture(null);
        toast(`${pendingFurniture.name} placed`);
        return;
      } else {
        toast("Place furniture inside the area");
        return;
      }
    }

    // Check furniture tap
    for (const area of areas) {
      if (area.furniture) {
        for (const furniture of area.furniture) {
          const halfWidth = furniture.size.width / 2;
          const halfHeight = furniture.size.height / 2;
          
          if (point.x >= furniture.position.x - halfWidth &&
              point.x <= furniture.position.x + halfWidth &&
              point.y >= furniture.position.y - halfHeight &&
              point.y <= furniture.position.y + halfHeight) {
            
            setSelectedFurnitureItem(furniture.id);
            return;
          }
        }
      }
    }

    // Deselect furniture
    setSelectedFurnitureItem(null);

    // Polygon drawing
    if (!isDrawingPolygon) {
      setIsDrawingPolygon(true);
      setCurrentPolygon([point]);
      toast("Area started - tap to add points, tap start point to finish");
    } else {
      const firstPoint = currentPolygon[0];
      const distance = Math.sqrt(
        Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
      );
      
      if (distance < 40 && currentPolygon.length >= 3) {
        // Close polygon
        const newArea: AreaData = {
          id: `area-${Date.now()}`,
          type: selectedAreaType,
          points: [...currentPolygon],
          areaSqFt: calculatePolygonArea(currentPolygon),
          color: getAreaColor(selectedAreaType),
          furniture: []
        };
        
        setAreas(prev => [...prev, newArea]);
        setCurrentPolygon([]);
        setIsDrawingPolygon(false);
        toast(`${selectedAreaType} area created (${newArea.areaSqFt} sq ft)`);
      } else {
        setCurrentPolygon(prev => [...prev, point]);
      }
    }
  };

  // Tab handlers
  const handleAreaTypeSelect = (type: string) => {
    setSelectedAreaType(type);
    toast(`Selected ${type} area type`);
  };

  const handleFurnitureSelect = (furniture: string, areaId: string) => {
    setPendingFurniture({ name: furniture, areaId });
    setIsPlacingFurniture(true);
    toast(`Tap inside area to place ${furniture}`);
  };

  const handleToolAction = (action: string) => {
    switch (action) {
      case "toggle-grid":
        setShowGrid(!showGrid);
        toast(`Grid ${!showGrid ? 'shown' : 'hidden'}`);
        break;
      case "clear-canvas":
        setAreas([]);
        setCurrentPolygon([]);
        setIsDrawingPolygon(false);
        toast("Canvas cleared");
        break;
      case "import-json":
        fileInputRef.current?.click();
        break;
    }
  };

  const handleExportAction = (action: string) => {
    switch (action) {
      case "export-png":
        exportPNG();
        break;
      case "export-json":
        exportJSON();
        break;
    }
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = "floor-plan.png";
    link.href = canvas.toDataURL();
    link.click();
    toast("PNG exported");
  };

  const exportJSON = () => {
    const data = { areas, zoomLevel, panOffset };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    
    const link = document.createElement("a");
    link.download = "floor-plan.json";
    link.href = URL.createObjectURL(dataBlob);
    link.click();
    toast("JSON exported");
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.areas) {
          setAreas(data.areas);
          if (data.zoomLevel) setZoomLevel(data.zoomLevel);
          if (data.panOffset) setPanOffset(data.panOffset);
          toast("Floor plan imported");
        }
      } catch (error) {
        toast("Invalid file format");
      }
    };
    reader.readAsText(file);
  };

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.1));
  const handleResetZoom = () => {
    setZoomLevel(0.4);
    setPanOffset({ x: 200, y: 200 });
    toast("Zoom reset");
  };
  const handleClearCanvas = () => handleToolAction("clear-canvas");
  const handleToggleGrid = () => handleToolAction("toggle-grid");

  const handleFurnitureUpdate = (updatedFurniture: FurnitureItem) => {
    setAreas(prev => prev.map(area => ({
      ...area,
      furniture: area.furniture?.map(f => 
        f.id === updatedFurniture.id ? updatedFurniture : f
      )
    })));
  };

  const handleFurnitureDelete = (furnitureId: string) => {
    setAreas(prev => prev.map(area => ({
      ...area,
      furniture: area.furniture?.filter(f => f.id !== furnitureId)
    })));
    setSelectedFurnitureItem(null);
  };

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const handleResize = () => drawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawCanvas]);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-card/95 backdrop-blur-md border-b border-border z-30">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        <h1 className="font-semibold text-card-foreground">Canvas Designer</h1>
        
        <div className="w-16" /> {/* Spacer for center alignment */}
      </div>

      {/* Canvas Container with Rulers */}
      <div 
        className="relative overflow-hidden bg-background" 
        style={{ 
          height: `calc(100vh - 200px)`, // Subtract header (80px) + bottom nav (80px) + ruler (40px)
          minHeight: '400px'
        }}
      >
        {/* Top Ruler (X-axis) */}
        <div className="absolute top-0 left-10 right-0 h-10 bg-card/95 backdrop-blur-md border-b border-border z-20 overflow-hidden">
          {showGrid && (() => {
            const rulerItems = [];
            const canvasWidth = window.innerWidth - 40; // Account for left ruler
            const viewStart = -panOffset.x;
            const viewEnd = viewStart + canvasWidth / zoomLevel;
            const stepSize = GRID_SIZE * 5; // 5ft intervals
            
            const startIndex = Math.floor(viewStart / stepSize);
            const endIndex = Math.ceil(viewEnd / stepSize);
            
            for (let i = startIndex - 2; i <= endIndex + 2; i++) {
              const worldX = i * stepSize;
              const screenX = 40 + (worldX + panOffset.x) * zoomLevel;
              const feetLabel = Math.abs(i * 5);
              
              if (screenX >= 35 && screenX <= window.innerWidth - 5) {
                rulerItems.push(
                  <div
                    key={i}
                    className="absolute text-xs text-muted-foreground font-mono select-none"
                    style={{
                      left: `${screenX - 40}px`,
                      transform: 'translateX(-50%)',
                      top: '2px'
                    }}
                  >
                    {feetLabel}ft
                  </div>
                );
              }
            }
            return rulerItems;
          })()}
        </div>

        {/* Left Ruler (Y-axis) */}
        <div className="absolute top-10 left-0 bottom-0 w-10 bg-card/95 backdrop-blur-md border-r border-border z-20 overflow-hidden">
          {showGrid && (() => {
            const rulerItems = [];
            const canvasHeight = window.innerHeight - 200; // Account for header and bottom nav
            const viewStart = -panOffset.y;
            const viewEnd = viewStart + canvasHeight / zoomLevel;
            const stepSize = GRID_SIZE * 5; // 5ft intervals
            
            const startIndex = Math.floor(viewStart / stepSize);
            const endIndex = Math.ceil(viewEnd / stepSize);
            
            for (let i = startIndex - 2; i <= endIndex + 2; i++) {
              const worldY = i * stepSize;
              const screenY = 40 + (worldY + panOffset.y) * zoomLevel;
              const feetLabel = Math.abs(i * 5);
              
              if (screenY >= 35 && screenY <= window.innerHeight - 85) {
                rulerItems.push(
                  <div
                    key={i}
                    className="absolute text-xs text-muted-foreground font-mono select-none"
                    style={{
                      top: `${screenY - 40}px`,
                      transform: 'rotate(-90deg) translateX(-50%)',
                      transformOrigin: 'center center',
                      left: '20px'
                    }}
                  >
                    {feetLabel}ft
                  </div>
                );
              }
            }
            return rulerItems;
          })()}
        </div>

        {/* Corner square */}
        <div className="absolute top-0 left-0 w-10 h-10 bg-card/95 backdrop-blur-md border-r border-b border-border z-30" />

        {/* Canvas Area */}
        <div className="absolute top-10 left-10 right-0 bottom-0">
          <TouchCanvasWrapper
            zoomLevel={zoomLevel}
            panOffset={panOffset}
            onZoomChange={setZoomLevel}
            onPanChange={setPanOffset}
            className="w-full h-full"
            disabled={isPlacingFurniture || isDrawingPolygon}
          >
            <canvas
              ref={canvasRef}
              className="block w-full h-full"
              onTouchStart={handleCanvasTouch}
              onTouchMove={handleCanvasTouch}
              onTouchEnd={handleCanvasTouch}
              onMouseDown={handleCanvasTouch}
              onMouseMove={handleCanvasTouch}
              onMouseUp={handleCanvasTouch}
              style={{ touchAction: 'none' }}
            />
          </TouchCanvasWrapper>
        </div>

        {/* Always Visible Zoom Controls */}
        <MobileZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          onToggleGrid={handleToggleGrid}
          showGrid={showGrid}
          zoomLevel={zoomLevel}
        />

        {/* Floating Action Button - positioned to avoid bottom nav and zoom controls */}
        <div className="absolute left-4 bottom-24 z-40">
          <FloatingActionButtons
            showGrid={showGrid}
            onToggleGrid={handleToggleGrid}
            onClearCanvas={handleClearCanvas}
            onExportPNG={exportPNG}
            onExportJSON={exportJSON}
            onImportJSON={() => fileInputRef.current?.click()}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
          />
        </div>

        {/* Placement Guide */}
        {isPlacingFurniture && pendingFurniture && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-accent/90 text-accent-foreground px-4 py-2 rounded-lg shadow-lg z-40 backdrop-blur-sm">
            <p className="text-sm font-medium">
              Tap inside area to place {pendingFurniture.name}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <MobileBottomTabs
        selectedAreaType={selectedAreaType}
        areas={areas}
        showGrid={showGrid}
        onAreaTypeSelect={handleAreaTypeSelect}
        onFurnitureSelect={handleFurnitureSelect}
        onToolAction={handleToolAction}
        onExportAction={handleExportAction}
      />

      {/* Edit Panel */}
      <MobileEditPanel
        isOpen={editPanelOpen}
        furniture={editingFurniture}
        onClose={() => {
          setEditPanelOpen(false);
          setEditingFurniture(null);
          setSelectedFurnitureItem(null);
        }}
        onUpdate={handleFurnitureUpdate}
        onDelete={handleFurnitureDelete}
      />

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportJSON}
        className="hidden"
      />
    </div>
  );
};