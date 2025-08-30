export const exportSVGToPNG = async (svgElement: SVGSVGElement, filename: string = 'tactica-futbol.png'): Promise<void> => {
  try {
    // Get SVG dimensions
    const rect = svgElement.getBoundingClientRect();
    const svgData = new XMLSerializer().serializeToString(svgElement);
    
    // Create a canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Set canvas size (high resolution for better quality)
    const scale = 2;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    
    // Scale context for high DPI
    ctx.scale(scale, scale);
    
    // Create blob from SVG
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    // Create image and draw to canvas
    const img = new Image();
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        // Fill white background
        ctx.fillStyle = '#1B5E20'; // pitch grass color
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        // Draw SVG
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.download = filename;
            link.href = URL.createObjectURL(blob);
            link.click();
            
            // Cleanup
            URL.revokeObjectURL(url);
            URL.revokeObjectURL(link.href);
            resolve();
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/png');
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG'));
      };
      
      img.src = url;
    });
  } catch (error) {
    console.error('Error exporting PNG:', error);
    throw error;
  }
};

export const downloadJSON = (data: string, filename: string = 'tactica-futbol.json'): void => {
  try {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading JSON:', error);
  }
};

export const uploadJSON = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            resolve(result);
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      } else {
        reject(new Error('No file selected'));
      }
    };
    
    input.click();
  });
};