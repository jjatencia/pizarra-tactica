# Notas de Deploy V2 - Pizarra Fútbol

## Cambios Implementados - Segunda Versión

### Ajustes de Tiempos y Secuencias:

1. **Duración de trazado de líneas**
   - Mínimo: 1 segundo
   - Máximo: 2 segundos
   - Se respeta la velocidad proporcional del dibujo original dentro de estos límites

2. **Duración de movimiento de fichas**
   - Máximo: 3 segundos
   - Mantiene la trayectoria exacta del dedo con velocidad ajustada

3. **Transiciones entre fases**
   - Pausa fija de 0.5 segundos entre cada fase
   - Las líneas se dibujan primero, luego se mueven las fichas
   - Si se borraron líneas, desaparecen antes del movimiento

4. **Secuenciación mejorada**
   - Los movimientos de fichas empiezan automáticamente después del trazado de líneas
   - No hay retrasos innecesarios entre acciones
   - Flujo más natural y predecible

### Build Completado
- Build ejecutado exitosamente
- Tamaño del bundle: 365.68 kB (114.35 kB gzipped)

### Para hacer el Deploy:

```bash
# Opción 1: Vercel CLI
vercel login
vercel --prod

# Opción 2: Git push (si está conectado a Vercel)
git add .
git commit -m "fix: ajuste de tiempos de reproducción - líneas 1-2s, fichas max 3s, pausa 0.5s"
git push
```

### Comportamiento Esperado:
1. Al grabar una secuencia y pausar, las líneas dibujadas se reproducen en 1-2 segundos
2. Los movimientos de fichas se ejecutan en máximo 3 segundos
3. Entre cada pausa hay exactamente 0.5 segundos de transición
4. Las líneas borradas desaparecen antes de que las fichas se muevan
5. Todo fluye de manera secuencial y predecible