import { useEffect, useRef } from "react";

interface VastuCanvasProps {
  backgroundImage?: string;
  showVastuGrid: boolean;
  showTithiGrid: boolean;
  gridOpacity: number;
  rotation: number;
}

export const VastuCanvas = ({
  backgroundImage,
  showVastuGrid,
  showTithiGrid,
  gridOpacity,
  rotation
}: VastuCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();

    // Apply rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Draw background image if provided
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => {
        // Calculate scaling to fit image in canvas while maintaining aspect ratio
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        // Draw grids on top
        drawGrids();
      };
      img.src = backgroundImage;
    } else {
      drawGrids();
    }

    function drawGrids() {
      const opacity = gridOpacity / 100;

      if (showVastuGrid) {
        drawVastuGrid(ctx, canvas.width, canvas.height, opacity);
      }

      if (showTithiGrid) {
        drawTithiGrid(ctx, canvas.width, canvas.height, opacity);
      }
    }

    // Restore context state
    ctx.restore();
  }, [backgroundImage, showVastuGrid, showTithiGrid, gridOpacity, rotation]);

  const drawVastuGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, opacity: number) => {
    ctx.strokeStyle = `rgba(200, 100, 50, ${opacity})`;
    ctx.lineWidth = 2;
    ctx.font = "12px sans-serif";
    ctx.fillStyle = `rgba(200, 100, 50, ${opacity * 0.8})`;

    const size = Math.min(width, height) * 0.8;
    const offsetX = (width - size) / 2;
    const offsetY = (height - size) / 2;
    const cellSize = size / 9;

    // Draw 9x9 grid
    for (let i = 0; i <= 9; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(offsetX + i * cellSize, offsetY);
      ctx.lineTo(offsetX + i * cellSize, offsetY + size);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * cellSize);
      ctx.lineTo(offsetX + size, offsetY + i * cellSize);
      ctx.stroke();
    }

    // Add Vastu zone labels
    const zones = [
      { text: "पूर्व (East)", x: 7.5, y: 4.5 },
      { text: "उत्तर (North)", x: 4.5, y: 1.5 },
      { text: "पश्चिम (West)", x: 1.5, y: 4.5 },
      { text: "दक्षिण (South)", x: 4.5, y: 7.5 },
      { text: "ब्रह्म (Center)", x: 4.5, y: 4.5 },
    ];

    zones.forEach(zone => {
      const x = offsetX + zone.x * cellSize;
      const y = offsetY + zone.y * cellSize;
      
      // Background for text
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
      const textWidth = ctx.measureText(zone.text).width;
      ctx.fillRect(x - textWidth/2 - 4, y - 8, textWidth + 8, 16);
      
      // Text
      ctx.fillStyle = `rgba(200, 100, 50, ${opacity})`;
      ctx.textAlign = "center";
      ctx.fillText(zone.text, x, y + 4);
    });
  };

  const drawTithiGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, opacity: number) => {
    ctx.strokeStyle = `rgba(50, 100, 200, ${opacity})`;
    ctx.lineWidth = 2;
    ctx.font = "10px sans-serif";
    ctx.fillStyle = `rgba(50, 100, 200, ${opacity * 0.8})`;

    const size = Math.min(width, height) * 0.7;
    const offsetX = (width - size) / 2;
    const offsetY = (height - size) / 2;
    const cellSize = size / 8;

    // Draw 8x8 grid for Tithi Mandal
    for (let i = 0; i <= 8; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(offsetX + i * cellSize, offsetY);
      ctx.lineTo(offsetX + i * cellSize, offsetY + size);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * cellSize);
      ctx.lineTo(offsetX + size, offsetY + i * cellSize);
      ctx.stroke();
    }

    // Add directional markers
    const directions = [
      { text: "N", x: 4, y: 0.5 },
      { text: "E", x: 7.5, y: 4 },
      { text: "S", x: 4, y: 7.5 },
      { text: "W", x: 0.5, y: 4 },
    ];

    directions.forEach(dir => {
      const x = offsetX + dir.x * cellSize;
      const y = offsetY + dir.y * cellSize;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
      ctx.fillRect(x - 10, y - 8, 20, 16);
      
      ctx.fillStyle = `rgba(50, 100, 200, ${opacity})`;
      ctx.textAlign = "center";
      ctx.fillText(dir.text, x, y + 4);
    });
  };

  return (
    <div className="w-full h-[600px] relative bg-muted/10 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
};