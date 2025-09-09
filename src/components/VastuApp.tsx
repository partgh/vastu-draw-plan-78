import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, PenTool, Compass, Grid3X3, FileImage, Download, Ruler } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { UploadFlow } from "./UploadFlow";
import { DrawFlow } from "./DrawFlow";
import { CanvasDesigner } from "./CanvasDesigner";

type AppMode = "start" | "upload" | "draw" | "design";

export const VastuApp = () => {
  const [mode, setMode] = useState<AppMode>("start");
  const isMobile = useIsMobile();

  const handleModeSelect = (selectedMode: "upload" | "draw" | "design") => {
    // Restrict draw and design modes to desktop only
    if (isMobile && (selectedMode === "draw" || selectedMode === "design")) {
      toast.error("This feature is only available on desktop devices. Please use a larger screen to access the drawing and design tools.");
      return;
    }
    
    setMode(selectedMode);
    toast(`${selectedMode === "upload" ? "Upload" : selectedMode === "draw" ? "Draw" : "Canvas Designer"} mode activated`);
  };

  const handleBack = () => {
    setMode("start");
  };

  if (mode === "upload") {
    return <UploadFlow onBack={handleBack} />;
  }

  if (mode === "draw") {
    return <DrawFlow onBack={handleBack} />;
  }

  if (mode === "design") {
    return <CanvasDesigner onBack={handleBack} />;
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-subtle p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-primary rounded-full flex items-center justify-center shadow-elegant">
              <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Vastu Mapper
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-muted-foreground mb-2">
            Traditional Architectural Planning & Analysis
          </p>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-2">
            Create and analyze house plans with authentic Vastu Shastra grids. 
            Upload your existing floor plan or draw a new one from scratch.
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          <Card className="group hover:shadow-elegant transition-all duration-300 transform hover:scale-[1.02] sm:hover:scale-105 border-border/50 touch-manipulation">
            <CardHeader className="text-center pb-3 sm:pb-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-soft group-hover:animate-pulse-glow transition-all duration-300">
                <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-xl sm:text-2xl text-vastu-saffron">Upload Map</CardTitle>
              <CardDescription className="text-sm sm:text-base px-2">
                Upload your existing house plan and analyze it with Vastu grids
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-vastu-sacred" />
                  Support for JPG, PNG, PDF formats
                </li>
                <li className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-vastu-sacred" />
                  Vastu 9x9 & Tithi Mandal grids
                </li>
                <li className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-vastu-sacred" />
                  Direction alignment tools
                </li>
                <li className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-vastu-sacred" />
                  Export analysis reports
                </li>
              </ul>
              <Button 
                variant="vastu" 
                size="lg" 
                className="w-full mt-4 sm:mt-6 touch-manipulation min-h-[44px]"
                onClick={() => handleModeSelect("upload")}
              >
                Upload Your Map
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-elegant transition-all duration-300 transform hover:scale-[1.02] sm:hover:scale-105 border-border/50 touch-manipulation">
            <CardHeader className="text-center pb-3 sm:pb-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-sacred rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-soft group-hover:animate-pulse-glow transition-all duration-300">
                <PenTool className="w-6 h-6 sm:w-8 sm:h-8 text-accent-foreground" />
              </div>
              <CardTitle className="text-xl sm:text-2xl text-vastu-sacred">Draw Map</CardTitle>
              <CardDescription className="text-sm sm:text-base px-2">
                Create a new house plan from scratch with our drawing tools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-vastu-earth" />
                  Freehand drawing & shapes
                </li>
                <li className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-vastu-earth" />
                  Room layout tools
                </li>
                <li className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-vastu-earth" />
                  Text labels & annotations
                </li>
                <li className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-vastu-earth" />
                  Save & analyze with Vastu
                </li>
              </ul>
              <Button 
                variant="sacred" 
                size="lg" 
                className="w-full mt-4 sm:mt-6 touch-manipulation min-h-[44px]"
                onClick={() => handleModeSelect("draw")}
              >
                Start Drawing
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-elegant transition-all duration-300 transform hover:scale-[1.02] sm:hover:scale-105 border-border/50 touch-manipulation">
            <CardHeader className="text-center pb-3 sm:pb-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-earth rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-soft group-hover:animate-pulse-glow transition-all duration-300">
                <Ruler className="w-6 h-6 sm:w-8 sm:h-8 text-secondary-foreground" />
              </div>
              <CardTitle className="text-lg sm:text-xl lg:text-2xl text-vastu-earth">Canvas Floor Plan Designer</CardTitle>
              <CardDescription className="text-sm sm:text-base px-2">
                Design precise floor plans with dimensions on a grid canvas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-vastu-water" />
                  Grid-based design (1ft units)
                </li>
                <li className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-vastu-water" />
                  Drag & resize rooms
                </li>
                <li className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-vastu-water" />
                  Room labels & dimensions
                </li>
                <li className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-vastu-water" />
                  Export as JSON & PNG
                </li>
              </ul>
              <Button 
                variant="earth" 
                size="lg" 
                className="w-full mt-4 sm:mt-6 touch-manipulation min-h-[44px]"
                onClick={() => handleModeSelect("design")}
              >
                Open Canvas Designer
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Preview */}
        <div className="mt-12 sm:mt-16 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold mb-6 sm:mb-8 text-vastu-earth px-2">
            Comprehensive Vastu Analysis Tools
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-2xl mx-auto px-2">
            <div className="flex flex-col items-center gap-2 p-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-earth rounded-lg flex items-center justify-center touch-manipulation">
                <Grid3X3 className="w-5 h-5 sm:w-6 sm:h-6 text-accent-foreground" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-center">9x9 Vastu Grid</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-earth rounded-lg flex items-center justify-center touch-manipulation">
                <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-accent-foreground" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-center">Compass Alignment</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-earth rounded-lg flex items-center justify-center touch-manipulation">
                <FileImage className="w-5 h-5 sm:w-6 sm:h-6 text-accent-foreground" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-center">Zone Analysis</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-earth rounded-lg flex items-center justify-center touch-manipulation">
                <Download className="w-5 h-5 sm:w-6 sm:h-6 text-accent-foreground" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-center">Export Reports</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};