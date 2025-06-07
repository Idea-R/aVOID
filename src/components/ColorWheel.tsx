import React, { useRef, useEffect } from 'react';

interface ColorWheelProps {
  isVisible: boolean;
  onColorSelect: (color: string) => void;
  onColorPreview: (color: string | null) => void;
  currentColor: string;
  previewColor: string | null;
}

export default function ColorWheel({
  isVisible,
  onColorSelect,
  onColorPreview,
  currentColor,
  previewColor
}: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw the color wheel when visible
  useEffect(() => {
    if (isVisible && canvasRef.current) {
      drawColorWheel(canvasRef.current);
    }
  }, [isVisible]);

  /**
   * Draw the color wheel on the canvas
   */
  const drawColorWheel = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = angle * Math.PI / 180;
      
      for (let r = 0; r < radius; r += 1) {
        const saturation = (r / radius) * 100;
        const lightness = 60;
        const color = `hsl(${angle}, ${saturation}%, ${lightness}%)`;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, startAngle, endAngle);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  /**
   * Handle color wheel click to select color
   */
  const handleColorWheelClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    const x = event.clientX - rect.left - centerX;
    const y = event.clientY - rect.top - centerY;
    const distance = Math.sqrt(x * x + y * y);
    
    if (distance <= radius) {
      const angle = Math.atan2(y, x);
      const hue = ((angle * 180 / Math.PI) + 360) % 360;
      const saturation = Math.min(distance / radius * 100, 100);
      const lightness = 60;
      
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      onColorSelect(color);
    }
  };

  /**
   * Handle mouse move for color preview
   */
  const handleColorWheelMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    const x = event.clientX - rect.left - centerX;
    const y = event.clientY - rect.top - centerY;
    const distance = Math.sqrt(x * x + y * y);
    
    if (distance <= radius) {
      const angle = Math.atan2(y, x);
      const hue = ((angle * 180 / Math.PI) + 360) % 360;
      const saturation = Math.min(distance / radius * 100, 100);
      const lightness = 60;
      
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      onColorPreview(color);
    } else {
      onColorPreview(null);
    }
  };

  /**
   * Clear preview when mouse leaves
   */
  const handleMouseLeave = () => {
    onColorPreview(null);
  };

  if (!isVisible) return null;

  return (
    <div className="flex flex-col items-center space-y-3">
      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="cursor-crosshair rounded-full shadow-lg border-2 border-gray-600"
        onClick={handleColorWheelClick}
        onMouseMove={handleColorWheelMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      <p className="text-xs text-gray-400 text-center">
        Click anywhere on the wheel to select a color
      </p>
      
      {previewColor && (
        <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
          <p className="text-sm text-gray-300">
            Preview: <span className="font-mono text-cyan-300">{previewColor}</span>
          </p>
          <div 
            className="w-full h-4 rounded mt-2 border border-gray-500"
            style={{ backgroundColor: previewColor }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Color picker button component for preset colors
 */
interface ColorPickerButtonProps {
  color: string;
  name: string;
  isSelected: boolean;
  onClick: () => void;
}

export function ColorPickerButton({ color, name, isSelected, onClick }: ColorPickerButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-12 h-12 rounded-full border-2 transition-all duration-200 hover:scale-110 hover:shadow-lg ${
        isSelected 
          ? 'border-white shadow-lg ring-2 ring-cyan-500' 
          : 'border-gray-600 hover:border-white'
      }`}
      style={{ backgroundColor: color }}
      title={name}
    />
  );
}

/**
 * Current color display component
 */
interface CurrentColorDisplayProps {
  color: string;
  previewColor: string | null;
  onToggleWheel: () => void;
}

export function CurrentColorDisplay({ color, previewColor, onToggleWheel }: CurrentColorDisplayProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300">Current Color:</span>
      <div className="flex items-center gap-3">
        <div 
          className="w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-110"
          style={{ backgroundColor: previewColor || color }}
          onClick={onToggleWheel}
        />
        <span className="text-sm text-gray-400 font-mono">
          {previewColor || color}
        </span>
      </div>
    </div>
  );
}