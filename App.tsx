import React, { useState } from 'react';
import WaveSimulator from './components/WaveSimulator';
import SolverPanel from './components/SolverPanel';
import { WaveParams, AIAnalysisResult } from './types';
import { ArrowRight, Sparkles, ChevronLeft, Menu } from 'lucide-react';

const App: React.FC = () => {
  const [waveParams, setWaveParams] = useState<WaveParams>({
    amplitude: 5,
    wavelength: 2.0,
    period: 2.0,
    direction: 1, // Default +x
    phaseShift: 0
  });

  const [aiSuggestion, setAiSuggestion] = useState<Partial<WaveParams> | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleAnalysisResult = (result: AIAnalysisResult) => {
    if (result.suggestedParams) {
      setAiSuggestion(result.suggestedParams);
    }
  };

  const applySuggestion = () => {
    if (aiSuggestion) {
      setWaveParams(prev => ({
        ...prev,
        ...aiSuggestion,
        // Ensure strictly typed overrides if needed, fallbacks to prev
        amplitude: aiSuggestion.amplitude ?? prev.amplitude,
        wavelength: aiSuggestion.wavelength ?? prev.wavelength,
        period: aiSuggestion.period ?? prev.period,
        direction: (aiSuggestion.direction as 1 | -1) ?? prev.direction
      }));
      setAiSuggestion(null);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-950 overflow-hidden relative">
      {/* Left Panel: Chat & Analysis */}
      <div 
        className={`
          flex-shrink-0 z-20 shadow-2xl bg-slate-900 border-r border-slate-700 
          transition-all duration-300 ease-in-out overflow-hidden
          ${isSidebarOpen 
            ? 'w-full md:w-[400px] lg:w-[450px] h-[40vh] md:h-full opacity-100' 
            : 'w-full md:w-0 h-0 md:h-full opacity-0 border-none'}
        `}
      >
        <div className="w-full md:w-[400px] lg:w-[450px] h-full">
            <SolverPanel onAnalysisComplete={handleAnalysisResult} />
        </div>
      </div>

      {/* Right Panel: Simulation (Rest) */}
      <div className="flex-1 h-full overflow-y-auto bg-slate-950 relative">
        {/* Top Navigation / Toggle Bar */}
        <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur p-4 border-b border-slate-800/50 flex items-center">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700"
              title={isSidebarOpen ? "收起助手" : "展开助手"}
            >
              {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
            <span className="ml-4 text-sm font-bold text-slate-500 uppercase tracking-wider">
              {isSidebarOpen ? "" : "AI 物理助教已隐藏"}
            </span>
        </div>

        <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-8">
          
          <div className="text-center md:text-left mb-8 animate-fade-in">
             {!isSidebarOpen && (
               <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-900/30 text-blue-400 rounded-full text-xs font-medium mb-2 border border-blue-500/20">
                  <Sparkles size={12} /> 专注模式
               </div>
             )}
            <h2 className="text-3xl font-bold text-slate-100 mb-2">波浪分析实验室</h2>
            <p className="text-slate-400">
              交互式可视化空间波形 ($y-x$) 与质点时间振动 ($y-t$) 之间的关系。
            </p>
          </div>

          {/* AI Suggestion Banner */}
          {aiSuggestion && (
            <div className="bg-indigo-900/40 border border-indigo-500/50 rounded-xl p-4 flex items-center justify-between animate-fade-in-up">
              <div>
                <h4 className="font-semibold text-indigo-300 flex items-center gap-2">
                  <Sparkles size={16} /> 检测到参数
                </h4>
                <p className="text-sm text-indigo-200/80 mt-1">
                  AI 从你的题目中识别出了具体参数。是否应用到模拟器中？
                </p>
                <div className="flex gap-4 mt-2 text-xs font-mono text-white">
                    {aiSuggestion.amplitude && <span>A: {aiSuggestion.amplitude}cm</span>}
                    {aiSuggestion.wavelength && <span>λ: {aiSuggestion.wavelength}m</span>}
                    {aiSuggestion.period && <span>T: {aiSuggestion.period}s</span>}
                </div>
              </div>
              <button 
                onClick={applySuggestion}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                开始模拟 <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Simulator */}
          <WaveSimulator 
            params={waveParams} 
            onParamsChange={setWaveParams}
            isSidebarOpen={isSidebarOpen}
          />

          {/* Educational Note */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <h4 className="text-blue-400 font-semibold mb-2">多解问题提示：周期性</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                   在仅已知两个时刻波形（$t_1$ 和 $t_2$）的问题中，波传播的距离可能是 $\Delta x$ 或 $\Delta x + n\lambda$。这意味着波速存在多解 ($v = \frac{ \Delta x + n\lambda}{\Delta t}$)。
                </p>
             </div>
             <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <h4 className="text-pink-400 font-semibold mb-2">传播方向判断：上下坡法</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                   如何从波形图判断质点运动方向？记住口诀：“上坡下，下坡上”。即沿着波的传播方向看，处于“上坡”段的质点向下运动，处于“下坡”段的质点向上运动。
                </p>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;