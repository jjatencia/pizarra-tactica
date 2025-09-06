import { useState, useEffect, useRef } from 'react';
import { CanvasTacticPack, CanvasPrimitive } from '@/types/canvas';

interface TacticalAnimationProps {
  tacticPack: CanvasTacticPack;
  onClose: () => void;
}

interface AnimatedElement {
  primitive: CanvasPrimitive;
  visible: boolean;
  progress: number;
}

export default function TacticalAnimation({ tacticPack, onClose }: TacticalAnimationProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animatedElements, setAnimatedElements] = useState<AnimatedElement[]>([]);
  const animationRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<number>();

  // Obtener la duración total de la animación
  const totalDuration = Math.max(...tacticPack.primitivas.map(p => p.tiempo || 0)) + 2000; // +2s padding

  useEffect(() => {
    // Inicializar elementos animados
    const elements = tacticPack.primitivas.map(primitive => ({
      primitive,
      visible: false,
      progress: 0
    }));
    setAnimatedElements(elements);
  }, [tacticPack]);

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Date.now() - currentTime;
      animate();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const animate = () => {
    const now = Date.now();
    const elapsed = now - (startTimeRef.current || now);
    
    if (elapsed >= totalDuration) {
      setCurrentTime(totalDuration);
      setIsPlaying(false);
      return;
    }

    setCurrentTime(elapsed);
    updateAnimatedElements(elapsed);
    drawFrame(elapsed);
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const updateAnimatedElements = (time: number) => {
    setAnimatedElements(prev => prev.map(element => {
      const startTime = element.primitive.tiempo || 0;
      const duration = 1000; // Duración de cada animación individual
      
      if (time < startTime) {
        return { ...element, visible: false, progress: 0 };
      }
      
      if (time >= startTime + duration) {
        return { ...element, visible: true, progress: 1 };
      }
      
      const progress = (time - startTime) / duration;
      const easeProgress = easeInOutCubic(progress);
      
      return { ...element, visible: true, progress: easeProgress };
    }));
  };

  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const drawFrame = (_time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar campo de fútbol simplificado
    drawField(ctx, canvas.width, canvas.height);

    // Dibujar elementos animados
    animatedElements.forEach(element => {
      if (element.visible) {
        drawPrimitive(ctx, element.primitive, element.progress, canvas.width, canvas.height);
      }
    });
  };

  const drawField = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#4ade80'; // Verde césped
    ctx.lineWidth = 2;
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, width, height);
    
    // Líneas del campo
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    
    // Perímetro
    ctx.strokeRect(0, 0, width, height);
    
    // Línea central
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    
    // Círculo central
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, width * 0.1, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Áreas
    const areaWidth = width * 0.15;
    const areaHeight = height * 0.4;
    const areaY = (height - areaHeight) / 2;
    
    // Área izquierda
    ctx.strokeRect(0, areaY, areaWidth, areaHeight);
    // Área derecha
    ctx.strokeRect(width - areaWidth, areaY, areaWidth, areaHeight);
  };

  const drawPrimitive = (
    ctx: CanvasRenderingContext2D,
    primitive: CanvasPrimitive,
    progress: number,
    width: number,
    height: number
  ) => {
    const { tipo, equipo, puntos, estilo } = primitive;

    if (tipo === 'marker') {
      drawMarker(ctx, puntos[0], equipo, estilo?.etiqueta || '', progress, width, height);
    } else if (tipo === 'arrow') {
      drawArrow(ctx, puntos, equipo, progress, width, height);
    } else if (tipo === 'zone') {
      drawZone(ctx, puntos, equipo, progress, width, height);
    }
  };

  const drawMarker = (
    ctx: CanvasRenderingContext2D,
    point: { x: number; y: number },
    team: string,
    label: string,
    progress: number,
    width: number,
    height: number
  ) => {
    const x = point.x * width;
    const y = point.y * height;
    const radius = 20 * progress;

    // Color del equipo
    const color = team === 'propio' ? '#3b82f6' : '#ef4444'; // Azul vs Rojo
    
    ctx.fillStyle = color;
    ctx.globalAlpha = progress;
    
    // Círculo del jugador
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Borde
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Etiqueta
    if (label && progress > 0.5) {
      ctx.fillStyle = 'white';
      ctx.font = '12px bold sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - radius - 10);
    }
    
    ctx.globalAlpha = 1;
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    team: string,
    progress: number,
    width: number,
    height: number
  ) => {
    if (points.length < 2) return;

    const fromX = points[0].x * width;
    const fromY = points[0].y * height;
    const toX = points[1].x * width;
    const toY = points[1].y * height;

    // Interpolar la posición actual de la flecha
    const currentX = fromX + (toX - fromX) * progress;
    const currentY = fromY + (toY - fromY) * progress;

    const color = team === 'propio' ? '#3b82f6' : '#ef4444';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.8;

    // Línea
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    // Punta de flecha
    if (progress > 0.7) {
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const arrowSize = 15;
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(currentX, currentY);
      ctx.lineTo(
        currentX - arrowSize * Math.cos(angle - Math.PI / 6),
        currentY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        currentX - arrowSize * Math.cos(angle + Math.PI / 6),
        currentY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  };

  const drawZone = (
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    team: string,
    progress: number,
    width: number,
    height: number
  ) => {
    if (points.length < 3) return;

    const color = team === 'propio' ? '#3b82f6' : '#ef4444';
    
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.2 * progress;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x * width, points[0].y * height);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * width, points[i].y * height);
    }
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = progress;
    ctx.stroke();
    
    ctx.globalAlpha = 1;
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    startTimeRef.current = undefined;
  };

  const formatTime = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{tacticPack.titulo}</h2>
            <p className="text-gray-600 text-sm mt-1">
              {tacticPack.instrucciones.join(' • ')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            ✕ Cerrar
          </button>
        </div>

        <div className="relative bg-green-800 rounded-lg overflow-hidden">
          <canvas
            ref={canvasRef}
            width={800}
            height={500}
            className="w-full h-auto"
          />
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-3">
            <button
              onClick={togglePlay}
              className={`px-4 py-2 rounded-lg font-medium ${
                isPlaying
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isPlaying ? '⏸️ Pausar' : '▶️ Reproducir'}
            </button>
            <button
              onClick={restart}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
            >
              🔄 Reiniciar
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </div>
        </div>

        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span>Equipo propio</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span>Equipo rival</span>
          </div>
        </div>
      </div>
    </div>
  );
}