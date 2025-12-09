import React, { useEffect, useRef, useState, useMemo } from 'react';
import { WaveParams, SimulationState } from '../types';
import { Play, Pause, RefreshCw, ChevronsRight, ChevronsLeft, Ruler, Activity, MoveRight, Eye, EyeOff, MinusSquare, RotateCcw, Clock, TrendingUp, ZoomIn, ZoomOut, MoreVertical } from 'lucide-react';

interface WaveSimulatorProps {
  params: WaveParams;
  onParamsChange: (newParams: WaveParams) => void;
  isSidebarOpen?: boolean;
}

// Extend state locally since we are adding UI only features without changing global types if possible, 
// but here we modify the state object directly used in the component.
interface ExtendedSimulationState extends SimulationState {
  isSlowMotion: boolean;
  showVelocity: boolean;
  showVerticalAxis: boolean;
  verticalAxisX: number; // Position of the white vertical dashed axis
  visibleWidth: number; // Controls the zoom level (how many meters are visible)
}

const WaveSimulator: React.FC<WaveSimulatorProps> = ({ 
    params, 
    onParamsChange, 
    isSidebarOpen = true, 
}) => {
  const [simState, setSimState] = useState<ExtendedSimulationState>({
    isPlaying: true,
    time: 0,
    marker1X: 1.0, // Primary marker (P)
    marker2X: 3.0, // Secondary marker (Q)
    markerAX: 0.5, // Optional marker (A) - Start Position (t=0)
    showMarkerA: false,
    xOffset: 0, // View starts at x=0
    
    referenceX: 0.0, // Default reference axis position
    showReference: false,
    showMarkerP: true,
    showMarkerQ: true,
    
    isSlowMotion: false,
    showVelocity: false,
    showVerticalAxis: false, // Default hidden for the vertical dashed axis
    verticalAxisX: 0.0, // Default position for vertical dashed axis
    visibleWidth: 6.0, // Default zoom level (6 meters visible)
  });

  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);

  // Animation Loop
  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined && simState.isPlaying) {
      let deltaTime = (time - previousTimeRef.current) / 1000;
      
      // Apply Slow Motion Factor (0.2x speed)
      if (simState.isSlowMotion) {
        deltaTime *= 0.2;
      }

      setSimState(prev => ({ ...prev, time: prev.time + deltaTime }));
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simState.isPlaying, simState.isSlowMotion]);

  // Helper to format phase in terms of Pi
  const formatPhase = (val: number) => {
    const piVal = val / Math.PI;
    if (Math.abs(piVal) < 0.01) return "0";
    if (Math.abs(piVal - 1) < 0.01) return "π";
    if (Math.abs(piVal - 2) < 0.01) return "2π";
    
    // Check common denominators
    const denoms = [2, 3, 4, 6];
    for (const d of denoms) {
      const num = Math.round(piVal * d);
      if (Math.abs(piVal * d - num) < 0.01) {
          if (num === 1) return `π/${d}`;
          if (num === -1) return `-π/${d}`;
          return `${num}π/${d}`;
      }
    }
    return val.toFixed(2) + " rad";
  };

  // SVG Configuration
  const width = 600;
  const height = 240;
  const margin = { top: 40, right: 30, bottom: 40, left: 50 };
  const graphWidth = width - margin.left - margin.right;
  const graphHeight = height - margin.top - margin.bottom;

  // Scales
  const worldMax = 24; // Maximum allowed coordinate for markers/view
  
  // Transform spatial X to pixel X based on offset and DYNAMIC visibleWidth
  const xScaleSpace = (x: number) => ((x - simState.xOffset) / simState.visibleWidth) * graphWidth; 
  
  const yScale = (y: number) => graphHeight / 2 - (y / 10) * (graphHeight / 2); // -10 to 10 cm
  const xScaleTime = (t: number) => (t / 4) * graphWidth; // 0 to 4 seconds window

  // Calculate Wave Y
  const calculateY = (x: number, t: number) => {
    const k = (2 * Math.PI) / params.wavelength;
    const omega = (2 * Math.PI) / params.period;
    const kx = params.direction === 1 ? -k * x : k * x;
    return params.amplitude * Math.cos(omega * t + kx + params.phaseShift);
  };

  // Calculate Particle Velocity (Direction)
  const calculateVelocity = (x: number, t: number) => {
    const k = (2 * Math.PI) / params.wavelength;
    const omega = (2 * Math.PI) / params.period;
    const kx = params.direction === 1 ? -k * x : k * x;
    // v = dy/dt = -A * omega * sin(...)
    return -params.amplitude * omega * Math.sin(omega * t + kx + params.phaseShift);
  };

  // Generate Path Data for Wave Profile (Space) at current time t
  const spacePathData = useMemo(() => {
    const startX = simState.xOffset;
    const endX = startX + simState.visibleWidth;
    
    let path = `M 0 ${yScale(calculateY(startX, simState.time))}`;
    // Adaptive sampling based on zoom level to keep performance high
    const step = simState.visibleWidth > 10 ? 0.1 : 0.05;

    for (let x = startX; x <= endX; x += step) {
      path += ` L ${xScaleSpace(x)} ${yScale(calculateY(x, simState.time))}`;
    }
    path += ` L ${graphWidth} ${yScale(calculateY(endX, simState.time))}`;
    
    return path;
  }, [simState.time, params, simState.xOffset, simState.visibleWidth]);

  // Initial Wave Path (t=0) - GREEN
  const initialWavePath = useMemo(() => {
    const k = (2 * Math.PI) / params.wavelength;
    const getInitY = (x: number) => {
         const kx = params.direction === 1 ? -k * x : k * x;
         return params.amplitude * Math.cos(kx + params.phaseShift);
    };
    
    const startX = simState.xOffset;
    const endX = startX + simState.visibleWidth;
    const step = simState.visibleWidth > 10 ? 0.1 : 0.05;

    let path = `M 0 ${yScale(getInitY(startX))}`;
    for (let x = startX; x <= endX; x += step) {
      path += ` L ${xScaleSpace(x)} ${yScale(getInitY(x))}`;
    }
    path += ` L ${graphWidth} ${yScale(getInitY(endX))}`;
    
    return path;
  }, [params, simState.xOffset, simState.visibleWidth]);


  // Generate Path Data for Vibration Graph (Time) for Marker 2 (Q)
  const timePathData = useMemo(() => {
    let path = "";
    for (let t = 0; t <= 4; t += 0.05) {
      const y = calculateY(simState.marker2X, t);
      const xPos = xScaleTime(t);
      const yPos = yScale(y);
      if (t === 0) path += `M ${xPos} ${yPos}`;
      else path += ` L ${xPos} ${yPos}`;
    }
    return path;
  }, [params, simState.marker2X]);

  // Generate Velocity Vectors (Arrows)
  const velocityArrows = useMemo(() => {
      if (!simState.showVelocity) return [];
      const arrows = [];
      const startX = Math.floor(simState.xOffset / 0.5) * 0.5; // Snap to grid
      const endX = startX + simState.visibleWidth;

      for (let x = startX; x <= endX; x += 0.5) {
          if (x < simState.xOffset) continue; // Don't draw off-screen left
          const y = calculateY(x, simState.time);
          const v = calculateVelocity(x, simState.time);
          const px = xScaleSpace(x);
          const py = yScale(y);
          
          // Threshold to avoid drawing arrows at equilibrium or extrema where v is near 0
          if (Math.abs(v) > 0.1) {
              const direction = v > 0 ? -1 : 1; // SVG Y is inverted. v>0 means UP means smaller Y.
              const arrowLen = 20;
              const yEnd = py + direction * arrowLen;
              
              arrows.push(
                  <g key={`arrow-${x}`}>
                      <line x1={px} y1={py} x2={px} y2={yEnd} stroke="#f59e0b" strokeWidth="2" />
                      {/* Arrowhead */}
                      <path 
                        d={`M ${px-4} ${yEnd - direction * 5} L ${px} ${yEnd} L ${px+4} ${yEnd - direction * 5}`} 
                        fill="none" 
                        stroke="#f59e0b" 
                        strokeWidth="2" 
                      />
                  </g>
              );
          }
      }
      return arrows;
  }, [simState.time, params, simState.xOffset, simState.showVelocity, simState.visibleWidth]);

  // Propagation Physics
  const waveSpeed = params.wavelength / params.period; // v = lambda / T
  const propagationDistance = waveSpeed * simState.time; // S = v * t
  const propagationShift = propagationDistance * params.direction; // signed shift

  // Current Positions
  const marker2Y = calculateY(simState.marker2X, simState.time); 
  
  // Marker A (Tracking Point) Logic
  const currentAX = simState.markerAX + propagationShift;
  const markerAY = calculateY(currentAX, simState.time);
  const markerAStartY = calculateY(simState.markerAX, 0);

  // Initial Positions (t=0)
  const marker1Y_0 = calculateY(simState.marker1X, 0);

  const distance = Math.abs(simState.marker2X - simState.marker1X);
  const wavelengthCount = distance / params.wavelength;

  // Handle Graph Click
  const handleGraphClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clickXPixel = e.clientX - svgRect.left - margin.left;
    const xVal = (clickXPixel / graphWidth) * simState.visibleWidth + simState.xOffset;
    const clampedX = Math.max(0, Math.min(worldMax, xVal));

    let candidates = [];
    if (simState.showMarkerP) candidates.push({ id: 'P', dist: Math.abs(clampedX - simState.marker1X) });
    if (simState.showMarkerQ) candidates.push({ id: 'Q', dist: Math.abs(clampedX - simState.marker2X) });
    if (simState.showMarkerA) candidates.push({ id: 'A', dist: Math.abs(clampedX - currentAX) });
    if (simState.showReference) candidates.push({ id: 'REF', dist: Math.abs(clampedX - simState.referenceX) });
    if (simState.showVerticalAxis) candidates.push({ id: 'VAXIS', dist: Math.abs(clampedX - simState.verticalAxisX) });

    if (candidates.length === 0) return;
    // Only select if within a reasonable threshold proportional to view
    const threshold = simState.visibleWidth * 0.05; 
    const closest = candidates.reduce((prev, curr) => prev.dist < curr.dist ? prev : curr);

    if (closest.dist > threshold) return; // Too far away from any marker

    if (closest.id === 'A') {
       setSimState(prev => ({ ...prev, markerAX: clampedX - propagationShift }));
    } else if (closest.id === 'P') {
      setSimState(prev => ({ ...prev, marker1X: clampedX }));
    } else if (closest.id === 'Q') {
      setSimState(prev => ({ ...prev, marker2X: clampedX }));
    } else if (closest.id === 'REF') {
      setSimState(prev => ({ ...prev, referenceX: clampedX }));
    } else if (closest.id === 'VAXIS') {
      setSimState(prev => ({ ...prev, verticalAxisX: clampedX }));
    }
  };

  return (
    <div className="flex flex-col gap-6 bg-slate-900 rounded-xl pb-36">
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-pink-500">⚡</span> 波形模拟器
            </h2>
        </div>
        <button 
            onClick={() => setSimState(s => ({ ...s, time: 0 }))}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
            title="重置时间"
        >
            <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800">
         <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase font-semibold">波速 (v)</span>
            <span className="text-lg font-mono text-slate-200">{waveSpeed.toFixed(2)} m/s</span>
         </div>
         <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase font-semibold">波传播距离 (S)</span>
            <div className="flex items-baseline gap-1">
                <span className="text-lg font-mono text-yellow-400">{propagationDistance.toFixed(2)} m</span>
                <span className="text-xs text-slate-600 font-mono">
                    ({(propagationDistance / params.wavelength).toFixed(2)}λ)
                </span>
            </div>
         </div>
      </div>

      {/* Main Parameters Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <label className="text-slate-400">振幅 (A)</label>
          <input 
            type="range" min="1" max="10" step="0.5" 
            value={params.amplitude}
            onChange={(e) => onParamsChange({...params, amplitude: parseFloat(e.target.value)})}
            className="accent-blue-500"
          />
          <span className="font-mono text-xs">{params.amplitude} cm</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-slate-400">周期 (T)</label>
          <input 
            type="range" min="0.5" max="4.0" step="0.1" 
            value={params.period}
            onChange={(e) => onParamsChange({...params, period: parseFloat(e.target.value)})}
            className="accent-purple-500"
          />
          <span className="font-mono text-xs">{params.period} s</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-slate-400">波长 (λ)</label>
          <input 
            type="range" min="0.5" max="4.0" step="0.1" 
            value={params.wavelength}
            onChange={(e) => onParamsChange({...params, wavelength: parseFloat(e.target.value)})}
            className="accent-green-500"
          />
          <span className="font-mono text-xs">{params.wavelength} m</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 flex justify-between">
              <span>初相位 (φ)</span>
              <span className="font-mono text-xs text-amber-400">{formatPhase(params.phaseShift)}</span>
          </label>
          <input 
            type="range" 
            min="0" 
            max={2 * Math.PI} 
            step={Math.PI / 12} 
            value={params.phaseShift}
            onChange={(e) => onParamsChange({...params, phaseShift: parseFloat(e.target.value)})}
            className="accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-600 px-1">
              <span>0</span>
              <span>π</span>
              <span>2π</span>
          </div>
        </div>
      </div>

      {/* Visibility & Markers Control Section */}
      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
        <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
                <Ruler className="text-yellow-400" size={16} />
                <h3 className="text-sm font-semibold text-slate-300">显示控制 & 位置标记</h3>
            </div>
            {/* Quick Visibility Toggles */}
            <div className="flex gap-2 text-xs">
                {/* Vertical Reference Line Toggle */}
                <button 
                    onClick={() => setSimState(s => ({...s, showReference: !s.showReference}))}
                    className={`flex items-center gap-1 px-2 py-1 rounded border ${simState.showReference ? 'bg-lime-900/50 border-lime-500 text-lime-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                >
                    {simState.showReference ? <Eye size={12}/> : <EyeOff size={12}/>} 竖实线
                </button>
                <button 
                    onClick={() => setSimState(s => ({...s, showMarkerP: !s.showMarkerP}))}
                    className={`flex items-center gap-1 px-2 py-1 rounded border ${simState.showMarkerP ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                >
                    {simState.showMarkerP ? <Eye size={12}/> : <EyeOff size={12}/>} P
                </button>
                <button 
                    onClick={() => setSimState(s => ({...s, showMarkerQ: !s.showMarkerQ}))}
                    className={`flex items-center gap-1 px-2 py-1 rounded border ${simState.showMarkerQ ? 'bg-pink-900/50 border-pink-500 text-pink-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
                >
                    {simState.showMarkerQ ? <Eye size={12}/> : <EyeOff size={12}/>} Q
                </button>
            </div>
        </div>

        <div className="flex flex-col gap-3">
             {/* Dynamic Controls based on Visibility */}
             <div className="flex flex-col md:flex-row gap-4">
                
                {simState.showReference && (
                    <div className="flex items-center gap-2 flex-1 animate-fade-in bg-slate-900/30 p-2 rounded">
                        <span className="text-xs text-lime-400 font-bold whitespace-nowrap w-12 flex items-center gap-1"><MinusSquare size={12} className="rotate-90"/> 实线:</span>
                        <input 
                            type="range" min="0" max={worldMax} step="0.1"
                            value={simState.referenceX}
                            onChange={(e) => setSimState(s => ({...s, referenceX: parseFloat(e.target.value)}))}
                            className="flex-1 accent-lime-500 h-2"
                        />
                        <span className="font-mono text-xs w-10 text-right">{simState.referenceX.toFixed(1)}m</span>
                    </div>
                )}

                {(simState.showMarkerP || simState.showMarkerQ) && (
                    <div className="flex items-center gap-2 flex-1 animate-fade-in bg-slate-900/30 p-2 rounded">
                        {simState.showMarkerP && (
                            <>
                                <span className="text-xs text-green-500 font-bold whitespace-nowrap w-4">P:</span>
                                <input 
                                    type="range" min="0" max={worldMax} step="0.1"
                                    value={simState.marker1X}
                                    onChange={(e) => setSimState(s => ({...s, marker1X: parseFloat(e.target.value)}))}
                                    className="flex-1 accent-green-500 h-2"
                                />
                            </>
                        )}
                         {simState.showMarkerQ && (
                            <>
                                <span className="text-xs text-pink-500 font-bold whitespace-nowrap w-4 ml-2">Q:</span>
                                <input 
                                    type="range" min="0" max={worldMax} step="0.1"
                                    value={simState.marker2X}
                                    onChange={(e) => setSimState(s => ({...s, marker2X: parseFloat(e.target.value)}))}
                                    className="flex-1 accent-pink-500 h-2"
                                />
                            </>
                        )}
                    </div>
                )}
             </div>
        </div>
      </div>

      {/* Graphs Container */}
      <div className="flex flex-col gap-8">
        
        {/* Graph 1: Wave Profile (Snapshot) */}
        <div className="relative group">
          <div className="flex justify-between items-end mb-2 pl-2 border-l-4 border-pink-500 flex-wrap gap-2">
             <div className="flex flex-col">
                 <h3 className="text-sm font-semibold text-slate-300">
                    图甲：波形图 (y-x)
                 </h3>
                 <div className="flex gap-4 text-xs mt-1">
                    <span className="flex items-center gap-1 text-pink-400"><span className="w-3 h-0.5 border-t border-pink-500 border-dashed inline-block"></span> 当前 t={simState.time.toFixed(2)}s</span>
                    <span className="flex items-center gap-1 text-green-500"><span className="w-3 h-0.5 bg-green-500 inline-block"></span> 初始 t=0s</span>
                 </div>
             </div>
             
             {/* View Controls: Pan & Zoom */}
             <div className="flex items-center gap-3 bg-slate-800 rounded px-2 py-1 border border-slate-700 ml-auto shadow-sm">
                
                {/* Pan (Offset) */}
                <div className="flex items-center gap-1 border-r border-slate-600 pr-2">
                    <Eye size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-400 whitespace-nowrap">视窗:</span>
                    <input 
                        type="range" 
                        min="0" 
                        max={Math.max(0, worldMax - simState.visibleWidth)} 
                        step="0.5"
                        value={simState.xOffset}
                        onChange={(e) => setSimState(s => ({...s, xOffset: parseFloat(e.target.value)}))}
                        className="w-32 accent-slate-400 h-1"
                    />
                </div>

                {/* Zoom (Visible Width) */}
                <div className="flex items-center gap-1">
                    <ZoomIn size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-400 whitespace-nowrap">缩放:</span>
                    <input 
                        type="range" 
                        min="2" 
                        max="16" 
                        step="0.5"
                        value={simState.visibleWidth}
                        onChange={(e) => setSimState(s => ({...s, visibleWidth: parseFloat(e.target.value)}))}
                        className="w-32 accent-slate-400 h-1"
                    />
                </div>
             </div>

             <div className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-yellow-400">
                Δx(PQ) = {simState.showMarkerP && simState.showMarkerQ ? distance.toFixed(2) + "m" : "--"}
             </div>
          </div>
          
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            className="w-full bg-slate-800 rounded-lg border border-slate-700 cursor-crosshair hover:border-slate-500 transition-colors"
            onClick={handleGraphClick}
          >
            {/* Grid & Axes */}
            <g transform={`translate(${margin.left}, ${margin.top})`}>
              {/* Always Show Horizontal Axis */}
              <line x1={0} y1={graphHeight/2} x2={graphWidth} y2={graphHeight/2} stroke="#475569" strokeDasharray="4" />
              <line x1={0} y1={0} x2={0} y2={graphHeight} stroke="#475569" />
              
              {/* Vertical White Dashed Axis (Movable) */}
              {simState.showVerticalAxis && xScaleSpace(simState.verticalAxisX) > -100 && xScaleSpace(simState.verticalAxisX) < graphWidth + 100 && (
                <g>
                    <line 
                        x1={xScaleSpace(simState.verticalAxisX)} y1={0} 
                        x2={xScaleSpace(simState.verticalAxisX)} y2={graphHeight} 
                        stroke="white" 
                        strokeWidth="2" 
                        strokeDasharray="6,4" 
                        strokeOpacity="0.8"
                    />
                    <text x={xScaleSpace(simState.verticalAxisX) + 6} y={15} fill="white" fontSize="10" fontWeight="bold" opacity="0.8">x={simState.verticalAxisX.toFixed(1)}</text>
                </g>
              )}

              {/* Reference Axis */}
              {simState.showReference && (
                 <g>
                    <line 
                      x1={xScaleSpace(simState.referenceX)} y1={-30} 
                      x2={xScaleSpace(simState.referenceX)} y2={graphHeight + 10} 
                      stroke="#84cc16" 
                      strokeWidth="2"
                    />
                    <text x={xScaleSpace(simState.referenceX)} y={-35} fill="#84cc16" fontSize="10" textAnchor="middle" fontWeight="bold">Ref</text>
                 </g>
              )}

              {/* Initial Wave Path (t=0) */}
              <path d={initialWavePath} fill="none" stroke="#22c55e" strokeWidth="2" strokeOpacity="0.6" />

              {/* Current Wave Path (t) */}
              <path d={spacePathData} fill="none" stroke="#ec4899" strokeWidth="3" strokeDasharray="6,4" />

              {/* VELOCITY VECTORS */}
              {velocityArrows}

              {/* Markers */}
              {simState.showMarkerP && (
                  <g>
                    <line x1={xScaleSpace(simState.marker1X)} y1={0} x2={xScaleSpace(simState.marker1X)} y2={graphHeight} stroke="#22c55e" strokeDasharray="3,3" strokeOpacity="0.3" />
                    <circle cx={xScaleSpace(simState.marker1X)} cy={yScale(marker1Y_0)} r="4" fill="none" stroke="#22c55e" strokeWidth="2" />
                    <text x={xScaleSpace(simState.marker1X)} y={yScale(marker1Y_0) - 10} fill="#22c55e" fontSize="14" textAnchor="middle" fontWeight="bold">P</text>
                  </g>
              )}

              {simState.showMarkerQ && (
                  <g>
                    <line x1={xScaleSpace(simState.marker2X)} y1={0} x2={xScaleSpace(simState.marker2X)} y2={graphHeight} stroke="#ec4899" strokeDasharray="3,3" strokeOpacity="0.3" />
                    <circle cx={xScaleSpace(simState.marker2X)} cy={yScale(marker2Y)} r="6" fill="#ec4899" stroke="white" strokeWidth="2" />
                    <text x={xScaleSpace(simState.marker2X)} y={yScale(marker2Y) - 15} fill="#ec4899" fontSize="14" textAnchor="middle" fontWeight="bold">Q</text>
                  </g>
              )}
              
              {simState.showMarkerA && (
                <g>
                  <line x1={xScaleSpace(simState.markerAX)} y1={yScale(markerAStartY)} x2={xScaleSpace(currentAX)} y2={yScale(markerAY)} stroke="#22d3ee" strokeWidth="1" strokeDasharray="4,2" strokeOpacity="0.6" />
                  <circle cx={xScaleSpace(currentAX)} cy={yScale(markerAY)} r="5" fill="#06b6d4" stroke="white" strokeWidth="2" />
                  <text x={xScaleSpace(currentAX)} y={yScale(markerAY) - 15} fill="#22d3ee" fontSize="14" textAnchor="middle" fontWeight="bold">A</text>
                </g>
              )}

              {/* Axes Labels */}
              <text x={graphWidth} y={graphHeight/2 + 20} fill="#94a3b8" textAnchor="end" fontSize="12">x (m)</text>
              <text x="-10" y="10" fill="#94a3b8" fontSize="12">y (cm)</text>
              <text x="0" y={graphHeight + 15} fill="#64748b" fontSize="10" textAnchor="start">{simState.xOffset.toFixed(1)}m</text>
              <text x={graphWidth / 2} y={graphHeight + 15} fill="#64748b" fontSize="10" textAnchor="middle">{(simState.xOffset + simState.visibleWidth/2).toFixed(1)}m</text>
              <text x={graphWidth} y={graphHeight + 15} fill="#64748b" fontSize="10" textAnchor="end">{(simState.xOffset + simState.visibleWidth).toFixed(1)}m</text>
            </g>
          </svg>
        </div>

        {/* Graph 2: Vibration Graph */}
        <div className="relative">
          <div className="flex items-center gap-2 mb-2 pl-2 border-l-4 border-pink-500">
             <h3 className="text-sm font-semibold text-slate-300">
               图乙：质点 Q (x={simState.marker2X.toFixed(2)}m) 的振动图像 (y-t)
             </h3>
             <Activity size={14} className="text-pink-500 animate-pulse" />
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full bg-slate-800 rounded-lg border border-slate-700 cursor-pointer hover:border-blue-500 transition-colors" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left - margin.left;
                const t = (clickX / graphWidth) * 4;
                if(t >= 0 && t <= 4) setSimState(prev => ({...prev, time: t, isPlaying: false}));
            }}>
             <g transform={`translate(${margin.left}, ${margin.top})`}>
              <line x1={0} y1={graphHeight/2} x2={graphWidth} y2={graphHeight/2} stroke="#475569" strokeDasharray="4" />
              <line x1={0} y1={0} x2={0} y2={graphHeight} stroke="#475569" />
              <path d={timePathData} fill="none" stroke="#ec4899" strokeWidth="2" strokeOpacity="0.5" strokeDasharray="5,5" />
              <line x1={xScaleTime(simState.time % 4)} y1={0} x2={xScaleTime(simState.time % 4)} y2={graphHeight} stroke="#facc15" strokeWidth="2" />
               <circle cx={xScaleTime(simState.time % 4)} cy={yScale(marker2Y)} r="6" fill="#facc15" stroke="white" strokeWidth="2" />
              <text x={graphWidth} y={graphHeight/2 + 20} fill="#94a3b8" textAnchor="end" fontSize="12">t (s)</text>
              <text x="-10" y="10" fill="#94a3b8" fontSize="12">y (cm)</text>
            </g>
          </svg>
        </div>

      </div>

      {/* --- FIXED CONTROL CONSOLE --- */}
      <div 
        className={`fixed bottom-0 left-0 transition-[left] duration-300 ease-in-out ${isSidebarOpen ? 'md:left-[400px] lg:left-[450px]' : 'md:left-0'} right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 p-4 shadow-2xl z-50`}
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
            
            {/* Top Row: Time Slider */}
            <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center gap-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                    <Clock size={16} className="text-blue-400" />
                    <span className="text-xs text-slate-400 whitespace-nowrap">时间轴 (t):</span>
                    <input 
                        type="range" min="0" max="20" step="0.01"
                        value={simState.time}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setSimState(prev => ({...prev, time: val, isPlaying: false}));
                        }}
                        className="flex-1 h-2 accent-blue-500 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-mono text-blue-300 w-12 text-right">{simState.time.toFixed(2)}s</span>
                </div>
            </div>

            {/* Bottom Row: Playback, Direction, Point A */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                
                {/* Playback Group: Play | Slow | Reset */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setSimState(s => ({ ...s, isPlaying: !s.isPlaying }))}
                        className={`p-3 rounded-full transition-all ${simState.isPlaying ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/20'}`}
                        title={simState.isPlaying ? "暂停" : "播放"}
                    >
                        {simState.isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                    </button>
                    
                    {/* Slow Motion Toggle */}
                    <button 
                        onClick={() => setSimState(s => ({ ...s, isSlowMotion: !s.isSlowMotion }))}
                        className={`px-3 py-2 rounded-full transition-all border border-slate-700 ${simState.isSlowMotion ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'}`}
                        title="慢速播放"
                    >
                        {simState.isSlowMotion ? <span className="font-bold text-xs">慢速</span> : <span className="font-bold text-xs">常速</span>}
                    </button>

                    <button 
                        onClick={() => setSimState(s => ({ ...s, time: 0 }))}
                        className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors border border-slate-700"
                        title="重置时间"
                    >
                        <RotateCcw size={18} />
                    </button>
                    
                    <div className="flex flex-col ml-2">
                         <span className="text-[10px] text-slate-500 uppercase font-bold">Time</span>
                         <span className="text-lg font-mono text-slate-200 leading-none">{simState.time.toFixed(2)}s</span>
                    </div>
                </div>

                <div className="h-8 w-px bg-slate-700 hidden md:block"></div>

                {/* Direction Control */}
                <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg">
                    <button 
                        onClick={() => onParamsChange({...params, direction: -1})}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${params.direction === -1 ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <ChevronsLeft size={14} /> -x
                    </button>
                    <button 
                        onClick={() => onParamsChange({...params, direction: 1})}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${params.direction === 1 ? 'bg-green-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        +x <ChevronsRight size={14} />
                    </button>
                </div>

                <div className="h-8 w-px bg-slate-700 hidden md:block"></div>

                {/* Point A & Vertical Axis & Velocity Control */}
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${simState.showMarkerA ? 'bg-cyan-950/30 border-cyan-500/50' : 'bg-slate-800/50 border-transparent'}`}>
                        <button 
                            onClick={() => setSimState(s => ({...s, showMarkerA: !s.showMarkerA}))}
                            className={`p-1.5 rounded text-xs font-bold whitespace-nowrap flex items-center gap-1 ${simState.showMarkerA ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                        >
                            <MoveRight size={14} /> 点 A
                        </button>
                        
                        {simState.showMarkerA && (
                            <div className="w-24 flex items-center gap-2">
                                <input 
                                    type="range" min="0" max={worldMax} step="0.1"
                                    value={currentAX} 
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setSimState(s => ({...s, markerAX: val - propagationShift}))
                                    }}
                                    className="flex-1 accent-cyan-400 h-1.5 cursor-pointer"
                                />
                            </div>
                        )}
                    </div>

                    {/* NEW: Vertical Axis Control */}
                    <div className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${simState.showVerticalAxis ? 'bg-indigo-950/30 border-indigo-500/50' : 'bg-slate-800/50 border-transparent'}`}>
                        <button 
                            onClick={() => setSimState(s => ({...s, showVerticalAxis: !s.showVerticalAxis}))}
                            className={`p-1.5 rounded text-xs font-bold whitespace-nowrap flex items-center gap-1 ${simState.showVerticalAxis ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}
                            title="显示/隐藏竖虚线"
                        >
                            <MoreVertical size={14} /> 竖轴
                        </button>
                        
                        {simState.showVerticalAxis && (
                            <div className="w-24 flex items-center gap-2">
                                <input 
                                    type="range" min="0" max={worldMax} step="0.1"
                                    value={simState.verticalAxisX} 
                                    onChange={(e) => setSimState(s => ({...s, verticalAxisX: parseFloat(e.target.value)}))}
                                    className="flex-1 accent-indigo-400 h-1.5 cursor-pointer"
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Velocity Vector Toggle */}
                    <button
                        onClick={() => setSimState(s => ({...s, showVelocity: !s.showVelocity}))}
                        className={`p-3 rounded-lg border transition-all flex items-center justify-center ${simState.showVelocity ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        title="显示质点振动方向"
                    >
                        <TrendingUp size={18} />
                    </button>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};

export default WaveSimulator;