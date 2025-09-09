import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Grid3X3 } from "lucide-react";

interface MobileZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleGrid: () => void;
  showGrid: boolean;
  zoomLevel: number;
}

export const MobileZoomControls = ({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleGrid,
  showGrid,
  zoomLevel
}: MobileZoomControlsProps) => {
  return (
    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40 flex flex-col gap-2">
      {/* Zoom In */}
      <Button
        variant="secondary"
        size="lg"
        className="h-12 w-12 rounded-full shadow-lg bg-card/95 backdrop-blur-sm border border-border/50 hover:bg-accent touch-manipulation"
        onClick={onZoomIn}
      >
        <ZoomIn className="w-5 h-5" />
      </Button>
      
      {/* Zoom Level Display */}
      <div className="h-8 w-12 rounded-full bg-card/95 backdrop-blur-sm border border-border/50 flex items-center justify-center">
        <span className="text-xs font-mono text-muted-foreground">
          {Math.round(zoomLevel * 100)}%
        </span>
      </div>
      
      {/* Zoom Out */}
      <Button
        variant="secondary"
        size="lg"
        className="h-12 w-12 rounded-full shadow-lg bg-card/95 backdrop-blur-sm border border-border/50 hover:bg-accent touch-manipulation"
        onClick={onZoomOut}
      >
        <ZoomOut className="w-5 h-5" />
      </Button>
      
      {/* Reset Zoom */}
      <Button
        variant="secondary"
        size="lg"
        className="h-12 w-12 rounded-full shadow-lg bg-card/95 backdrop-blur-sm border border-border/50 hover:bg-accent touch-manipulation"
        onClick={onResetZoom}
      >
        <RotateCcw className="w-5 h-5" />
      </Button>
      
      {/* Grid Toggle */}
      <Button
        variant={showGrid ? "default" : "secondary"}
        size="lg"
        className={`h-12 w-12 rounded-full shadow-lg bg-card/95 backdrop-blur-sm border border-border/50 hover:bg-accent touch-manipulation ${
          showGrid ? 'ring-2 ring-primary/20' : ''
        }`}
        onClick={onToggleGrid}
      >
        <Grid3X3 className="w-5 h-5" />
      </Button>
    </div>
  );
};