import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  X,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";

const roomTypes = [
  { id: "bedroom", name: "Bedroom", icon: Bed, color: "#3b82f6" },
  { id: "kitchen", name: "Kitchen", icon: ChefHat, color: "#ef4444" },
  { id: "living-room", name: "Living Room", icon: Sofa, color: "#10b981" },
  { id: "washroom", name: "Washroom", icon: Bath, color: "#06b6d4" },
];

const roomItems: { [key: string]: string[] } = {
  bedroom: ["bed", "wardrobe", "nightstand", "dresser", "lamp", "chair"],
  washroom: ["toilet", "sink", "shower", "bathtub", "mirror", "towel rack"],
  kitchen: ["stove", "refrigerator", "sink", "counter", "cabinets", "microwave"],
  "living-room": ["sofa", "coffee table", "TV", "bookshelf", "armchair", "rug"],
};

interface MobileBottomNavProps {
  selectedRoomType: string;
  onRoomTypeSelect: (roomType: string) => void;
  areas: Array<{ id: string; type: string; points: any[]; areaSqFt: number; color: string }>;
  onFurnitureSelect?: (furnitureName: string, areaId: string) => void;
}

export const MobileBottomNav = ({ 
  selectedRoomType, 
  onRoomTypeSelect, 
  areas, 
  onFurnitureSelect 
}: MobileBottomNavProps) => {
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleTabSelect = (roomId: string) => {
    if (selectedTab === roomId) {
      setIsDrawerOpen(!isDrawerOpen);
    } else {
      setSelectedTab(roomId);
      setIsDrawerOpen(true);
      onRoomTypeSelect(roomId);
    }
  };

  const handleItemAdd = (item: string, areaId: string) => {
    if (onFurnitureSelect) {
      onFurnitureSelect(item, areaId);
      toast(`Added "${item}" to area`);
      setIsDrawerOpen(false);
    }
  };

  const getAreaName = (areaType: string) => {
    const names: { [key: string]: string } = {
      bedroom: "Bedroom",
      washroom: "Washroom", 
      kitchen: "Kitchen",
      "living-room": "Living Room",
    };
    return names[areaType] || "Area";
  };

  const getAreasForType = (roomType: string) => {
    return areas.filter(area => area.type === roomType);
  };

  return (
    <>
      {/* Backdrop overlay when drawer is open */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={() => setIsDrawerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Items Drawer */}
      <AnimatePresence>
        {isDrawerOpen && selectedTab && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-20 left-0 right-0 bg-card border-t border-border rounded-t-xl shadow-elegant z-50 max-h-80"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                {(() => {
                  const roomType = roomTypes.find(r => r.id === selectedTab);
                  const Icon = roomType?.icon || Package;
                  return (
                    <>
                      <Icon className="w-5 h-5" style={{ color: roomType?.color }} />
                      <h3 className="font-medium">{roomType?.name} Items</h3>
                    </>
                  );
                })()}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDrawerOpen(false)}
                className="h-8 w-8 p-0"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>

            <div className="overflow-y-auto max-h-64 p-4">
              {/* Available areas for this room type */}
              {getAreasForType(selectedTab).length > 0 ? (
                <div className="space-y-4">
                  {getAreasForType(selectedTab).map((area) => (
                    <div key={area.id} className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: area.color }}
                        />
                        <span className="text-sm font-medium">
                          {getAreaName(area.type)} ({area.areaSqFt} sq ft)
                        </span>
                      </div>
                      
                      {/* Furniture items for this area */}
                      <div className="grid grid-cols-2 gap-2 ml-4">
                        {(roomItems[area.type] || []).map((item) => (
                          <Button
                            key={item}
                            variant="outline"
                            size="sm"
                            className="justify-start h-10 text-left"
                            onClick={() => handleItemAdd(item, area.id)}
                          >
                            <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{item}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No {roomTypes.find(r => r.id === selectedTab)?.name.toLowerCase()} areas created yet</p>
                  <p className="text-xs mt-1">Draw an area on the canvas first</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-3">
          {roomTypes.map((room) => {
            const Icon = room.icon;
            const isSelected = selectedRoomType === room.id;
            const isTabSelected = selectedTab === room.id;
            const hasAreas = areas.some(area => area.type === room.id);
            
            return (
              <Button
                key={room.id}
                variant="ghost"
                className={`flex flex-col items-center gap-1 h-20 min-w-[72px] p-3 relative rounded-xl transition-all duration-200 ${
                  isSelected ? 'bg-primary/15 shadow-md' : 'hover:bg-muted/50'
                } ${isTabSelected ? 'bg-accent/30 ring-2 ring-primary/20' : ''}`}
                onClick={() => handleTabSelect(room.id)}
              >
                <div className="relative">
                  <Icon 
                    className={`w-7 h-7 transition-all duration-200 ${isSelected ? 'text-primary scale-110' : ''}`} 
                    style={{ color: isSelected ? undefined : room.color }} 
                  />
                  {hasAreas && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center bg-primary text-primary-foreground"
                    >
                      {areas.filter(area => area.type === room.id).length}
                    </Badge>
                  )}
                </div>
                <span className={`text-xs truncate w-full text-center transition-all duration-200 ${
                  isSelected ? 'text-primary font-semibold' : 'text-muted-foreground'
                }`}>
                  {room.name}
                </span>
                
                {/* Active indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-primary rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </>
  );
};