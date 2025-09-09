import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Grid3X3, 
  Trash2, 
  Download, 
  Upload, 
  FileJson, 
  ZoomIn, 
  ZoomOut,
  Settings,
  X,
  Image
} from "lucide-react";

interface FloatingActionButtonsProps {
  showGrid: boolean;
  onToggleGrid: () => void;
  onClearCanvas: () => void;
  onExportPNG: () => void;
  onExportJSON: () => void;
  onImportJSON: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const FloatingActionButtons = ({
  showGrid,
  onToggleGrid,
  onClearCanvas,
  onExportPNG,
  onExportJSON,
  onImportJSON,
  onZoomIn,
  onZoomOut
}: FloatingActionButtonsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const fabVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: {
        delay: i * 0.1,
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    })
  };

  const actions = [
    { icon: Grid3X3, label: "Toggle Grid", action: onToggleGrid, active: showGrid },
    { icon: ZoomIn, label: "Zoom In", action: onZoomIn },
    { icon: ZoomOut, label: "Zoom Out", action: onZoomOut },
    { icon: Image, label: "Export PNG", action: onExportPNG },
    { icon: FileJson, label: "Export JSON", action: onExportJSON },
    { icon: Upload, label: "Import JSON", action: onImportJSON },
    { icon: Trash2, label: "Clear Canvas", action: onClearCanvas, destructive: true },
  ];

  return (
    <div className="fixed right-4 z-40 bottom-[calc(7rem+env(safe-area-inset-bottom))]">
      {/* Action Buttons */}
      <AnimatePresence>
        {isExpanded && (
          <div className="flex flex-col gap-3 mb-4">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.label}
                  custom={index}
                  variants={fabVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="relative group"
                >
                  <Button
                    variant={action.destructive ? "destructive" : action.active ? "default" : "secondary"}
                    size="lg"
                    className={`h-14 w-14 rounded-full shadow-elegant hover:shadow-soft transition-all duration-200 touch-manipulation ${
                      action.active ? 'ring-2 ring-primary/20' : ''
                    }`}
                    onClick={() => {
                      action.action();
                      setIsExpanded(false);
                    }}
                  >
                    <Icon className="w-6 h-6" />
                  </Button>
                  
                  {/* Tooltip */}
                  <div className="absolute right-14 top-1/2 transform -translate-y-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    {action.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.div
        animate={{ rotate: isExpanded ? 45 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Button
          variant="default"
          size="lg"
          className="h-16 w-16 rounded-full shadow-elegant hover:shadow-soft bg-gradient-primary hover:opacity-90 transition-all duration-200 touch-manipulation"
          onClick={toggleExpanded}
        >
          {isExpanded ? (
            <X className="w-7 h-7 text-primary-foreground" />
          ) : (
            <Settings className="w-7 h-7 text-primary-foreground" />
          )}
        </Button>
      </motion.div>
    </div>
  );
};