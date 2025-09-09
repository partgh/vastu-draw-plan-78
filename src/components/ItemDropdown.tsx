import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Package } from "lucide-react";
import { toast } from "sonner";

interface ItemDropdownProps {
  areaType: string;
  areaName: string;
  items: string[];
  onItemAdd: (item: string) => void;
}

export const ItemDropdown = ({ areaType, areaName, items, onItemAdd }: ItemDropdownProps) => {
  const [customItem, setCustomItem] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleCustomItemAdd = () => {
    if (customItem.trim()) {
      onItemAdd(customItem.trim());
      setCustomItem("");
      setShowCustomInput(false);
      toast(`Added "${customItem}" to ${areaName}`);
    }
  };

  const handleItemClick = (item: string) => {
    onItemAdd(item);
    toast(`Added "${item}" to ${areaName}`);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-4 h-4" />
          {areaName} Items
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Click to add items to this area
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <Button
            key={item}
            variant="outline"
            className="w-full justify-start text-left"
            onClick={() => handleItemClick(item)}
          >
            <Package className="w-3 h-3 mr-2" />
            {item}
          </Button>
        ))}
        
        {/* Custom Item Section */}
        <div className="pt-2 border-t">
          {!showCustomInput ? (
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setShowCustomInput(true)}
            >
              <Plus className="w-3 h-3 mr-2" />
              Add Custom Item
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Enter custom item name"
                value={customItem}
                onChange={(e) => setCustomItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomItemAdd()}
                className="flex-1"
              />
              <Button size="sm" onClick={handleCustomItemAdd}>
                Add
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomItem("");
                }}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};