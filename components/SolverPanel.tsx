import React, { useRef, useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Send, X, Loader2, Sparkles } from 'lucide-react';
import { ChatMessage, AIAnalysisResult } from '../types';
import { analyzeWaveProblem } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface SolverPanelProps {
  onAnalysisComplete: (result: AIAnalysisResult) => void;
}

const SolverPanel: React.FC<SolverPanelProps> = ({ onAnalysisComplete }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'model',
      text: "你好！我是你的物理波形助教。请上传一张波的题目图片（例如 $y-x$ 波形图或 $y-t$ 振动图），我会帮你分析解题，并自动设置模拟器参数以便你理解多解问题！",
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedImage) || isProcessing) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      imageUrl: imagePreview || undefined,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsProcessing(true);

    try {
      let responseText = '';
      
      if (selectedImage) {
        // Image Analysis
        const result = await analyzeWaveProblem(selectedImage, inputText);
        responseText = result.text;
        
        // Notify parent if parameters were found
        onAnalysisComplete(result);
      } else {
         responseText = "请上传一张物理题目图片，以便我为你分析波的参数并进行可视化。";
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "分析过程中遇到错误，请稍后重试。",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-pink-500 bg-clip-text text-transparent">
          波浪大师 AI
        </h1>
        <p className="text-xs text-slate-400">Powered by Gemini 2.5</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
              }`}
            >
              {msg.imageUrl && (
                <img 
                  src={msg.imageUrl} 
                  alt="User upload" 
                  className="w-full h-auto rounded-lg mb-2 border border-white/20" 
                />
              )}
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown 
                  remarkPlugins={[remarkMath]} 
                  rehypePlugins={[rehypeKatex]}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
             <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center gap-2">
                <Loader2 className="animate-spin text-blue-400" size={16} />
                <span className="text-sm text-slate-400">正在分析波形数据...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        
        {/* Image Preview Tag */}
        {imagePreview && (
          <div className="mb-2 relative inline-block">
             <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded-lg border border-blue-500" />
             <button 
                onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                className="absolute -top-2 -right-2 bg-slate-900 text-red-500 rounded-full p-1 border border-slate-700 hover:bg-slate-800"
             >
               <X size={12} />
             </button>
          </div>
        )}

        <div className="flex items-center gap-2">
           <button
             onClick={() => fileInputRef.current?.click()}
             className="p-3 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-full transition-colors"
             title="上传图片"
           >
             <ImageIcon size={20} />
           </button>
           <input
             type="file"
             ref={fileInputRef}
             className="hidden"
             accept="image/*"
             onChange={handleImageSelect}
           />
           
           <input
             type="text"
             value={inputText}
             onChange={(e) => setInputText(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             placeholder="输入关于波的问题..."
             className="flex-1 bg-slate-950 border border-slate-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
           />
           
           <button
             onClick={handleSend}
             disabled={(!inputText && !selectedImage) || isProcessing}
             className={`p-3 rounded-full transition-all ${
               (!inputText && !selectedImage) || isProcessing
                 ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                 : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/20'
             }`}
           >
             <Send size={18} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default SolverPanel;