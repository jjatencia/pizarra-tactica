# 🧪 Guía de Pruebas

## Checklist de Funcionalidades

### ✅ Fichas de Jugadores
- [ ] Añadir ficha roja (máx 11)
- [ ] Añadir ficha azul (máx 11)
- [ ] Arrastrar ficha dentro del campo
- [ ] Ficha no sale de los límites del campo
- [ ] Numeración automática 1-11 sin duplicados
- [ ] Selección visual de ficha activa
- [ ] Bloqueo al llegar a 11 fichas por equipo

### ✅ Sistema de Flechas
- [ ] Cambiar a modo flecha
- [ ] Crear flecha continua (toque → arrastre → soltar)
- [ ] Crear flecha discontinua
- [ ] Seleccionar flecha existente
- [ ] Eliminar flecha seleccionada

### ✅ Controles de Vista
- [ ] Toggle campo completo / medio campo
- [ ] Activar/desactivar rejilla
- [ ] Zoom con rueda del mouse (escritorio) o pellizco (móvil)
- [ ] Pan con arrastre de dos dedos
- [ ] Doble toque para reset zoom
- [ ] Zoom se mantiene entre 50% y 300%

### ✅ Formaciones Preset
- [ ] Abrir panel de formaciones
- [ ] Aplicar formación 4-3-3 (equipo azul)
- [ ] Aplicar formación 4-4-2 (equipo azul)  
- [ ] Aplicar formación 3-5-2 (equipo azul)
- [ ] Aplicar formación para equipo rojo (espejada)
- [ ] Bloqueo si ya hay fichas en el campo

### ✅ Funciones de Utilidad
- [ ] Espejar posiciones (izquierda ↔ derecha)
- [ ] Undo/Redo funciona correctamente
- [ ] Reset limpia todo el campo
- [ ] Auto-guardado en localStorage

### ✅ Exportación/Importación
- [ ] Exportar como PNG (descarga imagen)
- [ ] Exportar como JSON (descarga archivo)
- [ ] Importar JSON (cargar archivo)
- [ ] Estado se mantiene al recargar página

### ✅ PWA en iPad
- [ ] "Add to Home Screen" aparece en Safari
- [ ] App se instala como aplicación nativa
- [ ] Funciona offline después de instalación
- [ ] Icono aparece en pantalla de inicio
- [ ] Abre en modo standalone (sin barra de Safari)
- [ ] Orientación vertical (portrait) por defecto

### ✅ Interacciones Táctiles
- [ ] Arrastre fluido de fichas con un dedo
- [ ] Pellizcar para zoom funciona correctamente
- [ ] No hay scroll accidental durante interacciones
- [ ] Gestos no interfieren entre sí
- [ ] Respuesta táctil inmediata (< 100ms)

## Pruebas de Rendimiento

### 📊 Casos de Estrés
- [ ] 11 fichas rojas + 11 fichas azules simultáneas
- [ ] 20+ flechas en el campo
- [ ] Arrastre rápido y continuo de fichas
- [ ] Zoom/pan mientras se arrastra
- [ ] Múltiples undo/redo consecutivos

### 🎯 Métricas Objetivo
- **FPS**: 60fps durante arrastre
- **Respuesta táctil**: < 100ms
- **Carga inicial**: < 3 segundos
- **Tamaño bundle**: < 500KB gzipped

## Pruebas de Compatibilidad

### 📱 Dispositivos iPad
- [ ] iPad (9ª generación) - iPadOS 15+
- [ ] iPad Air - iPadOS 15+  
- [ ] iPad Pro 11" - iPadOS 15+
- [ ] iPad Pro 12.9" - iPadOS 15+

### 🌐 Navegadores
- [ ] Safari (principal)
- [ ] Chrome (funcional, no instalable como PWA)
- [ ] Firefox (funcional, no instalable como PWA)

### 🔧 Herramientas de Desarrollo
- [ ] Lighthouse PWA score > 90
- [ ] Accesibilidad score > 90
- [ ] Performance score > 90
- [ ] Manifest válido
- [ ] Service Worker registrado

## Comandos de Prueba

```bash
# Desarrollo
npm run dev
# Abrir http://localhost:5173 en iPad Safari

# Build y preview
npm run build
npm run preview
# Abrir http://localhost:4173 en iPad Safari

# Verificar PWA
# Usar Chrome DevTools > Application > Manifest
# Verificar Service Worker registrado
```

## Casos de Uso Reales

### 🏃‍♂️ Entrenamiento
1. **Preparación**: Cargar formación base (ej. 4-3-3)
2. **Explicación**: Mover fichas para mostrar posiciones
3. **Movimientos**: Dibujar flechas para mostrar pases/carreras
4. **Variantes**: Usar "Espejar" para mostrar jugadas desde ambos lados
5. **Guardar**: Exportar PNG para compartir con jugadores

### ⚽ Análisis Táctico
1. **Recrear jugada**: Colocar fichas según posiciones reales
2. **Movimientos**: Dibujar flechas de pases y desmarques
3. **Alternativas**: Usar undo/redo para probar variantes
4. **Comparar**: Guardar múltiples versiones como JSON

### 📋 Planificación
1. **Formación base**: Aplicar preset según estrategia
2. **Ajustes**: Mover fichas a posiciones específicas
3. **Roles**: Usar números para identificar jugadores
4. **Fases**: Crear múltiples tableros para diferentes fases de juego

## Errores Conocidos y Soluciones

### 🐛 Problemas Comunes
- **Fichas se "pegan"**: Toca en espacio vacío para deseleccionar
- **Zoom muy pequeño**: Doble toque para reset
- **No puedo crear flechas**: Verifica que estés en modo "Flecha"
- **App no responde**: Recarga la página o reinicia la app

### 🔧 Soluciones Técnicas
- **Memory leak**: Cierra y abre la app si se vuelve lenta
- **Touch events**: Evita tocar con múltiples dedos simultáneamente
- **Export fails**: Verifica permisos de descarga en Safari