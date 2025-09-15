import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DrawingCanvas, DrawingCanvasHandle } from "./DrawingCanvas";
import { DimensionInput, Room } from "./DimensionInput";

interface DrawFlowProps {
  onBack: () => void;
}

export const DrawFlow = ({ onBack }: DrawFlowProps) => {
  const [canvasKey, setCanvasKey] = useState(0);
  const [generatedRooms, setGeneratedRooms] = useState<Room[]>([]);
  const canvasApiRef = useRef<DrawingCanvasHandle>(null);

  const handleClear = () => {
    setCanvasKey(prev => prev + 1);
    setGeneratedRooms([]);
    toast("Canvas cleared!");
  };

  const handleGenerateMap = (rooms: Room[], totalWidth: number, totalHeight: number) => {
    setGeneratedRooms(rooms);
    setCanvasKey(prev => prev + 1); // Force canvas refresh
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-sacred bg-clip-text text-transparent">
            Draw Your Map
          </h1>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Room Input Panel */}
          <Card className="lg:col-span-1 h-fit">
            <CardContent className="p-6 space-y-6">
              {/* Dimension Input */}
              <DimensionInput onGenerateMap={handleGenerateMap} />

              {/* Simple Actions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-vastu-earth">Actions</h3>
                <Button variant="outline" onClick={handleClear} className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Canvas
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Canvas Area */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardContent className="p-0">
                <DrawingCanvas
                  ref={canvasApiRef}
                  key={canvasKey}
                  generatedRooms={generatedRooms}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};