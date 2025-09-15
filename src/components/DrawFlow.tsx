import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Square, Circle, Minus, PenTool, Type, Undo, Redo, Trash2, Save, ZoomIn, ZoomOut, Shapes } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { DrawingCanvas, DrawingCanvasHandle } from "./DrawingCanvas";
import { DimensionInput, Room } from "./DimensionInput";

interface DrawFlowProps {
  onBack: () => void;
}

type DrawingTool = "select" | "rectangle" | "circle" | "line" | "pen" | "text" | "area";

export const DrawFlow = ({ onBack }: DrawFlowProps) => {
  const [activeTool, setActiveTool] = useState<DrawingTool>("select");
  const [canvasKey, setCanvasKey] = useState(0);
  const [generatedRooms, setGeneratedRooms] = useState<Room[]>([]);
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const canvasApiRef = useRef<DrawingCanvasHandle>(null);

  const handleToolSelect = (tool: DrawingTool) => {
    setActiveTool(tool);
    toast(`${tool.charAt(0).toUpperCase() + tool.slice(1)} tool selected`);
  };

  const handleSave = () => {
    const dataURL = canvasApiRef.current?.exportPNGCropped();
    if (!dataURL) {
      toast.error("Nothing to save yet");
      return;
    }
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = "floor-plan-drawing.png";
    a.click();
    toast("Drawing saved as image!");
  };

  const handleClear = () => {
    setCanvasKey(prev => prev + 1);
    setGeneratedRooms([]);
    setCanvasHistory([]);
    setHistoryIndex(-1);
    toast("Canvas cleared!");
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      toast("Undid last action");
    } else {
      toast("Nothing to undo");
    }
  };

  const handleRedo = () => {
    if (historyIndex < canvasHistory.length - 1) {
      setHistoryIndex(prev => prev + 1);
      toast("Redid action");
    } else {
      toast("Nothing to redo");
    }
  };

  const saveCanvasState = (stateJSON: string) => {
    const newHistory = canvasHistory.slice(0, historyIndex + 1);
    newHistory.push(stateJSON);
    setCanvasHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleGenerateMap = (rooms: Room[], totalWidth: number, totalHeight: number) => {
    setGeneratedRooms(rooms);
    setCanvasKey(prev => prev + 1); // Force canvas refresh
  };

  const tools = [
    { id: "select", icon: ArrowLeft, label: "Select" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "line", icon: Minus, label: "Line" },
    { id: "pen", icon: PenTool, label: "Pen" },
    { id: "text", icon: Type, label: "Text" },
    { id: "area", icon: Shapes, label: "Area" },
  ] as const;

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
          {/* Tools Panel */}
          <Card className="lg:col-span-1 h-fit">
            <CardContent className="p-6 space-y-6">
              {/* Dimension Input */}
              <DimensionInput onGenerateMap={handleGenerateMap} />

              {/* Drawing Tools */}
              <div className="space-y-4">
                <h3 className="font-semibold text-vastu-sacred">Drawing Tools</h3>
                 <div className="grid grid-cols-2 gap-2">
                   {tools.map((tool) => (
                     <Button
                       key={tool.id}
                       variant={activeTool === tool.id ? "sacred" : "outline"}
                       size="sm"
                       className={`flex flex-col gap-1 h-12 ${tool.id === 'area' ? 'col-span-2' : ''}`}
                       onClick={() => handleToolSelect(tool.id as DrawingTool)}
                     >
                       <tool.icon className="w-4 h-4" />
                       <span className="text-xs">{tool.label}</span>
                     </Button>
                   ))}
                 </div>
              </div>

              {/* Canvas Actions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-vastu-earth">Actions</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={handleUndo}>
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleRedo}>
                    <Redo className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => canvasApiRef.current?.zoomIn()}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => canvasApiRef.current?.zoomOut()}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClear}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button variant="vastu" size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4" />
                  </Button>
                </div>
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
                  activeTool={activeTool}
                  generatedRooms={generatedRooms}
                  canvasHistory={canvasHistory}
                  historyIndex={historyIndex}
                  onCanvasChange={saveCanvasState}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};