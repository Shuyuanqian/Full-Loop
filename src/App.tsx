import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { 
  Send, 
  Upload, 
  Image as ImageIcon, 
  User, 
  Bot, 
  Loader2, 
  ChevronRight, 
  CheckCircle2,
  AlertCircle,
  History,
  LayoutDashboard,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sendChatMessage, ChatMessage } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const GREETING = `👋 同学你好！我是你的试卷定位分析助手。
先别急着讲题，我们先把背景锁定清楚：

1. **年级学科**（例如：初三数学 / 高一物理 / 初二化学）
2. **教材版本**（例如：人教版 / 苏教版 / 北师大版）
3. **考试或练习类型**（例如：期中 / 期末 / 月考 / 模拟卷 / 日常作业）
4. **你最没底的知识点**
5. **哪道题你最想先搞懂**，或者哪几题你觉得自己是蒙对的

如果你有试卷照片，直接发图也可以，我会先帮你做分层诊断看板。`;

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: GREETING }
  ]);
  const [currentPhase, setCurrentPhase] = useState<'BACKGROUND' | 'BOARD' | 'GREEN' | 'YELLOW' | 'RED' | 'SUMMARY'>('BACKGROUND');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync phase with conversation content
  useEffect(() => {
    const lastBotMsg = [...messages].reverse().find(m => m.role === 'model')?.text || '';
    
    if (lastBotMsg.includes('错因清单表') || lastBotMsg.includes('能力自画像')) {
      setCurrentPhase('SUMMARY');
    } else if (lastBotMsg.includes('🔴') || lastBotMsg.includes('第三区')) {
      setCurrentPhase('RED');
    } else if (lastBotMsg.includes('🟡') || lastBotMsg.includes('第二区')) {
      setCurrentPhase('YELLOW');
    } else if (lastBotMsg.includes('🟢') || lastBotMsg.includes('第一区')) {
      setCurrentPhase('GREEN');
    } else if (lastBotMsg.includes('分层诊断看板')) {
      setCurrentPhase('BOARD');
    } else {
      setCurrentPhase('BACKGROUND');
    }

    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if ((!input.trim() && images.length === 0) || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input, images: [...images] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setImages([]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage([...messages, userMsg], input, userMsg.images);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: '抱歉，我遇到了一点技术问题。请检查你的网络或 API Key 设置。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Progress Tracking */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <Target className="w-5 h-5" />
            <h1 className="font-bold text-lg">分析助手</h1>
          </div>
          <p className="text-xs text-slate-500">试卷分析阶段</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <ProgressItem 
            label="初始化背景" 
            state={currentPhase === 'BACKGROUND' ? 'active' : 'completed'} 
            icon={<AlertCircle className="w-4 h-4" />} 
          />
          <ProgressItem 
            label="分层诊断看板" 
            state={currentPhase === 'BOARD' ? 'active' : (['GREEN', 'YELLOW', 'RED', 'SUMMARY'].includes(currentPhase) ? 'completed' : 'pending')} 
            icon={<LayoutDashboard className="w-4 h-4" />} 
          />
          <ProgressItem 
            label="🟢 基础区穿透" 
            state={currentPhase === 'GREEN' ? 'active' : (['YELLOW', 'RED', 'SUMMARY'].includes(currentPhase) ? 'completed' : 'pending')} 
            icon={<CheckCircle2 className="w-4 h-4" />} 
          />
          <ProgressItem 
            label="🟡 拔高区分析" 
            state={currentPhase === 'YELLOW' ? 'active' : (['RED', 'SUMMARY'].includes(currentPhase) ? 'completed' : 'pending')} 
            icon={<ChevronRight className="w-4 h-4" />} 
          />
          <ProgressItem 
            label="🔴 挑战区攻坚" 
            state={currentPhase === 'RED' ? 'active' : (['SUMMARY'].includes(currentPhase) ? 'completed' : 'pending')} 
            icon={<ChevronRight className="w-4 h-4" />} 
          />
          <ProgressItem 
            label="诊后能力强化" 
            state={currentPhase === 'SUMMARY' ? 'active' : 'pending'} 
            icon={<History className="w-4 h-4" />} 
          />
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <h3 className="text-sm font-semibold mb-1">教练寄语</h3>
            <p className="text-xs text-slate-500 leading-relaxed">先定位，再纠错；学逻辑，不仅是答案。</p>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">试卷定位分析助理</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">思维分析中</span>
              </div>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scroll-smooth"
        >
          {messages.map((m, idx) => (
            <MessageBubble key={idx} message={m} />
          ))}
          {isLoading && (
            <div className="flex gap-4 max-w-3xl">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 text-slate-500 text-sm animate-pulse">
                正在深度扫描题目逻辑，请稍候...
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <footer className="p-6 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto space-y-4">
            {images.length > 0 && (
              <div className="flex gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 overflow-x-auto">
                {images.map((img, i) => (
                  <div key={i} className="relative group shrink-0">
                    <img src={img} className="w-20 h-20 object-cover rounded shadow-sm border border-white" alt="upload" />
                    <button 
                      onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <AlertCircle className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-3">
              <div className="flex-1 relative bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="在此输入考试信息、题号或回复指令（如 '1'）..."
                  className="w-full bg-transparent p-4 min-h-[56px] max-h-[200px] resize-none focus:outline-none text-slate-700"
                />
                <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 bg-white rounded-b-2xl">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    发试卷拍照
                  </button>
                  <span className="text-[10px] text-slate-400">Shift + Enter 换行 / Enter 发送</span>
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && images.length === 0)}
                className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
            />
          </div>
        </footer>
      </main>
    </div>
  );
}

function ProgressItem({ label, state, icon }: { label: string, state: 'active' | 'completed' | 'pending', icon: React.ReactNode }) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl transition-all border border-transparent",
      state === 'active' ? "bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm" : 
      state === 'completed' ? "text-slate-400" : "text-slate-500 opacity-60"
    )}>
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        state === 'active' ? "bg-white text-indigo-600 shadow-inner" : 
        state === 'completed' ? "bg-emerald-50 text-emerald-500" : "bg-slate-100 text-slate-400"
      )}>
        {state === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isBot = message.role === 'model';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-4 max-w-4xl",
        !isBot && "flex-row-reverse ml-auto"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
        isBot ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
      )}>
        {isBot ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
      </div>
      
      <div className="flex flex-col gap-2 max-w-[85%]">
        <div className={cn(
          "rounded-2xl px-5 py-4 shadow-sm",
          isBot ? "bg-white border border-slate-100 text-slate-800" : "bg-indigo-600 text-white"
        )}>
          {message.images && message.images.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {message.images.map((img, i) => (
                <img key={i} src={img} className="max-w-xs h-auto rounded-lg shadow-md border-4 border-white" alt="exam" />
              ))}
            </div>
          )}
          <div className="markdown-body prose max-w-none prose-slate prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:text-white">
            <ReactMarkdown 
              remarkPlugins={[remarkMath]} 
              rehypePlugins={[rehypeKatex]}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        </div>
        <span className={cn(
          "text-[10px] text-slate-400 tracking-wider font-medium uppercase px-2",
          !isBot && "text-right"
        )}>
          {isBot ? "AI Coach Analysis" : "Student Statement"}
        </span>
      </div>
    </motion.div>
  );
}
