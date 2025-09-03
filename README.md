# 🏟️ Pizarra Táctica de Fútbol

Una PWA (Progressive Web App) moderna para entrenadores de fútbol que permite crear y visualizar tácticas de forma táctil en iPad.

## ✨ Características

- **🎯 Táctil y fluido**: Optimizado para iPad con gestos naturales
- **⚽ Campo reglamentario**: Proporciones FIFA 105×68m con líneas oficiales
- **🔴🔵🟢🟡 Fichas de equipos**: Máximo 11 jugadores por equipo (numerados 1-11)
- **➡️ Flechas tácticas**: Continuas y discontinuas para movimientos y pases
- **📱 PWA instalable**: Funciona 100% offline en iPad
- **🎨 Formaciones preset**: 4-3-3, 4-4-2, 3-5-2
- **🔄 Undo/Redo**: Historial de hasta 50 acciones
- **💾 Persistencia**: Auto-guardado y exportación PNG/JSON

## 🚀 Instalación y Desarrollo

### Prerrequisitos
- Node.js 18+ 
- npm o yarn

### Configuración inicial
```bash
# Clonar e instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build

# Previsualizar build
npm run preview
```

### Desarrollo local
1. Ejecuta `npm run dev`
2. Abre `http://localhost:5173` en tu navegador
3. Para testing en iPad: usa la IP local (ej. `http://192.168.1.100:5173`)

## 📱 Instalación en iPad

### Opción 1: Add to Home Screen (Safari)
1. Abre la app en Safari en tu iPad
2. Toca el botón de compartir (⬆️)
3. Selecciona "Add to Home Screen"
4. La app se instalará como una aplicación nativa

### Opción 2: Despliegue en Vercel
1. Conecta tu repositorio a Vercel
2. El build se ejecutará automáticamente
3. Vercel detectará la configuración de Vite automáticamente
4. Accede a la URL de producción desde tu iPad

## 🎮 Uso de la Aplicación

### Controles Principales
- **✋ Modo Selección**: Arrastra fichas, selecciona elementos
- **➡️ Modo Flecha**: Dibuja flechas tocando origen → arrastrando → soltando en destino

### Gestos Táctiles
- **Arrastrar ficha**: Toca y arrastra cualquier ficha dentro del campo
- **Crear flecha**: En modo flecha, toca inicio → arrastra → suelta en destino
- **Pinch to zoom**: Pellizca para hacer zoom (0.5x - 3x)
- **Doble toque**: Reset zoom a 100%
- **Pulsación larga**: Menú contextual (próximamente)

### Toolbar
- **🔴🔵 Añadir fichas**: Máximo 11 por equipo
- **━ ┅ Tipo flecha**: Continua o discontinua
- **🏟️⚽ Vista**: Campo completo o medio campo
- **📐 Rejilla**: Activar snapping a rejilla
- **📋 Formaciones**: Aplicar formaciones preset
- **🔄 Espejar**: Invertir posiciones izquierda ↔ derecha
- **↶↷ Undo/Redo**: Historial de acciones
- **💾📂 Guardar/Cargar**: Exportar/importar JSON
- **📷 PNG**: Exportar imagen de la táctica

### Formaciones Preset
- **4-3-3**: Formación ofensiva con 3 delanteros
- **4-4-2**: Formación equilibrada clásica
- **3-5-2**: Formación con 5 mediocampistas

## 🛠️ Tecnologías

- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: TailwindCSS
- **Estado**: Zustand
- **PWA**: vite-plugin-pwa + Workbox
- **Gráficos**: SVG nativo (sin librerías pesadas)

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── ArrowsLayer.tsx  # Capa de flechas SVG
│   ├── Pitch.tsx        # Campo de fútbol SVG
│   ├── PresetsPanel.tsx # Panel de formaciones
│   ├── Token.tsx        # Fichas de jugadores
│   └── Toolbar.tsx      # Barra de herramientas
├── hooks/               # Hooks personalizados
│   ├── useBoardStore.ts # Estado global Zustand
│   ├── usePointerInteractions.ts # Gestos táctiles
│   └── useZoomPan.ts    # Zoom y pan
├── lib/                 # Utilidades
│   ├── exportPng.ts     # Exportación de imágenes
│   ├── formations.ts    # Formaciones preset
│   ├── geometry.ts      # Cálculos geométricos
│   └── localStorage.ts  # Persistencia
├── styles/
│   └── index.css        # Estilos globales
├── types/
│   └── index.ts         # Tipos TypeScript
├── App.tsx              # Componente principal
└── main.tsx             # Punto de entrada
```

## 🚀 Despliegue en Vercel

### Configuración automática
1. Conecta tu repositorio GitHub a Vercel
2. Vercel detecta automáticamente:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Variables de entorno (opcional)
No se requieren variables de entorno para el funcionamiento básico.

### Configuración manual (vercel.json)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

## 🔧 Personalización

### Colores de equipos
Edita `src/types/index.ts` y `tailwind.config.js`:
```js
colors: {
  team: {
    red: '#EF4444',    // Rojo del equipo
    blue: '#3B82F6',   // Azul del equipo
    green: '#22C55E',  // Verde del equipo
    yellow: '#EAB308'  // Amarillo del equipo
  }
}
```

### Dimensiones del campo
Modifica `src/components/Pitch.tsx`:
```ts
const fieldWidth = 105;  // metros
const fieldHeight = 68;  // metros
```

### Formaciones personalizadas
Añade nuevas formaciones en `src/lib/formations.ts`:
```ts
{
  name: 'Mi Formación',
  tokens: [
    { team: 'blue', number: 1, x: 10, y: 34 },
    // ... más posiciones
  ]
}
```

## 🐛 Solución de Problemas

### La app no se instala en iPad
- Verifica que estés usando Safari (no Chrome)
- Asegúrate de que el manifest.webmanifest sea accesible
- Comprueba que los iconos existan en `/public/icons/`

### Gestos táctiles no funcionan
- Verifica que `touch-action: none` esté aplicado al SVG
- Asegúrate de que no hay elementos HTML interceptando los eventos

### Exportación PNG falla
- Verifica que el SVG no tenga elementos externos
- Asegúrate de que el navegador soporte `canvas.toBlob()`

### Performance en iPad
- Reduce el número de fichas y flechas simultáneas
- Desactiva efectos visuales innecesarios
- Usa `transform3d` para acelerar animaciones

## 📋 Roadmap

- [ ] Menús contextuales para fichas y flechas
- [ ] Animaciones de movimiento de jugadores
- [ ] Múltiples tableros/jugadas
- [ ] Compartir tácticas via URL
- [ ] Modo presentación fullscreen
- [ ] Anotaciones de texto
- [ ] Temporizador de fases de juego

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para más detalles.

## 🏆 Créditos

Desarrollado como pizarra táctica profesional para entrenadores de fútbol.
Optimizado para iPad y uso offline en campo de entrenamiento.