import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, MousePointer, Square, Download, CheckCircle2, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface UploadFlowProps {
  onBack: () => void;
}

interface Point {
  x: number;
  y: number;
  id: number;
}

interface Polygon {
  points: Point[];
  centerPoint: Point | null;
  isComplete: boolean;
}

export const UploadFlow = ({ onBack }: UploadFlowProps) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [polygon, setPolygon] = useState<Polygon>({ points: [], centerPoint: null, isComplete: false });
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
          setUploadedImage(e.target?.result as string);
          setPolygon({ points: [], centerPoint: null, isComplete: false });
          setIsDrawingMode(false);
          toast("High quality image uploaded successfully!");
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateCenterPoint = useCallback((points: Point[]): Point => {
    if (points.length === 0) return { x: 0, y: 0, id: -1 };
    
    const sumX = points.reduce((sum, point) => sum + point.x, 0);
    const sumY = points.reduce((sum, point) => sum + point.y, 0);
    
    return {
      x: sumX / points.length,
      y: sumY / points.length,
      id: -1
    };
  }, []);

  const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate coordinates relative to the visual canvas size
    // Since we're drawing in a DPR-scaled context, we need visual coordinates
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    return { x, y };
  }, []);

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || polygon.isComplete) return;
    
    const coords = getCanvasCoordinates(event.clientX, event.clientY);
    const newPoint: Point = {
      x: coords.x,
      y: coords.y,
      id: polygon.points.length + 1
    };
    
    setPolygon(prev => ({
      ...prev,
      points: [...prev.points, newPoint]
    }));
  }, [isDrawingMode, polygon.isComplete, polygon.points.length, getCanvasCoordinates]);

  const handleCanvasTouch = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || polygon.isComplete) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const touch = event.touches[0];
    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
    const newPoint: Point = {
      x: coords.x,
      y: coords.y,
      id: polygon.points.length + 1
    };
    
    setPolygon(prev => ({
      ...prev,
      points: [...prev.points, newPoint]
    }));
  }, [isDrawingMode, polygon.isComplete, polygon.points.length, getCanvasCoordinates]);

  const finishPolygon = useCallback(() => {
    if (polygon.points.length < 3) {
      toast("Please add at least 3 points to complete the polygon");
      return;
    }
    
    const centerPoint = calculateCenterPoint(polygon.points);
    setPolygon(prev => ({
      ...prev,
      centerPoint,
      isComplete: true
    }));
    setIsDrawingMode(false);
    toast("Polygon completed! Center point calculated.");
  }, [polygon.points, calculateCenterPoint]);

  const resetPolygon = useCallback(() => {
    setPolygon({ points: [], centerPoint: null, isComplete: false });
    setIsDrawingMode(false);
  }, []);

  const startDrawing = useCallback(() => {
    setIsDrawingMode(true);
    setPolygon({ points: [], centerPoint: null, isComplete: false });
  }, []);

  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !uploadedImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image with high quality
    if (imageRef.current) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    }
    
    // Draw polygon lines
    if (polygon.points.length > 1) {
      ctx.strokeStyle = '#FF6B35';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
      for (let i = 1; i < polygon.points.length; i++) {
        ctx.lineTo(polygon.points[i].x, polygon.points[i].y);
      }
      if (polygon.isComplete) {
        ctx.closePath();
      }
      ctx.stroke();
    }
    
    // Draw points with numbers
    polygon.points.forEach((point, index) => {
      // Point circle
      ctx.fillStyle = '#FF6B35';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 12, 0, 2 * Math.PI);
      ctx.fill();
      
      // Point number
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((index + 1).toString(), point.x, point.y);
    });
    
    // Draw center point if polygon is complete
    if (polygon.centerPoint && polygon.isComplete) {
      ctx.fillStyle = '#22C55E';
      ctx.beginPath();
      ctx.arc(polygon.centerPoint.x, polygon.centerPoint.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Center label
      ctx.fillStyle = '#22C55E';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CENTER', polygon.centerPoint.x, polygon.centerPoint.y - 20);
    }
  }, [uploadedImage, polygon]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleExport = () => {
    if (!polygon.isComplete) {
      toast("Please complete the polygon selection first");
      return;
    }
    toast("Exporting selected area...");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Mobile-First Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" onClick={onBack} size="sm">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
            Upload Map
          </h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="flex flex-col h-[calc(100vh-80px)]"> {/* Full height minus header */}
        {/* Upload Section */}
        {!uploadedImage ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <Card>
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                <Upload className="w-10 h-10 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Upload High Quality Map</h2>
                <p className="text-muted-foreground">
                  Select your map image to start polygon selection
                </p>
              </div>
              <Button
                variant="default"
                size="lg"
                className="w-full max-w-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5 mr-2" />
                Choose High Quality Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground">
                Supports JPG, PNG - Optimized for highest quality
              </p>
            </CardContent>
          </Card>
          </div>
        ) : (
          <>
            <div className="flex-1 p-4">
            {/* Polygon Info */}
            {polygon.points.length > 0 && (
              <Card className="bg-background/90 backdrop-blur">
                <CardContent className="p-3">
                  <div className="text-sm font-medium">
                    Points: {polygon.points.length}
                  </div>
                  {polygon.centerPoint && (
                    <div className="text-xs text-muted-foreground">
                      Center: ({Math.round(polygon.centerPoint.x)}, {Math.round(polygon.centerPoint.y)})
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Canvas Area */}
            <Card>
              <CardContent className="p-0">
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    ref={imageRef}
                    src={uploadedImage}
                    alt="Uploaded map"
                    className="hidden"
                    onLoad={() => {
                      if (canvasRef.current && imageRef.current) {
                        const canvas = canvasRef.current;
                        const img = imageRef.current;
                        const aspectRatio = img.naturalWidth / img.naturalHeight;
                        const containerWidth = window.innerWidth - 32; // Account for padding
                        const maxHeight = window.innerHeight * 0.82; // Account for header and buttons
                        
                        let canvasWidth = containerWidth;
                        let canvasHeight = containerWidth / aspectRatio;
                        
                        if (canvasHeight > maxHeight) {
                          canvasHeight = maxHeight;
                          canvasWidth = maxHeight * aspectRatio;
                        }
                        
                        // Simplified canvas setup without DPR scaling
                        canvas.width = canvasWidth;
                        canvas.height = canvasHeight;
                        canvas.style.width = `${canvasWidth}px`;
                        canvas.style.height = `${canvasHeight}px`;
                        
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.imageSmoothingEnabled = true;
                          ctx.imageSmoothingQuality = 'high';
                        }
                        
                        drawCanvas();
                      }
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    onTouchStart={handleCanvasTouch}
                    className="touch-none select-none w-full"
                    style={{ 
                      cursor: isDrawingMode ? 'crosshair' : 'default',
                      maxHeight: '82vh',
                      display: 'block'
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            
            {/* Mobile Controls - Fixed at bottom */}
            <div className="p-4 space-y-3">
              {!polygon.isComplete ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={isDrawingMode ? "default" : "outline"}
                    onClick={startDrawing}
                    className="h-10 text-sm"
                    disabled={polygon.isComplete}
                  >
                    <MousePointer className="w-4 h-4 mr-1" />
                    {isDrawingMode ? "Drawing..." : "Start Drawing"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetPolygon}
                    className="h-10 text-sm"
                    disabled={polygon.points.length === 0}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                </div>
              ) : null}
              
              {polygon.points.length >= 3 && !polygon.isComplete && (
                <Button
                  variant="default"
                  onClick={finishPolygon}
                  className="w-full h-12 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Finish Polygon ({polygon.points.length} points)
                </Button>
              )}
              
              {polygon.isComplete && (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">Polygon Complete!</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Center point calculated at ({Math.round(polygon.centerPoint?.x || 0)}, {Math.round(polygon.centerPoint?.y || 0)})
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={resetPolygon}
                      className="h-12"
                    >
                      <Square className="w-5 h-5 mr-2" />
                      New Selection
                    </Button>
                    <Button
                      variant="default"
                      onClick={handleExport}
                      className="h-12"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Export Area
                    </Button>
                  </div>
                </div>
              )}
            </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
};