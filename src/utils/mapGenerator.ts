import { Room } from "@/components/DimensionInput";

export interface GeneratedRoom extends Room {
  x: number;
  y: number;
  color: string;
}

const roomColors: Record<string, string> = {
  "Living Room": "#f59e0b", // amber
  "Bedroom": "#8b5cf6", // violet  
  "Kitchen": "#ef4444", // red
  "Bathroom": "#06b6d4", // cyan
  "Dining Room": "#f97316", // orange
  "Study Room": "#10b981", // emerald
  "Storage": "#6b7280", // gray
  "Balcony": "#84cc16", // lime
  "Entrance": "#ec4899", // pink
  "Corridor": "#64748b", // slate
};

export const generateBasicLayout = (
  rooms: Room[], 
  totalWidth: number, 
  totalHeight: number
): GeneratedRoom[] => {
  // Convert feet to canvas pixels (scale factor)
  const scale = 15; // 15 pixels per foot
  const canvasWidth = totalWidth * scale;
  const canvasHeight = totalHeight * scale;
  
  // Sort rooms by area (largest first) for better placement
  const sortedRooms = [...rooms].sort((a, b) => (b.width * b.height) - (a.width * a.height));
  
  const generatedRooms: GeneratedRoom[] = [];
  const occupiedAreas: Array<{x: number, y: number, width: number, height: number}> = [];
  
  // Simple grid-based placement algorithm
  for (const room of sortedRooms) {
    const roomWidth = room.width * scale;
    const roomHeight = room.height * scale;
    let placed = false;
    
    // Try to find a suitable position
    for (let y = 0; y <= canvasHeight - roomHeight; y += scale) {
      for (let x = 0; x <= canvasWidth - roomWidth; x += scale) {
        // Check if this position overlaps with existing rooms
        const overlaps = occupiedAreas.some(area => 
          x < area.x + area.width &&
          x + roomWidth > area.x &&
          y < area.y + area.height &&
          y + roomHeight > area.y
        );
        
        if (!overlaps) {
          // Place the room
          generatedRooms.push({
            ...room,
            x,
            y,
            color: roomColors[room.type] || "#6b7280"
          });
          
          occupiedAreas.push({
            x,
            y,
            width: roomWidth,
            height: roomHeight
          });
          
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    
    // If we couldn't place the room in the grid, place it in available space
    if (!placed) {
      let fallbackX = 0;
      let fallbackY = 0;
      
      // Find the first available position
      for (let y = 0; y <= canvasHeight - roomHeight; y += 5) {
        for (let x = 0; x <= canvasWidth - roomWidth; x += 5) {
          const overlaps = occupiedAreas.some(area => 
            x < area.x + area.width &&
            x + roomWidth > area.x &&
            y < area.y + area.height &&
            y + roomHeight > area.y
          );
          
          if (!overlaps) {
            fallbackX = x;
            fallbackY = y;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
      
      if (placed) {
        generatedRooms.push({
          ...room,
          x: fallbackX,
          y: fallbackY,
          color: roomColors[room.type] || "#6b7280"
        });
        
        occupiedAreas.push({
          x: fallbackX,
          y: fallbackY,
          width: roomWidth,
          height: roomHeight
        });
      }
    }
  }
  
  return generatedRooms;
};

export const optimizeLayout = (rooms: GeneratedRoom[]): GeneratedRoom[] => {
  // Simple optimization: try to align rooms and reduce gaps
  const optimized = [...rooms];
  
  // Sort by Y position for row-based alignment
  optimized.sort((a, b) => a.y - b.y);
  
  // Align rooms that are close in Y position
  for (let i = 0; i < optimized.length - 1; i++) {
    const currentRoom = optimized[i];
    const nextRoom = optimized[i + 1];
    
    if (Math.abs(currentRoom.y - nextRoom.y) < 30) {
      // Align to the same Y position
      const alignY = Math.min(currentRoom.y, nextRoom.y);
      currentRoom.y = alignY;
      nextRoom.y = alignY;
    }
  }
  
  return optimized;
};