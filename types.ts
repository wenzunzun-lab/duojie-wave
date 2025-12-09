export interface WaveParams {
  amplitude: number; // A (cm)
  wavelength: number; // lambda (m)
  period: number; // T (s)
  direction: 1 | -1; // 1 for +x, -1 for -x
  phaseShift: number; // phi
}

export interface SimulationState {
  isPlaying: boolean;
  time: number; // Current simulation time t
  marker1X: number; // Primary marker (P) - tracked in y-t
  marker2X: number; // Secondary marker (Q) - for distance measurement
  markerAX: number; // Optional marker (A) - moves with wave
  showMarkerA: boolean; // Toggle for marker A
  xOffset: number; // Starting point of x-axis view
  
  // New features
  referenceX: number; // Position of the vertical reference axis
  showReference: boolean; // Toggle for reference axis
  showMarkerP: boolean; // Toggle for marker P
  showMarkerQ: boolean; // Toggle for marker Q
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  isThinking?: boolean;
}

export interface AIAnalysisResult {
  text: string;
  suggestedParams?: Partial<WaveParams>;
}