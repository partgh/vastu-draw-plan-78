import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Bed, 
  ChefHat, 
  Bath, 
  Sofa, 
  Flower2,
  Users,
  Building2,
  DoorOpen,
  Package,
  Plus
} from "lucide-react";
import { toast } from "sonner";

interface RoomToolbarProps {
  selectedRoomType: string;
  onRoomTypeSelect: (roomType: string) => void;
  areas: Array<{ id: string; type: string; points: any[]; areaSqFt: number; color: string }>;
  onFurnitureSelect?: (furnitureName: string, areaId: string) => void;
}

const roomTypes = [
  { id: "bedroom", name: "Bedroom", icon: Bed, color: "#3b82f6" },
  { id: "washroom", name: "Washroom", icon: Bath, color: "#06b6d4" },
  { id: "kitchen", name: "Kitchen", icon: ChefHat, color: "#ef4444" },
  { id: "living-room", name: "Living Room", icon: Sofa, color: "#10b981" },
  { id: "balcony", name: "Balcony", icon: Flower2, color: "#84cc16" },
  { id: "lobby", name: "Lobby", icon: Users, color: "#f59e0b" },
  { id: "stairs", name: "Stairs", icon: Building2, color: "#6b7280" },
  { id: "entrance", name: "Entrance", icon: DoorOpen, color: "#8b5cf6" },
  { id: "custom-area", name: "Custom Area", icon: Building2, color: "#9333ea" },
];

const roomItems: { [key: string]: string[] } = {
  bedroom: ["bed", "wardrobe", "nightstand", "dresser", "lamp", "chair"],
  washroom: ["toilet", "sink", "shower", "bathtub", "mirror", "towel rack"],
  kitchen: ["stove", "refrigerator", "sink", "counter", "cabinets", "microwave"],
  "living-room": ["sofa", "coffee table", "TV", "bookshelf", "armchair", "rug"],
  balcony: ["chairs", "table", "plants", "railing", "outdoor lighting"],
  lobby: ["seating", "reception desk", "plants", "lighting", "artwork"],
  stairs: ["handrail", "steps", "lighting", "landing"],
  entrance: ["door", "mat", "shoe rack", "coat hooks", "lighting"],
  "custom-area": []
};

export const RoomToolbar = ({ selectedRoomType, onRoomTypeSelect, areas, onFurnitureSelect }: RoomToolbarProps) => {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [customItem, setCustomItem] = useState("");
  const [showCustomInput, setShowCustomInput] = useState<string | null>(null);

  const handleItemAdd = (item: string, areaId: string) => {
    if (onFurnitureSelect) {
      onFurnitureSelect(item, areaId);
      toast(`Added "${item}" to area`);
    }
  };

  const handleCustomItemAdd = (areaId: string, areaName: string) => {
    if (customItem.trim()) {
      handleItemAdd(customItem.trim(), areaId);
      setCustomItem("");
      setShowCustomInput(null);
      toast(`Added "${customItem}" to ${areaName}`);
    }
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
      entrance: "Entrance",
      "custom-area": "Custom Area"
    };
    return names[areaType] || "Area";
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Area Types</CardTitle>
          <p className="text-xs text-muted-foreground">
            Select type, then click canvas to create
          </p>
        </CardHeader>
        <CardContent className="space-y-1">
          {roomTypes.map((room) => {
            const Icon = room.icon;
            const isSelected = selectedRoomType === room.id;
            const hasAreas = areas.some(area => area.type === room.id);
            
            return (
              <div key={room.id}>
                <Button
                  variant={isSelected ? "default" : "outline"}
                  className={`w-full justify-start h-8 ${isSelected ? 'ring-1 ring-primary/20' : ''}`}
                  onClick={() => onRoomTypeSelect(room.id)}
                >
                  <Icon className="w-3 h-3 mr-2" style={{ color: isSelected ? 'currentColor' : room.color }} />
                  <span className="flex-1 text-left text-sm">{room.name}</span>
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: room.color }}
                  />
                </Button>
                
                {/* Show items dropdown directly below if this area type has completed areas */}
                {hasAreas && areas
                  .filter(area => area.type === room.id)
                  .map((area) => (
                    <div key={area.id} className="ml-4 mt-1 space-y-1">
                      <Button
                        variant={selectedArea === area.id ? "secondary" : "ghost"}
                        className="w-full justify-start h-7 text-xs"
                        onClick={() => setSelectedArea(selectedArea === area.id ? null : area.id)}
                      >
                        <div 
                          className="w-2 h-2 rounded-full mr-2" 
                          style={{ backgroundColor: area.color }}
                        />
                        <span className="flex-1 text-left">
                          {getAreaName(area.type)} ({area.areaSqFt} sq ft)
                        </span>
                      </Button>
                      
                      {selectedArea === area.id && (
                        <div className="ml-4 space-y-1">
                          <div className="text-xs text-muted-foreground font-medium mb-1">Items:</div>
                          {(roomItems[area.type] || []).map((item) => (
                            <Button
                              key={item}
                              variant="ghost"
                              className="w-full justify-start h-6 text-xs"
                              onClick={() => handleItemAdd(item, area.id)}
                            >
                              <Package className="w-2 h-2 mr-2" />
                              {item}
                            </Button>
                          ))}
                          
                          {/* Custom Item Section */}
                          <div className="pt-1 border-t border-border/50">
                            {showCustomInput !== area.id ? (
                              <Button
                                variant="ghost"
                                className="w-full justify-start h-6 text-xs text-muted-foreground"
                                onClick={() => setShowCustomInput(area.id)}
                              >
                                <Plus className="w-2 h-2 mr-2" />
                                Add Custom Item
                              </Button>
                            ) : (
                              <div className="flex gap-1">
                                <Input
                                  placeholder="Item name"
                                  value={customItem}
                                  onChange={(e) => setCustomItem(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && handleCustomItemAdd(area.id, getAreaName(area.type))}
                                  className="flex-1 h-6 text-xs"
                                />
                                <Button 
                                  size="sm" 
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleCustomItemAdd(area.id, getAreaName(area.type))}
                                >
                                  Add
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    setShowCustomInput(null);
                                    setCustomItem("");
                                  }}
                                >
                                  ×
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};