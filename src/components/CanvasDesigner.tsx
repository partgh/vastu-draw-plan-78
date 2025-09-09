import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, Grid3X3, FileDown, ZoomIn, ZoomOut, MousePointer, Undo, Undo2, Trash2, Upload } from "lucide-react";
import { RoomToolbar } from "./RoomToolbar";
import { FurnitureToolbar } from "./FurnitureToolbar";
import { MobileCanvasDesignerV2 } from "./MobileCanvasDesignerV2";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface CanvasDesignerProps {
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
const CANVAS_HEIGHT = 2000; // 100ft height (total 10,000 sq ft)

export const CanvasDesigner = ({ onBack }: CanvasDesignerProps) => {
  const isMobile = useIsMobile();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const topRulerRef = useRef<HTMLCanvasElement>(null);
  const [selectedAreaType, setSelectedAreaType] = useState<string>("bedroom");
  const [showGrid, setShowGrid] = useState(true);
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  
  // Free selection tool states
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedArea, setDraggedArea] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  
  // Furniture placement states
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [isPlacingFurniture, setIsPlacingFurniture] = useState(false);
  
  // Furniture interaction states
  const [draggedFurniture, setDraggedFurniture] = useState<string | null>(null);
  const [isDraggingFurniture, setIsDraggingFurniture] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<Point>({ x: 0, y: 0 });
  const [selectedFurnitureItem, setSelectedFurnitureItem] = useState<string | null>(null);
  const [isResizingFurniture, setIsResizingFurniture] = useState(false);
  const [resizingFurnitureId, setResizingFurnitureId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<"nw"|"ne"|"sw"|"se"|null>(null);
  const [showResizeHandles, setShowResizeHandles] = useState<string | null>(null);
  
  // Interaction mode states
  const [interactionMode, setInteractionMode] = useState<"area" | "furniture" | "editing">("area");
  const [lastClickTime, setLastClickTime] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use mobile version on mobile devices
  if (isMobile) {
    return <MobileCanvasDesignerV2 onBack={onBack} />;
  }

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
    
    // Convert from pixels to square feet
    const areaInPixels = area;
    const areaInSqFt = areaInPixels / (GRID_SIZE * GRID_SIZE);
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

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan transforms
    ctx.save();
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(panOffset.x, panOffset.y);

      // Advanced graph-paper grid with zoom-responsive styling
      // Compute visible world bounds based on pan/zoom
      const viewLeft = -panOffset.x;
      const viewTop = -panOffset.y;
      const viewRight = viewLeft + CANVAS_WIDTH / zoomLevel;
      const viewBottom = viewTop + CANVAS_HEIGHT / zoomLevel;

      // Steps in world units (pixels at zoom 1)
      const stepMinor = GRID_SIZE;        // 1 ft
      const stepMid = GRID_SIZE * 5;      // 5 ft
      const stepMajor = GRID_SIZE * 10;   // 10 ft

      if (showGrid) {
        // Start positions snapped to grid
        const startXMinor = Math.floor(viewLeft / stepMinor) * stepMinor;
        const startYMinor = Math.floor(viewTop / stepMinor) * stepMinor;

        // Minor lines (1 ft)
        ctx.strokeStyle = "rgba(200, 200, 200, 0.35)";
        ctx.lineWidth = Math.max(0.5 / zoomLevel, 0.25 / zoomLevel);
        for (let x = startXMinor; x <= viewRight; x += stepMinor) {
          if (x % stepMajor !== 0 && x % stepMid !== 0) {
            ctx.beginPath();
            ctx.moveTo(x, viewTop);
            ctx.lineTo(x, viewBottom);
            ctx.stroke();
          }
        }
        for (let y = startYMinor; y <= viewBottom; y += stepMinor) {
          if (y % stepMajor !== 0 && y % stepMid !== 0) {
            ctx.beginPath();
            ctx.moveTo(viewLeft, y);
            ctx.lineTo(viewRight, y);
            ctx.stroke();
          }
        }

        // Mid lines (5 ft)
        ctx.strokeStyle = "rgba(170, 170, 170, 0.55)";
        ctx.lineWidth = Math.max(1 / zoomLevel, 0.6 / zoomLevel);
        const startXMid = Math.floor(viewLeft / stepMid) * stepMid;
        const startYMid = Math.floor(viewTop / stepMid) * stepMid;
        for (let x = startXMid; x <= viewRight; x += stepMid) {
          if (x % stepMajor !== 0) {
            ctx.beginPath();
            ctx.moveTo(x, viewTop);
            ctx.lineTo(x, viewBottom);
            ctx.stroke();
          }
        }
        for (let y = startYMid; y <= viewBottom; y += stepMid) {
          if (y % stepMajor !== 0) {
            ctx.beginPath();
            ctx.moveTo(viewLeft, y);
            ctx.lineTo(viewRight, y);
            ctx.stroke();
          }
        }

        // Major lines (10 ft)
        ctx.strokeStyle = "rgba(120, 120, 120, 0.7)";
        ctx.lineWidth = Math.max(1.5 / zoomLevel, 1 / zoomLevel);
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

      // Labels and compass are drawn after restore in screen space


    // Draw existing areas
    areas.forEach(area => {
      if (area.points.length < 3) return;

      // Draw filled polygon
      ctx.fillStyle = `${area.color}30`;
      ctx.strokeStyle = area.color;
      ctx.lineWidth = 2 / zoomLevel;

      ctx.beginPath();
      ctx.moveTo(area.points[0].x, area.points[0].y);
      for (let i = 1; i < area.points.length; i++) {
        ctx.lineTo(area.points[i].x, area.points[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw vertices
      area.points.forEach(point => {
        ctx.fillStyle = area.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4 / zoomLevel, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw furniture items in this area
      if (area.furniture && area.furniture.length > 0) {
        area.furniture.forEach(furniture => {
          const isSelected = selectedFurnitureItem === furniture.id;
          const furnitureColor = furniture.color || "#8B4513"; // Default brown color
          
          ctx.fillStyle = isSelected ? furnitureColor : furnitureColor;
          ctx.strokeStyle = isSelected ? "#000000" : "#654321"; // Black border when selected
          ctx.lineWidth = isSelected ? 3 / zoomLevel : 2 / zoomLevel;

          // Use actual furniture size
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

          // Show resize handles immediately when selected (no double-click needed)
          if (isSelected) {
            const cornerHandleSize = Math.max(28, 32 / zoomLevel); // Even larger for easier touch
            
            // Draw selection border for better visibility
            ctx.strokeStyle = "#007ACC";
            ctx.lineWidth = Math.max(2, 4 / zoomLevel);
            ctx.setLineDash([8 / zoomLevel, 4 / zoomLevel]);
            ctx.strokeRect(
              furniture.position.x - furnitureWidth / 2 - 4 / zoomLevel,
              furniture.position.y - furnitureHeight / 2 - 4 / zoomLevel,
              furnitureWidth + 8 / zoomLevel,
              furnitureHeight + 8 / zoomLevel
            );
            ctx.setLineDash([]); // Reset line dash
            
            // Draw 4 corner handles - larger and more prominent
            const corners = [
              { x: furniture.position.x - furnitureWidth / 2, y: furniture.position.y - furnitureHeight / 2 }, // Top-left
              { x: furniture.position.x + furnitureWidth / 2, y: furniture.position.y - furnitureHeight / 2 }, // Top-right
              { x: furniture.position.x - furnitureWidth / 2, y: furniture.position.y + furnitureHeight / 2 }, // Bottom-left
              { x: furniture.position.x + furnitureWidth / 2, y: furniture.position.y + furnitureHeight / 2 }  // Bottom-right
            ];
            
            corners.forEach(corner => {
              // Larger, more prominent corner handles with shadow effect
              ctx.fillStyle = "#FF6B35"; // Orange for high visibility
              ctx.strokeStyle = "#FFFFFF";
              ctx.lineWidth = Math.max(3, 4 / zoomLevel);
              
              // Draw shadow first for depth
              ctx.globalAlpha = 0.3;
              ctx.fillStyle = "#000000";
              ctx.beginPath();
              ctx.arc(corner.x + 2 / zoomLevel, corner.y + 2 / zoomLevel, cornerHandleSize / 2, 0, 2 * Math.PI);
              ctx.fill();
              
              // Draw main handle
              ctx.globalAlpha = 1.0;
              ctx.fillStyle = "#FF6B35";
              ctx.beginPath();
              ctx.arc(corner.x, corner.y, cornerHandleSize / 2, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
              
              // Add inner white dot for better visibility
              ctx.fillStyle = "#FFFFFF";
              ctx.beginPath();
              ctx.arc(corner.x, corner.y, (cornerHandleSize / 2) - 6 / zoomLevel, 0, 2 * Math.PI);
              ctx.fill();
            });
          }

          // Draw furniture label
          ctx.fillStyle = "#000000";
          ctx.font = `${10 / zoomLevel}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(
            furniture.name,
            furniture.position.x,
            furniture.position.y + furnitureHeight / 2 + 2 / zoomLevel
          );
        });
      }

      // Draw label
      if (area.points.length > 0) {
        const centroid = area.points.reduce(
          (acc, point) => ({
            x: acc.x + point.x / area.points.length,
            y: acc.y + point.y / area.points.length
          }),
          { x: 0, y: 0 }
        );

        ctx.fillStyle = area.color;
        ctx.font = `bold ${14 / zoomLevel}px Arial`;
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
      ctx.lineWidth = 2 / zoomLevel;
      
      ctx.beginPath();
      ctx.moveTo(currentPolygon[0].x, currentPolygon[0].y);
      for (let i = 1; i < currentPolygon.length; i++) {
        ctx.lineTo(currentPolygon[i].x, currentPolygon[i].y);
      }
      ctx.stroke();

      // Draw vertices
      currentPolygon.forEach((point, index) => {
        ctx.fillStyle = index === 0 ? "#ff0000" : getAreaColor(selectedAreaType);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4 / zoomLevel, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    ctx.restore();

    // Screen-space overlays: axis labels and compass
    const oViewLeft = -panOffset.x;
    const oViewTop = -panOffset.y;
    const oViewRight = oViewLeft + CANVAS_WIDTH / zoomLevel;
    const oViewBottom = oViewTop + CANVAS_HEIGHT / zoomLevel;

    const toScreenX = (wx: number) => (wx + panOffset.x) * zoomLevel;
    const toScreenY = (wy: number) => (wy + panOffset.y) * zoomLevel;

    // Axis labels every 10 ft (show 5 ft when zoomed in)
    const stepMajorLbl = GRID_SIZE * 10;
    const stepMidLbl = GRID_SIZE * 5;
    const showMid = zoomLevel > 1.5;

    const startX = Math.floor(oViewLeft / stepMajorLbl) * stepMajorLbl;
    const startY = Math.floor(oViewTop / stepMajorLbl) * stepMajorLbl;

    // Labels style
    ctx.fillStyle = "rgba(48, 62, 84, 0.9)";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Top axis labels handled by sticky overlay canvas (top ruler)
    // (See drawTopRuler and overlay canvas in JSX)


    // Left axis labels
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let y = startY; y <= oViewBottom + stepMajorLbl; y += stepMajorLbl) {
      const sy = toScreenY(y);
      const feet = Math.round(y / GRID_SIZE);
      if (sy >= 0 && sy <= canvas.height) {
        ctx.save();
        ctx.translate(12, sy);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${feet}ft`, 0, 0);
        ctx.restore();
      }
      if (showMid) {
        const midy = y + stepMidLbl;
        const smy = toScreenY(midy);
        const feetMid = Math.round(midy / GRID_SIZE);
        if (smy >= 0 && smy <= canvas.height) {
          ctx.save();
          ctx.translate(12, smy);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(`${feetMid}ft`, 0, 0);
          ctx.restore();
        }
      }
    }

    // Compass (top-left)
    const cx = 60, cy = 60, r = 18;
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.strokeStyle = "rgba(90,90,90,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Arrow
    ctx.strokeStyle = "rgba(90,90,90,0.95)";
    ctx.fillStyle = "rgba(90,90,90,0.95)";
    ctx.beginPath();
    ctx.moveTo(cx, cy + 10);
    ctx.lineTo(cx, cy - 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx - 4, cy - 4);
    ctx.lineTo(cx + 4, cy - 4);
    ctx.closePath();
    ctx.fill();
    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("N", cx, cy - r - 8);
  }, [areas, currentPolygon, selectedAreaType, showGrid, zoomLevel, panOffset]);

  // Draw sticky top ruler on separate overlay canvas
  const drawTopRuler = useCallback(() => {
    const container = scrollRef.current;
    const ruler = topRulerRef.current;
    if (!container || !ruler) return;

    const width = container.clientWidth;
    const height = 28;
    if (ruler.width !== width) ruler.width = width;
    if (ruler.height !== height) ruler.height = height;

    const ctx = ruler.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(48, 62, 84, 0.9)";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";

    const scrollLeft = container.scrollLeft;
    const stepMajorLbl = GRID_SIZE * 10;
    const stepMidLbl = GRID_SIZE * 5;
    const showMid = zoomLevel > 1.5;

    const worldLeft = scrollLeft / zoomLevel - panOffset.x;
    const worldRight = worldLeft + width / zoomLevel;
    const startX = Math.floor(worldLeft / stepMajorLbl) * stepMajorLbl;

    for (let x = startX; x <= worldRight + stepMajorLbl; x += stepMajorLbl) {
      const sx = (x + panOffset.x) * zoomLevel - scrollLeft;
      const feet = Math.round(x / GRID_SIZE);
      if (sx >= -20 && sx <= width + 20) ctx.fillText(`${feet}ft`, sx, 14);
      if (showMid) {
        const midx = x + stepMidLbl;
        const smx = (midx + panOffset.x) * zoomLevel - scrollLeft;
        const feetMid = Math.round(midx / GRID_SIZE);
        if (smx >= -20 && smx <= width + 20) ctx.fillText(`${feetMid}ft`, smx, 14);
      }
    }
  }, [zoomLevel, panOffset]);

  // Redraw ruler when zoom/pan change
  useEffect(() => {
    drawTopRuler();
  }, [drawTopRuler, zoomLevel, panOffset]);

  // Keep ruler synced with scroll/resize
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScrollOrResize = () => drawTopRuler();
    container.addEventListener("scroll", onScrollOrResize, { passive: true } as any);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      container.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [drawTopRuler]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    drawCanvas();
    drawTopRuler();
  }, [drawCanvas, drawTopRuler]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel - panOffset.x;
    const y = (e.clientY - rect.top) / zoomLevel - panOffset.y;
    
    return { x: snapToGrid(x), y: snapToGrid(y) };
  };

  const getFurnitureAtPoint = (point: Point): FurnitureItem | null => {
    for (const area of areas) {
      if (area.furniture) {
        for (const furniture of area.furniture) {
          const halfWidth = furniture.size.width / 2;
          const halfHeight = furniture.size.height / 2;
          
          if (point.x >= furniture.position.x - halfWidth &&
              point.x <= furniture.position.x + halfWidth &&
              point.y >= furniture.position.y - halfHeight &&
              point.y <= furniture.position.y + halfHeight) {
            return furniture;
          }
      }
    }
  }
  return null;
};

// Compute rectangle corners for a furniture given center and size
const getFurnitureCorners = (center: Point, size: { width: number; height: number }) => {
  const halfW = size.width / 2;
  const halfH = size.height / 2;
  return [
    { x: center.x - halfW, y: center.y - halfH }, // tl
    { x: center.x + halfW, y: center.y - halfH }, // tr
    { x: center.x - halfW, y: center.y + halfH }, // bl
    { x: center.x + halfW, y: center.y + halfH }, // br
  ];
};

const areCornersInsideArea = (areaPoints: Point[], center: Point, size: { width: number; height: number }) => {
  const corners = getFurnitureCorners(center, size);
  return corners.every(corner => isPointInPolygon(corner, areaPoints));
};

// Detect if user clicked a resize handle; returns furniture id and handle key
const getResizeHandleHit = (point: Point): { id: string; handle: "nw"|"ne"|"sw"|"se" } | null => {
  // Much larger hit area for better mobile/touch usability
  const hitRadius = Math.max(30, 35 / zoomLevel);
  for (const area of areas) {
    for (const furniture of area.furniture || []) {
      // Only check handles for selected furniture (no more showResizeHandles)
      if (selectedFurnitureItem !== furniture.id) continue;
      
      const halfW = furniture.size.width / 2;
      const halfH = furniture.size.height / 2;
      const center = furniture.position;
      const handles = [
        { key: "nw" as const, x: center.x - halfW, y: center.y - halfH },
        { key: "ne" as const, x: center.x + halfW, y: center.y - halfH },
        { key: "sw" as const, x: center.x - halfW, y: center.y + halfH },
        { key: "se" as const, x: center.x + halfW, y: center.y + halfH }
      ];
      for (const h of handles) {
        if (Math.hypot(point.x - h.x, point.y - h.y) <= hitRadius) {
          return { id: furniture.id, handle: h.key };
        }
      }
    }
  }
  return null;
};

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(e);

    // Check resize handle hit first
    const handleHit = getResizeHandleHit(point);
    if (handleHit) {
      setSelectedFurnitureItem(handleHit.id);
      setIsResizingFurniture(true);
      setResizingFurnitureId(handleHit.id);
      setResizeHandle(handleHit.handle);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const clickedFurniture = getFurnitureAtPoint(point);
    
    if (clickedFurniture) {
      setSelectedFurnitureItem(clickedFurniture.id);
      setDraggedFurniture(clickedFurniture.id);
      setDragStartPos(point);
      setIsDraggingFurniture(true);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Clear selection if clicking empty space
    setSelectedFurnitureItem(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(e);

    // Handle resizing
    if (isResizingFurniture && resizingFurnitureId && resizeHandle) {
      const item = areas.flatMap(a => a.furniture || []).find(f => f.id === resizingFurnitureId);
      if (!item) return;
      const area = areas.find(a => a.id === item.areaId);
      if (!area) return;

      let newWidth = item.size.width;
      let newHeight = item.size.height;

      // Calculate new dimensions based on handle type and cursor position
      if (resizeHandle.includes('e')) {
        newWidth = Math.max(20, Math.min(300, (point.x - item.position.x) * 2));
      }
      if (resizeHandle.includes('w')) {
        newWidth = Math.max(20, Math.min(300, (item.position.x - point.x) * 2));
      }
      if (resizeHandle.includes('s')) {
        newHeight = Math.max(20, Math.min(300, (point.y - item.position.y) * 2));
      }
      if (resizeHandle.includes('n')) {
        newHeight = Math.max(20, Math.min(300, (item.position.y - point.y) * 2));
      }

      const proposed = { width: newWidth, height: newHeight };
      if (areCornersInsideArea(area.points, item.position, proposed)) {
        resizeFurniture(item.id, proposed);
      }
      return;
    }

    // Handle dragging
    if (!isDraggingFurniture || !draggedFurniture) return;
    const draggedItem = areas.flatMap(a => a.furniture || []).find(f => f.id === draggedFurniture);
    if (!draggedItem) return;

    const area = areas.find(a => a.id === draggedItem.areaId);
    if (!area) return;

    // Ensure the entire rectangle stays inside the area while dragging
    if (!areCornersInsideArea(area.points, point, draggedItem.size)) return;

    setAreas(prev => prev.map(area => ({
      ...area,
      furniture: area.furniture?.map(furniture => 
        furniture.id === draggedFurniture 
          ? { ...furniture, position: point }
          : furniture
      )
    })));
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingFurniture(false);
    setDraggedFurniture(null);
    setDragStartPos({ x: 0, y: 0 });
    setIsResizingFurniture(false);
    setResizingFurnitureId(null);
    setResizeHandle(null);
  };

  const renameFurniture = (furnitureId: string, newName: string) => {
    setAreas(prev => prev.map(area => ({
      ...area,
      furniture: area.furniture?.map(furniture => 
        furniture.id === furnitureId 
          ? { ...furniture, name: newName }
          : furniture
      )
    })));
    toast("Furniture renamed");
  };

  const resizeFurniture = (furnitureId: string, newSize: { width: number; height: number }) => {
    setAreas(prev => prev.map(area => ({
      ...area,
      furniture: area.furniture?.map(furniture => 
        furniture.id === furnitureId 
          ? { ...furniture, size: newSize }
          : furniture
      )
    })));
  };

  const changeFurnitureColor = (furnitureId: string, newColor: string) => {
    setAreas(prev => prev.map(area => ({
      ...area,
      furniture: area.furniture?.map(furniture => 
        furniture.id === furnitureId 
          ? { ...furniture, color: newColor }
          : furniture
      )
    })));
  };

  const deleteFurniture = (furnitureId: string) => {
    setAreas(prev => prev.map(area => ({
      ...area,
      furniture: area.furniture?.filter(furniture => furniture.id !== furnitureId)
    })));
    setSelectedFurnitureItem(null);
    toast("Furniture deleted");
  };
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(e);
    const currentTime = Date.now();
    const isDoubleClick = currentTime - lastClickTime < 300;
    setLastClickTime(currentTime);

    // Handle furniture placement mode
    if (isPlacingFurniture) {
      placeFurniture(point);
      return;
    }

    // Check if clicking on furniture
    const clickedFurniture = getFurnitureAtPoint(point);
    if (clickedFurniture) {
      if (isDoubleClick && selectedFurnitureItem === clickedFurniture.id) {
        // Double-click on already selected furniture shows resize handles
        setShowResizeHandles(showResizeHandles === clickedFurniture.id ? null : clickedFurniture.id);
        toast("Double-click detected - Resize handles " + (showResizeHandles === clickedFurniture.id ? "hidden" : "shown"));
      } else {
        // Single click selects furniture and hides resize handles for other items
        setSelectedFurnitureItem(clickedFurniture.id);
        setShowResizeHandles(null); // Hide resize handles when selecting different furniture
        setInteractionMode("furniture");
      }
      return;
    } else {
      // Clicked empty space - clear selection and resize handles
      setSelectedFurnitureItem(null);
      setShowResizeHandles(null);
    }

    // Only allow area drawing/editing if in area mode
    if (interactionMode !== "area") {
      return;
    }

    if (isDrawingPolygon) {
      // Check if clicking on the first point to close the polygon
      if (currentPolygon.length > 2) {
        const firstPoint = currentPolygon[0];
        const distance = Math.sqrt(
          Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
        );
        
        if (distance < 10) {
          // Close the polygon
          const areaSqFt = calculatePolygonArea(currentPolygon);
          const newArea: AreaData = {
            id: `area-${Date.now()}`,
            type: selectedAreaType,
            points: [...currentPolygon],
            areaSqFt,
            color: getAreaColor(selectedAreaType)
          };
          
          setAreas(prev => [...prev, newArea]);
          setCurrentPolygon([]);
          setIsDrawingPolygon(false);
          toast(`${getAreaName(selectedAreaType)} created (${areaSqFt} sq ft)`);
          return;
        }
      }

      // Add point to current polygon
      setCurrentPolygon(prev => [...prev, point]);
    } else {
      // Start new polygon
      setCurrentPolygon([point]);
      setIsDrawingPolygon(true);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.3));
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY;
    const zoomFactor = Math.exp(-delta * 0.001);
    const minZ = 0.3, maxZ = 3;
    const newZoom = Math.min(maxZ, Math.max(minZ, zoomLevel * zoomFactor));

    // Keep mouse position anchored while zooming
    const worldX = mouseX / zoomLevel - panOffset.x;
    const worldY = mouseY / zoomLevel - panOffset.y;
    const newPanX = mouseX / newZoom - worldX;
    const newPanY = mouseY / newZoom - worldY;

    setZoomLevel(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  const cancelCurrentPolygon = () => {
    setCurrentPolygon([]);
    setIsDrawingPolygon(false);
  };

  const undoLastVertex = () => {
    if (currentPolygon.length > 0) {
      setCurrentPolygon(prev => prev.slice(0, -1));
      if (currentPolygon.length === 1) {
        setIsDrawingPolygon(false);
      }
      toast("Last vertex removed");
    }
  };

  const undoMultipleVertices = (steps: number = 2) => {
    if (currentPolygon.length > 0) {
      const newLength = Math.max(0, currentPolygon.length - steps);
      setCurrentPolygon(prev => prev.slice(0, newLength));
      if (newLength === 0) {
        setIsDrawingPolygon(false);
      }
      toast(`Removed ${Math.min(steps, currentPolygon.length)} vertices`);
    }
  };

  const clearCanvas = () => {
    setAreas([]);
    setCurrentPolygon([]);
    setIsDrawingPolygon(false);
    setSelectedFurniture(null);
    setSelectedArea(null);
    setIsPlacingFurniture(false);
    toast("Canvas cleared");
  };

  const handleFurnitureSelect = (furnitureName: string, areaId: string) => {
    setSelectedFurniture(furnitureName);
    setSelectedArea(areaId);
    setIsPlacingFurniture(true);
    setInteractionMode("furniture");
    toast(`Click inside the area to place ${furnitureName}`);
  };

  const placeFurniture = (position: Point) => {
    if (!selectedFurniture || !selectedArea) return;

    // Check if click is inside the selected area
    const area = areas.find(a => a.id === selectedArea);
    if (!area || !isPointInPolygon(position, area.points)) {
      toast("Please click inside the selected area");
      return;
    }

    const defaultColors: Record<string, string> = {
      bed: "#8B4513",
      wardrobe: "#654321",
      dresser: "#A0522D",
      nightstand: "#DEB887",
      sofa: "#4A90E2",
      chair: "#50C878",
      table: "#DEB887",
      tv: "#2C2C2C",
      sink: "#808080",
      refrigerator: "#2C3E50",
      stove: "#C0392B",
    };

    const furnitureItem: FurnitureItem = {
      id: `furniture-${Date.now()}`,
      name: selectedFurniture,
      position,
      areaId: selectedArea,
      size: { width: 30, height: 30 }, // Default size
      color: defaultColors[selectedFurniture.toLowerCase()] || "#8B4513"
    };

    setAreas(prev => prev.map(area => {
      if (area.id === selectedArea) {
        return {
          ...area,
          furniture: [...(area.furniture || []), furnitureItem]
        };
      }
      return area;
    }));

    setSelectedFurniture(null);
    setSelectedArea(null);
    setIsPlacingFurniture(false);
    toast(`${selectedFurniture} placed in ${getAreaName(area.type)}`);
  };

  const exportAsJSON = () => {
    const exportData = {
      areas: areas.map(area => ({
        id: area.id,
        type: area.type,
        color: area.color,
        points: area.points.map(p => [p.x / GRID_SIZE, p.y / GRID_SIZE]), // feet
        areaSqFt: area.areaSqFt,
        furniture: (area.furniture || []).map(f => ({
          id: f.id,
          name: f.name,
          color: f.color || null,
          position: { xFt: f.position.x / GRID_SIZE, yFt: f.position.y / GRID_SIZE },
          size: { widthFt: f.size.width / GRID_SIZE, heightFt: f.size.height / GRID_SIZE },
        }))
      })),
      canvasSize: {
        widthFt: CANVAS_WIDTH / GRID_SIZE,
        heightFt: CANVAS_HEIGHT / GRID_SIZE
      },
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "floor-plan.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("Floor plan exported as JSON (with furniture)");
  };

  const exportAsPNG = () => {
    if (areas.length === 0) {
      toast("No areas to export");
      return;
    }

    // Calculate bounding box of all areas and furniture
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    areas.forEach(area => {
      area.points.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });

      // Include furniture in bounding box calculation
      area.furniture?.forEach(furniture => {
        const furnitureMinX = furniture.position.x;
        const furnitureMinY = furniture.position.y;
        const furnitureMaxX = furniture.position.x + furniture.size.width;
        const furnitureMaxY = furniture.position.y + furniture.size.height;
        
        minX = Math.min(minX, furnitureMinX);
        minY = Math.min(minY, furnitureMinY);
        maxX = Math.max(maxX, furnitureMaxX);
        maxY = Math.max(maxY, furnitureMaxY);
      });
    });

    // Add padding around the bounding box
    const padding = 40;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const exportWidth = maxX - minX;
    const exportHeight = maxY - minY;

    // Create temporary canvas for export
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = exportWidth;
    exportCanvas.height = exportHeight;
    const ctx = exportCanvas.getContext("2d");
    
    if (!ctx) return;

    // Fill with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // Translate to crop to bounding box
    ctx.translate(-minX, -minY);

    // Draw only the areas (no grid, no axes)
    areas.forEach(area => {
      if (area.points.length < 3) return;

      // Draw filled polygon
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

      // Draw vertices
      area.points.forEach(point => {
        ctx.fillStyle = area.color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw label
      if (area.points.length > 0) {
        const centroid = area.points.reduce(
          (acc, point) => ({
            x: acc.x + point.x / area.points.length,
            y: acc.y + point.y / area.points.length
          }),
          { x: 0, y: 0 }
        );

        ctx.fillStyle = area.color;
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          `${getAreaName(area.type)} - ${area.areaSqFt} sq ft`,
          centroid.x,
          centroid.y
        );
      }

      // Draw furniture in this area
      area.furniture?.forEach(furniture => {
        // Draw furniture background
        ctx.fillStyle = furniture.color || "#8B4513";
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 1;
        
        ctx.fillRect(
          furniture.position.x,
          furniture.position.y,
          furniture.size.width,
          furniture.size.height
        );
        ctx.strokeRect(
          furniture.position.x,
          furniture.position.y,
          furniture.size.width,
          furniture.size.height
        );

        // Draw furniture label
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const labelX = furniture.position.x + furniture.size.width / 2;
        const labelY = furniture.position.y + furniture.size.height / 2;
        
        // Add shadow for text readability
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeText(furniture.name, labelX, labelY);
        ctx.fillText(furniture.name, labelX, labelY);
      });
    });

    // Export the cropped canvas
    const dataURL = exportCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = "floor-plan-complete.png";
    a.click();
    toast("Complete floor plan exported as PNG (with furniture)");
  };

  // Import JSON with areas and furniture
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

      const importedAreas: AreaData[] = data.areas.map((a: any) => {
        const id = a.id || `area-${crypto.randomUUID?.() || Date.now()}`;
        const points: Point[] = (a.points || []).map((p: any) => ({
          x: (Array.isArray(p) ? p[0] : p.xFt ?? p.x) * GRID_SIZE,
          y: (Array.isArray(p) ? p[1] : p.yFt ?? p.y) * GRID_SIZE,
        }));
        const areaColor = a.color || getAreaColor(a.type);
        const areaSqFt = a.areaSqFt || calculatePolygonArea(points);

        const furniture: FurnitureItem[] = (a.furniture || []).map((f: any) => {
          const posXFt = f.position?.xFt ?? (typeof f.position?.x === 'number' ? f.position.x / GRID_SIZE : 0);
          const posYFt = f.position?.yFt ?? (typeof f.position?.y === 'number' ? f.position.y / GRID_SIZE : 0);
          const widthFt = f.size?.widthFt ?? (typeof f.size?.width === 'number' ? f.size.width / GRID_SIZE : 1.5);
          const heightFt = f.size?.heightFt ?? (typeof f.size?.height === 'number' ? f.size.height / GRID_SIZE : 1.5);
          return {
            id: f.id || `furniture-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
            name: f.name || "item",
            color: f.color || undefined,
            position: { x: posXFt * GRID_SIZE, y: posYFt * GRID_SIZE },
            size: { width: Math.max(10, widthFt * GRID_SIZE), height: Math.max(10, heightFt * GRID_SIZE) },
            areaId: id,
          };
        });

        return { id, type: a.type, points, areaSqFt, color: areaColor, furniture } as AreaData;
      });

      setAreas(importedAreas);
      setSelectedFurnitureItem(null);
      setIsPlacingFurniture(false);
      e.currentTarget.value = ""; // reset input
      toast("Import successful (areas + furniture)");
    } catch (err) {
      console.error(err);
      toast("Failed to import JSON");
    }
  };
  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-vastu-earth">Canvas Floor Plan Designer</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Undo buttons - only show when drawing */}
            {isDrawingPolygon && currentPolygon.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={undoLastVertex}
                  disabled={currentPolygon.length === 0}
                >
                  <Undo className="w-4 h-4 mr-1" />
                  Undo
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => undoMultipleVertices(2)}
                  disabled={currentPolygon.length < 2}
                >
                  <Undo2 className="w-4 h-4 mr-1" />
                  Undo 2
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
              </>
            )}
            <Button variant="outline" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-16 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button variant="outline" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => setShowGrid(!showGrid)}>
              <Grid3X3 className="w-4 h-4 mr-2" />
              {showGrid ? "Hide" : "Show"} Grid
            </Button>
            <Button variant="outline" onClick={clearCanvas}>
              Clear Canvas
            </Button>
            <Button variant="outline" onClick={exportAsJSON}>
              <FileDown className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button variant="outline" onClick={openImportDialog}>
              <Upload className="w-4 h-4 mr-2" />
              Import JSON
            </Button>
            <Button variant="outline" onClick={exportAsPNG}>
              <Download className="w-4 h-4 mr-2" />
              Export PNG
            </Button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Compact Sidebar */}
          <div className="col-span-2">
            <RoomToolbar 
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
            
            {/* Compact Furniture Editing Controls */}
            <FurnitureToolbar
              selectedFurnitureItem={selectedFurnitureItem}
              furniture={areas.flatMap(a => a.furniture || [])}
              onRenameFurniture={renameFurniture}
              onResizeFurniture={resizeFurniture}
              onChangeFurnitureColor={changeFurnitureColor}
              onDeleteFurniture={deleteFurniture}
            />
            
            {/* Compact Placement Controls */}
            {isPlacingFurniture && (
              <Card className="mt-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Placing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-xs text-muted-foreground">
                    {selectedFurniture}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsPlacingFurniture(false);
                      setSelectedFurniture(null);
                      setSelectedArea(null);
                    }} 
                    className="w-full h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Current Mode - Compact */}
            <Card className="mt-2">
              <CardContent className="p-2">
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  interactionMode === "area" ? "bg-blue-100 text-blue-800" :
                  interactionMode === "furniture" ? "bg-green-100 text-green-800" :
                  "bg-orange-100 text-orange-800"
                }`}>
                  {interactionMode === "area" ? "🏠 Drawing" :
                   interactionMode === "furniture" ? "🪑 Furniture" :
                   "✏️ Editing"}
                </div>
              </CardContent>
            </Card>

            {/* Drawing Status - Compact */}
            {isDrawingPolygon && (
              <Card className="mt-2">
                <CardContent className="p-2 space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {getAreaName(selectedAreaType)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Points: {currentPolygon.length}
                  </div>
                  <Button variant="outline" size="sm" onClick={cancelCurrentPolygon} className="w-full h-6 text-xs">
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Canvas - More Space */}
          <div className="col-span-10">
            <Card>
              <CardContent className="p-4">
                 <div className="relative bg-white rounded-lg border-2 border-border" style={{ height: '600px' }}>
                   {/* Sticky top ruler overlay */}
                   <canvas
                     ref={topRulerRef}
                     className="absolute top-0 left-0 w-full z-10 pointer-events-none"
                     style={{ height: '28px' }}
                   />
                   
                   {/* Scrollable canvas area */}
                   <div 
                     ref={scrollRef}
                     className="absolute inset-0 overflow-auto"
                   >
                     <canvas
                       ref={canvasRef}
                       width={CANVAS_WIDTH}
                       height={CANVAS_HEIGHT}
                       className={
                         isPlacingFurniture
                           ? "cursor-pointer"
                           : isDraggingFurniture
                           ? "cursor-move"
                           : "cursor-crosshair"
                       }
                       onClick={handleCanvasClick}
                       onMouseDown={handleCanvasMouseDown}
                       onMouseMove={handleCanvasMouseMove}
                       onMouseUp={handleCanvasMouseUp}
                       style={{ display: 'block', backgroundColor: 'white' }}
                     />
                   </div>
                 </div>
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    Select an area type from the toolbar, then click on the canvas to create polygon vertices. 
                    Click the first point again to close the shape.
                  </p>
                   <p className="text-xs text-muted-foreground text-center">
                     Each grid unit = 1 foot | Use zoom buttons to zoom | Current zoom: {Math.round(zoomLevel * 100)}%
                   </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};