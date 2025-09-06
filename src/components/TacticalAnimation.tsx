import { useState, useEffect, useRef } from 'react';
import { CanvasTacticPack, CanvasPrimitive, CanvasPoint } from '@/types/canvas';

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

  console.log("🎬 TacticalAnimation iniciado", { 
    primitivas: tacticPack.primitivas.length, 
    totalDuration 
  });

  useEffect(() => {
    // Inicializar elementos animados
    const elements = tacticPack.primitivas.map(primitive => ({
      primitive,
      visible: false,
      progress: 0
    }));
    setAnimatedElements(elements);
    
    console.log("🎭 Elementos animados creados:", elements.length);
  }, [tacticPack]);

  // Efecto para dibujar el frame inicial cuando el canvas esté listo
  useEffect(() => {
    if (canvasRef.current && animatedElements.length > 0) {
      console.log("🎨 Dibujando frame inicial");
      drawFrame(0);
    }
  }, [animatedElements]);

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

  const drawFrame = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn("⚠️ Canvas no disponible");
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn("⚠️ Context no disponible");
      return;
    }

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar campo de fútbol simplificado
    drawField(ctx, canvas.width, canvas.height);

    // Debug: mostrar elementos que deberían estar visibles
    const elementsToShow = animatedElements.filter(el => {
      const startTime = el.primitive.tiempo || 0;
      return time >= startTime;
    });

    console.log(`🎨 Frame ${time}ms: ${elementsToShow.length}/${animatedElements.length} elementos visibles`);

    // Recolectar marcadores rivales activos para coherencia táctica (bloqueo de línea de pase)
    const activeRivalMarkers: { x: number; y: number }[] = elementsToShow
      .filter(el => el.primitive.tipo === 'marker' && el.primitive.equipo === 'rival')
      .map(el => el.primitive.puntos[0])
      .filter(Boolean);

    // Dibujar elementos animados
    elementsToShow.forEach(element => {
      const startTime = element.primitive.tiempo || 0;
      const duration = 1000;
      let progress = 1;
      
      if (time < startTime + duration) {
        progress = Math.max(0, (time - startTime) / duration);
      }
      
      drawPrimitive(ctx, element.primitive, progress, canvas.width, canvas.height, activeRivalMarkers);
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
    height: number,
    activeRivalMarkers: CanvasPoint[]
  ) => {
    const { tipo, equipo, puntos, estilo } = primitive;

    console.log(`✏️ Dibujando ${tipo} (${equipo}) con progreso ${progress.toFixed(2)}`);

    if (tipo === 'marker') {
      drawMarker(ctx, puntos[0], equipo, estilo?.etiqueta || '', progress, width, height);
    } else if (tipo === 'arrow') {
      drawArrow(ctx, puntos, equipo, progress, width, height, activeRivalMarkers);
    } else if (tipo === 'move') {
      // Soporte básico para animar desplazamientos de jugadores (coordinación previa al pase)
      drawMove(ctx, puntos, equipo, progress, width, height, estilo?.etiqueta);
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
    height: number,
    activeRivals: CanvasPoint[]
  ) => {
    if (points.length < 2) return;

    const fromX = points[0].x * width;
    const fromY = points[0].y * height;
    const toX = points[1].x * width;
    const toY = points[1].y * height;

    // Verificar si la línea de pase queda bloqueada por un rival
    const blockers = team === 'propio' ? findLineBlockers({ x: fromX, y: fromY }, { x: toX, y: toY }, activeRivals) : [];

    // Si hay bloqueo, curvamos el pase para evitar la interceptación
    const useCurve = blockers.length > 0;
    let controlPoint: { x: number; y: number } | null = null;
    if (useCurve) {
      controlPoint = computeAvoidanceControlPoint({ x: fromX, y: fromY }, { x: toX, y: toY }, blockers[0]);
    }

    // Interpolar la posición actual de la flecha (recta o curva)
    let currentX: number;
    let currentY: number;
    if (useCurve && controlPoint) {
      const t = progress;
      const oneMinusT = 1 - t;
      currentX = oneMinusT * oneMinusT * fromX + 2 * oneMinusT * t * controlPoint.x + t * t * toX;
      currentY = oneMinusT * oneMinusT * fromY + 2 * oneMinusT * t * controlPoint.y + t * t * toY;
    } else {
      currentX = fromX + (toX - fromX) * progress;
      currentY = fromY + (toY - fromY) * progress;
    }

    const color = team === 'propio' ? '#3b82f6' : '#ef4444';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.8;

    // Línea
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    if (useCurve && controlPoint) {
      ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, currentX, currentY);
    } else {
      ctx.lineTo(currentX, currentY);
    }
    ctx.stroke();

    // Punta de flecha
    if (progress > 0.7) {
      // Calcular ángulo tangente (recto o tangente a la curva)
      let angle: number;
      if (useCurve && controlPoint) {
        const t = Math.max(0.7, progress);
        const dx = 2 * (1 - t) * (controlPoint.x - fromX) + 2 * t * (toX - controlPoint.x);
        const dy = 2 * (1 - t) * (controlPoint.y - fromY) + 2 * t * (toY - controlPoint.y);
        angle = Math.atan2(dy, dx);
      } else {
        angle = Math.atan2(toY - fromY, toX - fromX);
      }
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

  function findLineBlockers(from: CanvasPoint, to: CanvasPoint, rivals: CanvasPoint[]) {
    const blockers: { rival: CanvasPoint; dist: number; nearest: CanvasPoint }[] = [];
    const radius = 22; // ~ radio del marcador
    for (const r of rivals) {
      const nearest = nearestPointOnSegment(from, to, r);
      const d = distance(nearest, r);
      // Considerar bloqueo si está suficientemente cerca y dentro del segmento
      if (d < radius) {
        blockers.push({ rival: r, dist: d, nearest });
      }
    }
    // Priorizar el más cercano a la línea
    blockers.sort((a, b) => a.dist - b.dist);
    return blockers;
  }

  function computeAvoidanceControlPoint(from: CanvasPoint, to: CanvasPoint, blocker: { rival: CanvasPoint; dist: number; nearest: CanvasPoint }) {
    const { nearest, rival } = blocker;
    // Vector de la línea de pase
    const vx = to.x - from.x;
    const vy = to.y - from.y;
    const len = Math.hypot(vx, vy) || 1;
    const ux = vx / len;
    const uy = vy / len;
    // Perpendiculars
    const px1 = -uy;
    const py1 = ux;
    const px2 = uy;
    const py2 = -ux;
    // Elegir lado que aleje más del rival
    const offsetBase = 40; // cuánto curvar
    const cand1 = { x: nearest.x + px1 * offsetBase, y: nearest.y + py1 * offsetBase };
    const cand2 = { x: nearest.x + px2 * offsetBase, y: nearest.y + py2 * offsetBase };
    const d1 = distance(cand1, rival);
    const d2 = distance(cand2, rival);
    return d1 > d2 ? cand1 : cand2;
  }

  function nearestPointOnSegment(a: CanvasPoint, b: CanvasPoint, p: CanvasPoint): CanvasPoint {
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const ab2 = ab.x * ab.x + ab.y * ab.y;
    if (ab2 === 0) return a;
    const ap = { x: p.x - a.x, y: p.y - a.y };
    let t = (ap.x * ab.x + ap.y * ab.y) / ab2;
    t = Math.max(0, Math.min(1, t));
    return { x: a.x + ab.x * t, y: a.y + ab.y * t };
  }

  function distance(a: CanvasPoint, b: CanvasPoint) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  const drawMove = (
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    team: string,
    progress: number,
    width: number,
    height: number,
    label?: string
  ) => {
    if (points.length < 2) return;
    const fromX = points[0].x * width;
    const fromY = points[0].y * height;
    const toX = points[1].x * width;
    const toY = points[1].y * height;

    const x = fromX + (toX - fromX) * progress;
    const y = fromY + (toY - fromY) * progress;
    const color = team === 'propio' ? '#3b82f6' : '#ef4444';

    // Trayectoria tenue
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Jugador moviéndose
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (label) {
      ctx.fillStyle = 'white';
      ctx.font = '12px bold sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 16);
    }
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
