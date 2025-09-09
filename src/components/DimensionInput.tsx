import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Home, RotateCw } from "lucide-react";
import { toast } from "sonner";

export interface Room {
  id: string;
  name: string;
  width: number;
  height: number;
  type: string;
}

interface DimensionInputProps {
  onGenerateMap: (rooms: Room[], totalWidth: number, totalHeight: number) => void;
}

const roomTypes = [
  "Living Room",
  "Bedroom", 
  "Kitchen",
  "Bathroom",
  "Dining Room",
  "Study Room",
  "Storage",
  "Balcony",
  "Entrance",
  "Corridor"
];

export const DimensionInput = ({ onGenerateMap }: DimensionInputProps) => {
  const [totalWidth, setTotalWidth] = useState(30);
  const [totalHeight, setTotalHeight] = useState(40);
  const [rooms, setRooms] = useState<Room[]>([
    { id: "1", name: "Living Room", width: 15, height: 12, type: "Living Room" },
    { id: "2", name: "Bedroom", width: 12, height: 10, type: "Bedroom" },
    { id: "3", name: "Kitchen", width: 8, height: 8, type: "Kitchen" },
  ]);

  const addRoom = () => {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: `Room ${rooms.length + 1}`,
      width: 10,
      height: 10,
      type: "Living Room"
    };
    setRooms([...rooms, newRoom]);
  };

  const removeRoom = (id: string) => {
    setRooms(rooms.filter(room => room.id !== id));
  };

  const updateRoom = (id: string, field: keyof Room, value: string | number) => {
    setRooms(rooms.map(room => 
      room.id === id ? { ...room, [field]: value } : room
    ));
  };

  const handleGenerate = () => {
    if (rooms.length === 0) {
      toast("Please add at least one room");
      return;
    }

    // Validate dimensions
    const totalRoomArea = rooms.reduce((sum, room) => sum + (room.width * room.height), 0);
    const totalHouseArea = totalWidth * totalHeight;
    
    if (totalRoomArea > totalHouseArea * 0.9) {
      toast("Room dimensions are too large for the house size");
      return;
    }

    onGenerateMap(rooms, totalWidth, totalHeight);
    toast("Map generated successfully!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-vastu-sacred">
          <Home className="w-5 h-5" />
          Generate from Dimensions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* House Dimensions */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">House Dimensions (feet)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="width" className="text-xs">Width</Label>
              <Input
                id="width"
                type="number"
                value={totalWidth}
                onChange={(e) => setTotalWidth(Number(e.target.value))}
                min="10"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height" className="text-xs">Length</Label>
              <Input
                id="height"
                type="number"
                value={totalHeight}
                onChange={(e) => setTotalHeight(Number(e.target.value))}
                min="10"
                max="100"
              />
            </div>
          </div>
        </div>

        {/* Rooms List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Rooms</h4>
            <Button variant="outline" size="sm" onClick={addRoom}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {rooms.map((room) => (
              <div key={room.id} className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Select 
                    value={room.type} 
                    onValueChange={(value) => updateRoom(room.id, "type", value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeRoom(room.id)}
                    className="ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Width (ft)</Label>
                    <Input
                      type="number"
                      value={room.width}
                      onChange={(e) => updateRoom(room.id, "width", Number(e.target.value))}
                      min="1"
                      max="50"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Length (ft)</Label>
                    <Input
                      type="number"
                      value={room.height}
                      onChange={(e) => updateRoom(room.id, "height", Number(e.target.value))}
                      min="1"
                      max="50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button 
          variant="vastu" 
          className="w-full"
          onClick={handleGenerate}
        >
          <RotateCw className="w-4 h-4 mr-2" />
          Generate Basic Layout
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>• Dimensions are in feet</p>
          <p>• Rooms will be arranged automatically</p>
          <p>• You can edit the generated layout using drawing tools</p>
        </div>
      </CardContent>
    </Card>
  );
};