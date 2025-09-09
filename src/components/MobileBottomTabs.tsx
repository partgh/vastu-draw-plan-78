import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bed, 
  ChefHat, 
  Bath, 
  Sofa, 
  Flower2,
  Building2,
  DoorOpen,
  Package,
  Palette,
  Wrench,
  Download,
  ChevronUp,
  Grid3X3,
  Trash2,
  FileJson,
  Image
} from "lucide-react";

const tabsData = {
  areas: {
    id: "areas",
    label: "Areas", 
    icon: Building2,
    items: [
      { id: "bedroom", name: "Bedroom", icon: Bed, color: "#3b82f6" },
      { id: "kitchen", name: "Kitchen", icon: ChefHat, color: "#ef4444" },
      { id: "living-room", name: "Living Room", icon: Sofa, color: "#10b981" },
      { id: "washroom", name: "Washroom", icon: Bath, color: "#06b6d4" },
      { id: "balcony", name: "Balcony", icon: Flower2, color: "#84cc16" },
      { id: "entrance", name: "Entrance", icon: DoorOpen, color: "#8b5cf6" },
    ]
  },
  furniture: {
    id: "furniture",
    label: "Furniture",
    icon: Package,
    items: [
      { id: "bed", name: "Bed", type: "bedroom" },
      { id: "wardrobe", name: "Wardrobe", type: "bedroom" },
      { id: "nightstand", name: "Nightstand", type: "bedroom" },
      { id: "sofa", name: "Sofa", type: "living-room" },
      { id: "coffee-table", name: "Coffee Table", type: "living-room" },
      { id: "tv", name: "TV", type: "living-room" },
      { id: "dining-table", name: "Dining Table", type: "kitchen" },
      { id: "refrigerator", name: "Refrigerator", type: "kitchen" },
      { id: "stove", name: "Stove", type: "kitchen" },
      { id: "toilet", name: "Toilet", type: "washroom" },
      { id: "sink", name: "Sink", type: "washroom" },
      { id: "shower", name: "Shower", type: "washroom" },
    ]
  },
  tools: {
    id: "tools",
    label: "Tools",
    icon: Wrench,
    items: [
      { id: "toggle-grid", name: "Toggle Grid", icon: Grid3X3 },
      { id: "clear-canvas", name: "Clear Canvas", icon: Trash2 },
      { id: "import-json", name: "Import JSON", icon: FileJson },
    ]
  },
  export: {
    id: "export", 
    label: "Export",
    icon: Download,
    items: [
      { id: "export-png", name: "Export PNG", icon: Image },
      { id: "export-json", name: "Export JSON", icon: FileJson },
    ]
  }
};

interface MobileBottomTabsProps {
  selectedAreaType: string;
  areas: Array<{ id: string; type: string; points: any[]; areaSqFt: number; color: string }>;
  showGrid: boolean;
  onAreaTypeSelect: (type: string) => void;
  onFurnitureSelect?: (furniture: string, areaId: string) => void;
  onToolAction: (action: string) => void;
  onExportAction: (action: string) => void;
}

export const MobileBottomTabs = ({
  selectedAreaType,
  areas,
  showGrid,
  onAreaTypeSelect,
  onFurnitureSelect,
  onToolAction,
  onExportAction
}: MobileBottomTabsProps) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTabPress = (tabId: string) => {
    if (activeTab === tabId && isExpanded) {
      setIsExpanded(false);
      setTimeout(() => setActiveTab(null), 300);
    } else {
      setActiveTab(tabId);
      setIsExpanded(true);
    }
  };

  const handleItemSelect = (tabId: string, itemId: string) => {
    switch (tabId) {
      case "areas":
        onAreaTypeSelect(itemId);
        break;
      case "furniture":
        // Find available areas for furniture placement
        const availableAreas = areas.filter(area => {
          const item = tabsData.furniture.items.find(i => i.id === itemId);
          return !item?.type || area.type === item.type;
        });
        if (availableAreas.length > 0 && onFurnitureSelect) {
          onFurnitureSelect(itemId, availableAreas[0].id);
        }
        break;
      case "tools":
        onToolAction(itemId);
        break;
      case "export":
        onExportAction(itemId);
        break;
    }
    setIsExpanded(false);
    setTimeout(() => setActiveTab(null), 300);
  };

  const getAreaCount = (areaType: string) => {
    return areas.filter(area => area.type === areaType).length;
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => {
              setIsExpanded(false);
              setTimeout(() => setActiveTab(null), 300);
            }}
          />
        )}
      </AnimatePresence>

      {/* Expandable Content Sheet */}
      <AnimatePresence>
        {isExpanded && activeTab && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-20 left-0 right-0 bg-card border-t border-border rounded-t-2xl shadow-elegant z-50 max-h-80 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                {(() => {
                  const tab = tabsData[activeTab as keyof typeof tabsData];
                  const Icon = tab.icon;
                  return (
                    <>
                      <Icon className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-card-foreground">{tab.label}</h3>
                    </>
                  );
                })()}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsExpanded(false);
                  setTimeout(() => setActiveTab(null), 300);
                }}
                className="h-8 w-8 p-0"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
            </div>

            <div className="overflow-y-auto max-h-64 p-4">
              {activeTab === "areas" && (
                <div className="grid grid-cols-2 gap-3">
                  {tabsData.areas.items.map((item) => {
                    const Icon = item.icon;
                    const count = getAreaCount(item.id);
                    const isSelected = selectedAreaType === item.id;
                    
                    return (
                      <Button
                        key={item.id}
                        variant={isSelected ? "default" : "outline"}
                        className={`h-16 flex flex-col gap-1 relative ${
                          isSelected ? 'ring-2 ring-primary/20 bg-primary text-primary-foreground' : ''
                        }`}
                        onClick={() => handleItemSelect("areas", item.id)}
                      >
                        <Icon className="w-5 h-5" style={{ color: isSelected ? undefined : item.color }} />
                        <span className="text-xs font-medium">{item.name}</span>
                        {count > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center bg-primary text-primary-foreground"
                          >
                            {count}
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}

              {activeTab === "furniture" && (
                <div className="space-y-4">
                  {areas.length > 0 ? (
                    areas.map((area) => (
                      <div key={area.id} className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: area.color }}
                          />
                          <span className="text-sm font-medium">
                            {tabsData.areas.items.find(a => a.id === area.type)?.name || area.type} ({area.areaSqFt} sq ft)
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 ml-4">
                          {tabsData.furniture.items
                            .filter(item => !item.type || item.type === area.type)
                            .map((item) => (
                              <Button
                                key={item.id}
                                variant="outline"
                                size="sm"
                                className="justify-start h-10"
                                onClick={() => handleItemSelect("furniture", item.id)}
                              >
                                <Package className="w-4 h-4 mr-2" />
                                <span className="truncate">{item.name}</span>
                              </Button>
                            ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No areas created yet</p>
                      <p className="text-xs mt-1">Draw areas first to add furniture</p>
                    </div>
                  )}
                </div>
              )}

              {(activeTab === "tools" || activeTab === "export") && (
                <div className="grid grid-cols-1 gap-3">
                  {tabsData[activeTab as keyof typeof tabsData].items.map((item: any) => {
                    const Icon = item.icon;
                    const isActive = activeTab === "tools" && item.id === "toggle-grid" && showGrid;
                    
                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "default" : "outline"}
                        className={`h-12 justify-start ${
                          item.id === "clear-canvas" ? "text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground" : ""
                        }`}
                        onClick={() => handleItemSelect(activeTab, item.id)}
                      >
                        <Icon className="w-5 h-5 mr-3" />
                        {item.name}
                        {isActive && (
                          <Badge variant="secondary" className="ml-auto">
                            ON
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around px-2 py-3">
          {Object.values(tabsData).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && isExpanded;
            const hasItems = tab.id === "areas" && areas.length > 0;
            
            return (
              <Button
                key={tab.id}
                variant="ghost"
                className={`flex flex-col items-center gap-1 h-16 min-w-[70px] p-2 relative rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-primary/15 shadow-md' : 'hover:bg-muted/50'
                }`}
                onClick={() => handleTabPress(tab.id)}
              >
                <div className="relative">
                  <Icon 
                    className={`w-6 h-6 transition-all duration-200 ${
                      isActive ? 'text-primary scale-110' : 'text-muted-foreground'
                    }`} 
                  />
                  {hasItems && tab.id === "areas" && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
                <span className={`text-xs transition-all duration-200 ${
                  isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
                }`}>
                  {tab.label}
                </span>
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full"
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