import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  X, 
  Trash2, 
  RotateCw, 
  Move, 
  Palette,
  Ruler
} from "lucide-react";

interface FurnitureItem {
  id: string;
  name: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  color?: string;
  areaId: string;
}

interface MobileEditPanelProps {
  isOpen: boolean;
  furniture: FurnitureItem | null;
  onClose: () => void;
  onUpdate: (furniture: FurnitureItem) => void;
  onDelete: (id: string) => void;
}

export const MobileEditPanel = ({
  isOpen,
  furniture,
  onClose,
  onUpdate,
  onDelete
}: MobileEditPanelProps) => {
  const [editedFurniture, setEditedFurniture] = useState<FurnitureItem | null>(furniture);
  
  const handleSizeChange = (dimension: 'width' | 'height', value: number[]) => {
    if (!editedFurniture) return;
    
    const newFurniture = {
      ...editedFurniture,
      size: {
        ...editedFurniture.size,
        [dimension]: value[0]
      }
    };
    
    setEditedFurniture(newFurniture);
    onUpdate(newFurniture);
  };

  const handleColorChange = (color: string) => {
    if (!editedFurniture) return;
    
    const newFurniture = {
      ...editedFurniture,
      color
    };
    
    setEditedFurniture(newFurniture);
    onUpdate(newFurniture);
  };

  const handleRotate = () => {
    if (!editedFurniture) return;
    
    const newFurniture = {
      ...editedFurniture,
      size: {
        width: editedFurniture.size.height,
        height: editedFurniture.size.width
      }
    };
    
    setEditedFurniture(newFurniture);
    onUpdate(newFurniture);
  };

  const handleDelete = () => {
    if (!editedFurniture) return;
    onDelete(editedFurniture.id);
    onClose();
  };

  const predefinedColors = [
    "#8B4513", // Brown
    "#654321", // Dark Brown
    "#D2691E", // Chocolate
    "#A0522D", // Sienna
    "#CD853F", // Peru
    "#DEB887", // Burlywood
    "#F4A460", // Sandy Brown
    "#D2B48C", // Tan
  ];

  // Update local state when furniture prop changes
  if (furniture && (!editedFurniture || editedFurniture.id !== furniture.id)) {
    setEditedFurniture(furniture);
  }

  return (
    <AnimatePresence>
      {isOpen && editedFurniture && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl shadow-elegant z-50 max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Move className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-card-foreground">Edit {editedFurniture.name}</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-80 p-4 space-y-6">
              {/* Size Controls */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Size</Label>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Width: {editedFurniture.size.width}px
                    </Label>
                    <Slider
                      value={[editedFurniture.size.width]}
                      onValueChange={(value) => handleSizeChange('width', value)}
                      max={200}
                      min={20}
                      step={10}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Height: {editedFurniture.size.height}px
                    </Label>
                    <Slider
                      value={[editedFurniture.size.height]}
                      onValueChange={(value) => handleSizeChange('height', value)}
                      max={200}
                      min={20}
                      step={10}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Color Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Color</Label>
                </div>
                
                <div className="grid grid-cols-8 gap-2">
                  {predefinedColors.map((color) => (
                    <Button
                      key={color}
                      variant="ghost"
                      className={`w-8 h-8 p-0 rounded-full border-2 ${
                        editedFurniture.color === color ? 'border-primary' : 'border-border'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorChange(color)}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRotate}
                  className="flex-1"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Rotate
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};