import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Undo, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileBottomNav } from "./MobileBottomNav";
import { FloatingActionButtons } from "./FloatingActionButtons";
import { TouchCanvasWrapper } from "./TouchCanvasWrapper";
import { FurnitureToolbar } from "./FurnitureToolbar";

interface MobileCanvasDesignerProps {
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
const CANVAS_WIDTH = 2000; // 100ft width
const CANVAS_HEIGHT = 2000; // 100ft height

export const MobileCanvasDesigner = ({ onBack }: MobileCanvasDesignerProps) => {
  const isMobile = useIsMobile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topRulerRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [selectedAreaType, setSelectedAreaType] = useState<string>("bedroom");
  const [showGrid, setShowGrid] = useState(true);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [zoomLevel, setZoomLevel] = useState(isMobile ? 0.5 : 1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  // Drawing states
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedArea, setDraggedArea] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  
  // Furniture states
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [isPlacingFurniture, setIsPlacingFurniture] = useState(false);
  const [draggedFurniture, setDraggedFurniture] = useState<string | null>(null);
  const [isDraggingFurniture, setIsDraggingFurniture] = useState(false);
  const [selectedFurnitureItem, setSelectedFurnitureItem] = useState<string | null>(null);
  
  // Interaction states
  const [interactionMode, setInteractionMode] = useState<"area" | "furniture" | "editing">("area");
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<Point>({ x: 0, y: 0 });

  // Utility functions
  const snapToGrid = (value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };

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

  const getAreaName = (areaType: string) => {
    const names: { [key: string]: string } = {
      bedroom: "Bedroom",
      washroom: "Washroom", 
      kitchen: "Kitchen",
      "living-room": "Living Room",
      balcony: "Balcony",
      lobby: "Lobby",
      stairs: "Stairs",
      entrance: "Entrance"
    };
    return names[areaType] || "Area";
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
    
    const areaInSqFt = area / (GRID_SIZE * GRID_SIZE);
    return Math.round(areaInSqFt);
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

  // Canvas drawing function
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size dynamically
    const container = canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan transforms
    ctx.save();
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(panOffset.x, panOffset.y);

    // Draw grid
    const viewLeft = -panOffset.x;
    const viewTop = -panOffset.y;
    const viewRight = viewLeft + CANVAS_WIDTH / zoomLevel;
    const viewBottom = viewTop + CANVAS_HEIGHT / zoomLevel;

    const stepMinor = GRID_SIZE;
    const stepMajor = GRID_SIZE * 10;

    if (showGrid) {
      // Minor grid lines
      ctx.strokeStyle = "rgba(200, 200, 200, 0.4)";
      ctx.lineWidth = Math.max(1 / zoomLevel, 0.5);
      
      const startXMinor = Math.floor(viewLeft / stepMinor) * stepMinor;
      const startYMinor = Math.floor(viewTop / stepMinor) * stepMinor;
      
      for (let x = startXMinor; x <= viewRight; x += stepMinor) {
        if (x % stepMajor !== 0) {
          ctx.beginPath();
          ctx.moveTo(x, viewTop);
          ctx.lineTo(x, viewBottom);
          ctx.stroke();
        }
      }
      
      for (let y = startYMinor; y <= viewBottom; y += stepMinor) {
        if (y % stepMajor !== 0) {
          ctx.beginPath();
          ctx.moveTo(viewLeft, y);
          ctx.lineTo(viewRight, y);
          ctx.stroke();
        }
      }

      // Major grid lines
      ctx.strokeStyle = "rgba(120, 120, 120, 0.6)";
      ctx.lineWidth = Math.max(2 / zoomLevel, 1);
      
      const startXMajor = Math.floor(viewLeft / stepMajor) * stepMajor;
      const startYMajor = Math.floor(viewTop / stepMajor) * stepMajor;
      
      for (let x = startXMajor; x <= viewRight; x += stepMajor) {
        ctx.beginPath();
        ctx.moveTo(x, viewTop);
        ctx.lineTo(x, viewBottom);
        ctx.stroke();
      }
      
      for (let y = startYMajor; y <= viewBottom; y += stepMajor) {
        ctx.beginPath();
        ctx.moveTo(viewLeft, y);
        ctx.lineTo(viewRight, y);
        ctx.stroke();
      }
    }

    // Draw existing areas
    areas.forEach(area => {
      if (area.points.length < 3) return;

      // Draw filled polygon
      ctx.fillStyle = `${area.color}30`;
      ctx.strokeStyle = area.color;
      ctx.lineWidth = Math.max(2 / zoomLevel, 1);

      ctx.beginPath();
      ctx.moveTo(area.points[0].x, area.points[0].y);
      for (let i = 1; i < area.points.length; i++) {
        ctx.lineTo(area.points[i].x, area.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw vertices with larger touch targets on mobile
      const vertexSize = isMobile ? Math.max(12 / zoomLevel, 6) : Math.max(6 / zoomLevel, 3);
      area.points.forEach(point => {
        ctx.fillStyle = area.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, vertexSize, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw furniture items
      if (area.furniture && area.furniture.length > 0) {
        area.furniture.forEach(furniture => {
          const isSelected = selectedFurnitureItem === furniture.id;
          const furnitureColor = furniture.color || "#8B4513";
          
          ctx.fillStyle = furnitureColor;
          ctx.strokeStyle = isSelected ? "#000000" : "#654321";
          ctx.lineWidth = isSelected ? 3 / zoomLevel : 2 / zoomLevel;

          const furnitureWidth = furniture.size.width / zoomLevel;
          const furnitureHeight = furniture.size.height / zoomLevel;
          
          ctx.fillRect(
            furniture.position.x - furnitureWidth / 2,
            furniture.position.y - furnitureHeight / 2,
            furnitureWidth,
            furnitureHeight
          );
          ctx.strokeRect(
            furniture.position.x - furnitureWidth / 2,
            furniture.position.y - furnitureHeight / 2,
            furnitureWidth,
            furnitureHeight
          );

          // Show larger resize handles on mobile
          if (isSelected) {
            const handleSize = isMobile ? 40 / zoomLevel : 28 / zoomLevel;
            
            ctx.strokeStyle = "#007ACC";
            ctx.lineWidth = Math.max(2, 4 / zoomLevel);
            ctx.setLineDash([8 / zoomLevel, 4 / zoomLevel]);
            ctx.strokeRect(
              furniture.position.x - furnitureWidth / 2 - 4 / zoomLevel,
              furniture.position.y - furnitureHeight / 2 - 4 / zoomLevel,
              furnitureWidth + 8 / zoomLevel,
              furnitureHeight + 8 / zoomLevel
            );
            ctx.setLineDash([]);
            
            // Corner handles
            const corners = [
              { x: furniture.position.x - furnitureWidth / 2, y: furniture.position.y - furnitureHeight / 2 },
              { x: furniture.position.x + furnitureWidth / 2, y: furniture.position.y - furnitureHeight / 2 },
              { x: furniture.position.x - furnitureWidth / 2, y: furniture.position.y + furnitureHeight / 2 },
              { x: furniture.position.x + furnitureWidth / 2, y: furniture.position.y + furnitureHeight / 2 }
            ];
            
            corners.forEach(corner => {
              ctx.fillStyle = "#FF6B35";
              ctx.strokeStyle = "#FFFFFF";
              ctx.lineWidth = Math.max(3, 4 / zoomLevel);
              
              ctx.beginPath();
              ctx.arc(corner.x, corner.y, handleSize / 2, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
            });
          }

          // Furniture label
          ctx.fillStyle = "#000000";
          ctx.font = `${Math.max(10, 12 / zoomLevel)}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(
            furniture.name,
            furniture.position.x,
            furniture.position.y + furnitureHeight / 2 + 2 / zoomLevel
          );
        });
      }

      // Area label
      if (area.points.length > 0) {
        const centroid = area.points.reduce(
          (acc, point) => ({
            x: acc.x + point.x / area.points.length,
            y: acc.y + point.y / area.points.length
          }),
          { x: 0, y: 0 }
        );

        ctx.fillStyle = area.color;
        ctx.font = `bold ${Math.max(12, 16 / zoomLevel)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          `${getAreaName(area.type)} - ${area.areaSqFt} sq ft`,
          centroid.x,
          centroid.y
        );
      }
    });

    // Draw current polygon being drawn
    if (currentPolygon.length > 0) {
      ctx.strokeStyle = getAreaColor(selectedAreaType);
      ctx.lineWidth = Math.max(2 / zoomLevel, 1);
      
      ctx.beginPath();
      ctx.moveTo(currentPolygon[0].x, currentPolygon[0].y);
      for (let i = 1; i < currentPolygon.length; i++) {
        ctx.lineTo(currentPolygon[i].x, currentPolygon[i].y);
      }
      ctx.stroke();

      // Draw vertices with larger touch targets
      const vertexSize = isMobile ? 8 / zoomLevel : 4 / zoomLevel;
      currentPolygon.forEach((point, index) => {
        ctx.fillStyle = index === 0 ? "#ff0000" : getAreaColor(selectedAreaType);
        ctx.beginPath();
        ctx.arc(point.x, point.y, vertexSize, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    ctx.restore();
  }, [areas, currentPolygon, selectedAreaType, showGrid, zoomLevel, panOffset, selectedFurnitureItem, isMobile]);

  // Touch and click handlers
  const getCanvasPoint = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - panOffset.x * zoomLevel) / zoomLevel;
    const y = (clientY - rect.top - panOffset.y * zoomLevel) / zoomLevel;
    
    return { x: snapToGrid(x), y: snapToGrid(y) };
  };

  const handleCanvasTouch = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return; // Only handle single touch
    
    const touch = e.touches[0];
    const point = getCanvasPoint(touch.clientX, touch.clientY);
    
    if (e.type === "touchstart") {
      setTouchStartPos(point);
      
      // Start long press timer for mobile context menu
      const timer = setTimeout(() => {
        if (isMobile) {
          handleLongPress(point);
        }
      }, 500);
      setLongPressTimer(timer);
      
    } else if (e.type === "touchend") {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
      
      // Check if this was a tap (not a drag)
      const distance = Math.sqrt(
        Math.pow(point.x - touchStartPos.x, 2) + 
        Math.pow(point.y - touchStartPos.y, 2)
      );
      
      if (distance < 20) { // Consider it a tap if movement is less than 20px
        handleCanvasTap(point);
      }
    } else if (e.type === "touchmove") {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    }
  };

  const handleLongPress = (point: Point) => {
    // Show quick item palette on long press
    if (areas.length > 0) {
      const touchedArea = areas.find(area => isPointInPolygon(point, area.points));
      if (touchedArea) {
        setSelectedArea(touchedArea.id);
        // Could open a context menu here
        toast(`Long pressed on ${getAreaName(touchedArea.type)}`);
      }
    }
  };

  const handleCanvasTap = (point: Point) => {
    if (isPlacingFurniture && selectedFurniture && selectedArea) {
      // Place furniture
      const targetArea = areas.find(a => a.id === selectedArea);
      if (targetArea && isPointInPolygon(point, targetArea.points)) {
        const newFurniture: FurnitureItem = {
          id: `furniture-${Date.now()}`,
          name: selectedFurniture,
          position: point,
          areaId: selectedArea,
          size: { width: 60, height: 40 },
          color: "#8B4513"
        };

        setAreas(prev => prev.map(area => 
          area.id === selectedArea 
            ? { ...area, furniture: [...(area.furniture || []), newFurniture] }
            : area
        ));

        setIsPlacingFurniture(false);
        setSelectedFurniture(null);
        setSelectedArea(null);
        toast(`${selectedFurniture} placed`);
        return;
      }
    }

    // Check if clicking on furniture
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
            setInteractionMode("editing");
            return;
          }
        }
      }
    }

    // Polygon drawing logic
    if (interactionMode === "area") {
      if (!isDrawingPolygon) {
        setIsDrawingPolygon(true);
        setCurrentPolygon([point]);
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
          toast(`${getAreaName(selectedAreaType)} created (${newArea.areaSqFt} sq ft)`);
        } else {
          setCurrentPolygon(prev => [...prev, point]);
        }
      }
    }
  };

  // Action handlers
  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel * 1.2, 4);
    setZoomLevel(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel / 1.2, 0.1);
    setZoomLevel(newZoom);
  };

  const clearCanvas = () => {
    setAreas([]);
    setCurrentPolygon([]);
    setIsDrawingPolygon(false);
    setSelectedFurnitureItem(null);
    toast("Canvas cleared");
  };

  const exportAsJSON = () => {
    if (areas.length === 0) {
      toast("No areas to export");
      return;
    }

    const data = {
      version: "1.0",
      created: new Date().toISOString(),
      areas: areas.map(area => ({
        id: area.id,
        type: area.type,
        color: area.color,
        areaSqFt: area.areaSqFt,
        points: area.points.map(p => ({ x: p.x, y: p.y })),
        furniture: area.furniture?.map(f => ({
          id: f.id,
          name: f.name,
          color: f.color,
          position: { x: f.position.x, y: f.position.y },
          size: { width: f.size.width, height: f.size.height }
        })) || []
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "floor-plan.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("Floor plan exported as JSON");
  };

  const exportAsPNG = () => {
    if (areas.length === 0) {
      toast("No areas to export");
      return;
    }

    // Create export canvas with white background
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 2000;
    exportCanvas.height = 2000;
    const ctx = exportCanvas.getContext("2d");
    
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 2000, 2000);

    // Draw areas and furniture
    areas.forEach(area => {
      if (area.points.length < 3) return;

      ctx.fillStyle = `${area.color}30`;
      ctx.strokeStyle = area.color;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(area.points[0].x, area.points[0].y);
      for (let i = 1; i < area.points.length; i++) {
        ctx.lineTo(area.points[i].x, area.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw label
      const centroid = area.points.reduce(
        (acc, point) => ({
          x: acc.x + point.x / area.points.length,
          y: acc.y + point.y / area.points.length
        }),
        { x: 0, y: 0 }
      );

      ctx.fillStyle = area.color;
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `${getAreaName(area.type)} - ${area.areaSqFt} sq ft`,
        centroid.x,
        centroid.y
      );

      // Draw furniture
      area.furniture?.forEach(furniture => {
        ctx.fillStyle = furniture.color || "#8B4513";
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 1;
        
        ctx.fillRect(
          furniture.position.x - furniture.size.width / 2,
          furniture.position.y - furniture.size.height / 2,
          furniture.size.width,
          furniture.size.height
        );
        ctx.strokeRect(
          furniture.position.x - furniture.size.width / 2,
          furniture.position.y - furniture.size.height / 2,
          furniture.size.width,
          furniture.size.height
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          furniture.name,
          furniture.position.x,
          furniture.position.y
        );
      });
    });

    const dataURL = exportCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = "floor-plan.png";
    a.click();
    toast("Floor plan exported as PNG");
  };

  const openImportDialog = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.areas || !Array.isArray(data.areas)) {
        toast("Invalid file format");
        return;
      }

      const importedAreas: AreaData[] = data.areas.map((a: any) => ({
        id: a.id || `area-${Date.now()}`,
        type: a.type,
        color: a.color || getAreaColor(a.type),
        areaSqFt: a.areaSqFt || 0,
        points: a.points || [],
        furniture: a.furniture || []
      }));

      setAreas(importedAreas);
      setSelectedFurnitureItem(null);
      setIsPlacingFurniture(false);
      e.currentTarget.value = "";
      toast("Import successful");
    } catch (err) {
      console.error(err);
      toast("Failed to import JSON");
    }
  };

  const handleFurnitureSelect = (furnitureName: string, areaId: string) => {
    setSelectedFurniture(furnitureName);
    setSelectedArea(areaId);
    setIsPlacingFurniture(true);
    setInteractionMode("furniture");
    toast(`Tap in the area to place ${furnitureName}`);
  };

  // Furniture editing functions
  const renameFurniture = (furnitureId: string, newName: string) => {
    setAreas(prev => prev.map(area => ({
      ...area,
      furniture: area.furniture?.map(f => 
        f.id === furnitureId ? { ...f, name: newName } : f
      )
    })));
  };

  const resizeFurniture = (furnitureId: string, newSize: { width: number; height: number }) => {
    setAreas(prev => prev.map(area => ({
      ...area,
      furniture: area.furniture?.map(f => 
        f.id === furnitureId ? { ...f, size: newSize } : f
      )
    })));
  };

  const changeFurnitureColor = (furnitureId: string, newColor: string) => {
    setAreas(prev => prev.map(area => ({
      ...area,
      furniture: area.furniture?.map(f => 
        f.id === furnitureId ? { ...f, color: newColor } : f
      )
    })));
  };

  const deleteFurniture = (furnitureId: string) => {
    setAreas(prev => prev.map(area => ({
      ...area,
      furniture: area.furniture?.filter(f => f.id !== furnitureId)
    })));
    setSelectedFurnitureItem(null);
    toast("Furniture deleted");
  };

  const undoLastVertex = () => {
    if (currentPolygon.length > 0) {
      setCurrentPolygon(prev => prev.slice(0, -1));
    }
  };

  const cancelCurrentPolygon = () => {
    setCurrentPolygon([]);
    setIsDrawingPolygon(false);
  };

  // Effects
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <div className={`${isMobile ? 'h-[100dvh]' : 'min-h-screen'} bg-gradient-subtle flex flex-col overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${isMobile ? 'p-4 pb-2' : 'p-6'} bg-background/95 backdrop-blur-md border-b border-border z-20`}>
        <div className="flex items-center gap-2">
          <Button variant="outline" size={isMobile ? "sm" : "default"} onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {!isMobile && "Back"}
          </Button>
          <h1 className={`${isMobile ? 'text-lg' : 'text-3xl'} font-bold text-vastu-earth`}>
            {isMobile ? "Floor Plan" : "Canvas Floor Plan Designer"}
          </h1>
        </div>
        
        {/* Mobile undo buttons */}
        {isMobile && isDrawingPolygon && currentPolygon.length > 0 && (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={undoLastVertex}>
              <Undo className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={cancelCurrentPolygon}>
              ✕
            </Button>
          </div>
        )}
      </div>

      {/* Canvas Area - Full screen responsive */}
      <div className="flex-1 relative min-h-0">
        <TouchCanvasWrapper
          onZoomChange={setZoomLevel}
          onPanChange={setPanOffset}
          zoomLevel={zoomLevel}
          panOffset={panOffset}
          className="absolute inset-0 w-full h-full"
          disabled={isDrawingPolygon || isDraggingFurniture}
        >
          <div className="w-full h-full bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="absolute top-0 left-0"
              style={{ 
                width: `${CANVAS_WIDTH}px`,
                height: `${CANVAS_HEIGHT}px`,
                transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: '0 0',
                touchAction: 'none'
              }}
              onTouchStart={handleCanvasTouch}
              onTouchEnd={handleCanvasTouch}
              onTouchMove={handleCanvasTouch}
            />
          </div>
        </TouchCanvasWrapper>
      </div>

      {/* Desktop Layout */}
      {!isMobile && (
        <div className="absolute top-20 left-4 w-80 max-h-[calc(100vh-120px)] overflow-y-auto">
          <Card className="bg-background/95 backdrop-blur-md">
            <CardContent className="p-4">
              {/* Room selection would go here for desktop */}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mobile Furniture Toolbar Overlay */}
      {isMobile && selectedFurnitureItem && (
        <div className="absolute bottom-24 left-4 right-4 z-30">
          <FurnitureToolbar
            selectedFurnitureItem={selectedFurnitureItem}
            furniture={areas.flatMap(a => a.furniture || [])}
            onRenameFurniture={renameFurniture}
            onResizeFurniture={resizeFurniture}
            onChangeFurnitureColor={changeFurnitureColor}
            onDeleteFurniture={deleteFurniture}
          />
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav
          selectedRoomType={selectedAreaType}
          onRoomTypeSelect={(areaType) => {
            setSelectedAreaType(areaType);
            setInteractionMode("area");
            setSelectedFurnitureItem(null);
            toast("Area drawing mode enabled");
          }}
          areas={areas}
          onFurnitureSelect={handleFurnitureSelect}
        />
      )}

      {/* Floating Action Buttons */}
      <FloatingActionButtons
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        onClearCanvas={clearCanvas}
        onExportPNG={exportAsPNG}
        onExportJSON={exportAsJSON}
        onImportJSON={openImportDialog}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />

      {/* Hidden file input */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="application/json" 
        onChange={handleImportFile} 
        className="hidden" 
      />
    </div>
  );
};