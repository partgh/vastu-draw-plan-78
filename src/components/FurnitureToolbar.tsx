import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Palette, Move3D } from "lucide-react";
import { toast } from "sonner";

interface FurnitureItem {
  id: string;
  name: string;
  position: { x: number; y: number };
  areaId: string;
  size: { width: number; height: number };
  color?: string;
}

interface FurnitureToolbarProps {
  selectedFurnitureItem: string | null;
  furniture: FurnitureItem[];
  onRenameFurniture: (furnitureId: string, newName: string) => void;
  onResizeFurniture: (furnitureId: string, newSize: { width: number; height: number }) => void;
  onChangeFurnitureColor: (furnitureId: string, newColor: string) => void;
  onDeleteFurniture: (furnitureId: string) => void;
}

const furnitureColors = [
  { name: "Brown", value: "#8B4513" },
  { name: "Dark Wood", value: "#654321" },
  { name: "Light Wood", value: "#DEB887" },
  { name: "White", value: "#FFFFFF" },
  { name: "Black", value: "#2C2C2C" },
  { name: "Gray", value: "#808080" },
  { name: "Blue", value: "#4A90E2" },
  { name: "Green", value: "#50C878" },
  { name: "Red", value: "#E74C3C" },
];

const furnitureSizePresets = {
  bed: { width: 80, height: 60 },
  wardrobe: { width: 50, height: 30 },
  nightstand: { width: 25, height: 25 },
  dresser: { width: 60, height: 30 },
  sofa: { width: 90, height: 40 },
  chair: { width: 25, height: 25 },
  table: { width: 60, height: 40 },
  desk: { width: 70, height: 35 },
  bookshelf: { width: 30, height: 80 },
  tv: { width: 50, height: 10 },
};

export const FurnitureToolbar = ({
  selectedFurnitureItem,
  furniture,
  onRenameFurniture,
  onResizeFurniture,
  onChangeFurnitureColor,
  onDeleteFurniture
}: FurnitureToolbarProps) => {
  const selectedFurniture = furniture.find(f => f.id === selectedFurnitureItem);

  if (!selectedFurnitureItem || !selectedFurniture) {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Move3D className="w-4 h-4" />
            Furniture Editor
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Click furniture to edit properties
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleNameChange = (newName: string) => {
    onRenameFurniture(selectedFurnitureItem, newName);
  };

  const handleSizeChange = (dimension: 'width' | 'height', value: number) => {
    const newSize = {
      ...selectedFurniture.size,
      [dimension]: Math.max(20, Math.min(300, value))
    };
    
    onResizeFurniture(selectedFurnitureItem, newSize);
  };

  const applyPresetSize = (presetType: string) => {
    const preset = furnitureSizePresets[presetType as keyof typeof furnitureSizePresets];
    if (preset) {
      onResizeFurniture(selectedFurnitureItem, preset);
      toast(`Applied ${presetType} size preset`);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Move3D className="w-4 h-4" />
          {selectedFurniture.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Name Editor */}
        <div>
          <Label htmlFor="furniture-name" className="text-xs">Name</Label>
          <Input
            id="furniture-name"
            value={selectedFurniture.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Furniture name"
            className="mt-1 h-8 text-sm"
          />
        </div>

        {/* Size Editor - Mobile Friendly */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Size (pixels)</Label>
          
          {/* Quick Size Presets - Easy Touch Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Select onValueChange={applyPresetSize}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Quick presets" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {Object.keys(furnitureSizePresets).map(preset => (
                  <SelectItem key={preset} value={preset} className="text-sm">
                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSizeChange('width', selectedFurniture.size.width + 10)}
              className="h-10 text-sm"
            >
              Bigger
            </Button>
          </div>
          
          {/* Current Size Display */}
          <div className="bg-muted/50 p-3 rounded-md">
            <div className="text-xs text-muted-foreground mb-2">Current Size</div>
            <div className="text-sm font-medium">
              {selectedFurniture.size.width} × {selectedFurniture.size.height} px
            </div>
          </div>
          
          {/* Manual Size Inputs - Larger for Touch */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="width-input" className="text-xs text-muted-foreground">Width</Label>
              <Input
                id="width-input"
                type="number"
                min="20"
                max="300"
                step="5"
                value={selectedFurniture.size.width}
                onChange={(e) => handleSizeChange('width', parseInt(e.target.value) || 30)}
                className="h-10 text-sm mt-1"
                placeholder="Width"
              />
            </div>
            <div>
              <Label htmlFor="height-input" className="text-xs text-muted-foreground">Height</Label>
              <Input
                id="height-input"
                type="number"
                min="20"
                max="300"
                step="5"
                value={selectedFurniture.size.height}
                onChange={(e) => handleSizeChange('height', parseInt(e.target.value) || 30)}
                className="h-10 text-sm mt-1"
                placeholder="Height"
              />
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground bg-accent/20 p-2 rounded">
            💡 Tip: Drag the handles on selected furniture to resize, or use controls above
          </div>
        </div>

        {/* Color Editor - Compact */}
        <div>
          <Label className="text-xs flex items-center gap-1">
            <Palette className="w-3 h-3" />
            Color
          </Label>
          <div className="grid grid-cols-5 gap-1 mt-1">
            {furnitureColors.slice(0, 5).map(color => (
              <Button
                key={color.value}
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                style={{ 
                  backgroundColor: color.value,
                  borderColor: selectedFurniture.color === color.value ? '#000' : '#e5e7eb',
                  borderWidth: selectedFurniture.color === color.value ? '2px' : '1px'
                }}
                onClick={() => onChangeFurnitureColor(selectedFurnitureItem, color.value)}
                title={color.name}
              />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1 mt-1">
            {furnitureColors.slice(5).map(color => (
              <Button
                key={color.value}
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0"
                style={{ 
                  backgroundColor: color.value,
                  borderColor: selectedFurniture.color === color.value ? '#000' : '#e5e7eb',
                  borderWidth: selectedFurniture.color === color.value ? '2px' : '1px'
                }}
                onClick={() => onChangeFurnitureColor(selectedFurnitureItem, color.value)}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Position Info - Compact */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-1.5 rounded">
          X: {Math.round(selectedFurniture.position.x)}, Y: {Math.round(selectedFurniture.position.y)}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onDeleteFurniture(selectedFurnitureItem)}
            className="flex-1 h-8 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};