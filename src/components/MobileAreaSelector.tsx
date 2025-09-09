import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, Bath, ChefHat, Sofa, TreePine, DoorOpen, ArrowUpDown, MapPin, Trash2 } from "lucide-react";

interface Area {
  id: string;
  type: string;
  areaSqFt: number;
  color: string;
}

interface MobileAreaSelectorProps {
  selectedAreaType: string;
  onAreaTypeSelect: (type: string) => void;
  isDrawingMode: boolean;
  areas: Area[];
  onDeleteArea: (id: string) => void;
  selectedAreaId: string | null;
}

const areaTypes = [
  { id: "bedroom", label: "Bedroom", icon: Home, color: "#3b82f6" },
  { id: "kitchen", label: "Kitchen", icon: ChefHat, color: "#ef4444" },
  { id: "living-room", label: "Living Room", icon: Sofa, color: "#10b981" },
  { id: "washroom", label: "Washroom", icon: Bath, color: "#06b6d4" },
  { id: "balcony", label: "Balcony", icon: TreePine, color: "#84cc16" },
  { id: "entrance", label: "Entrance", icon: DoorOpen, color: "#8b5cf6" },
  { id: "stairs", label: "Stairs", icon: ArrowUpDown, color: "#6b7280" },
  { id: "lobby", label: "Lobby", icon: MapPin, color: "#f59e0b" }
];

export const MobileAreaSelector = ({ 
  selectedAreaType, 
  onAreaTypeSelect, 
  isDrawingMode,
  areas,
  onDeleteArea,
  selectedAreaId 
}: MobileAreaSelectorProps) => {
  console.log('MobileAreaSelector rendered with:', { selectedAreaType, isDrawingMode, areasCount: areas.length }); // Debug log
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Area Types Selection */}
      <Card className="mx-4 mb-4 p-3 bg-card/95 backdrop-blur-md border border-border/50">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-card-foreground mb-2">
            {isDrawingMode ? "Drawing Area" : "Select Area Type"}
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {areaTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedAreaType === type.id;
              return (
                <Button
                  key={type.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={`flex-shrink-0 h-12 px-3 gap-2 touch-manipulation ${
                    isSelected ? 'ring-2 ring-primary/20' : ''
                  }`}
                  onClick={() => {
                    console.log('Area type selected:', type.id); // Debug log
                    onAreaTypeSelect(type.id);
                  }}
                  style={isSelected ? { backgroundColor: type.color + '20', borderColor: type.color } : {}}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{type.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Drawing Instructions */}
        {isDrawingMode && (
          <div className="bg-accent/20 rounded-lg p-2 mb-3">
            <p className="text-xs text-accent-foreground font-medium">
              Tap grid points to draw {areaTypes.find(t => t.id === selectedAreaType)?.label}
            </p>
            <p className="text-xs text-muted-foreground">
              Tap first point again or double-tap to finish
            </p>
          </div>
        )}

        {/* Created Areas List */}
        {areas.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground">Created Areas:</h4>
            <div className="flex gap-1 overflow-x-auto">
              {areas.map((area) => {
                const areaType = areaTypes.find(t => t.id === area.type);
                const Icon = areaType?.icon || Home;
                const isSelected = selectedAreaId === area.id;
                
                return (
                  <div 
                    key={area.id}
                    className={`flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded-md bg-card border ${
                      isSelected ? 'ring-2 ring-primary/30' : ''
                    }`}
                  >
                    <Icon className="w-3 h-3" style={{ color: area.color }} />
                    <Badge variant="secondary" className="text-xs">
                      {area.areaSqFt} sq ft
                    </Badge>
                    {selectedAreaId === area.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-destructive/20"
                        onClick={() => onDeleteArea(area.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};