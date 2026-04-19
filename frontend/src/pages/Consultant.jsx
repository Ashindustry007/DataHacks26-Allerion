import React, { useState, useRef, useEffect } from 'react';
import { classifyPhoto, fileToBase64, consultantQuery } from '../api/client';

// ── Icons (Raw SVGs) ────────────────────────────────────────────────────────
const LeafIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
);

const ImageIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <circle cx="9" cy="9" r="2"/>
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
  </svg>
);

const SendIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/>
    <path d="M22 2 11 13"/>
  </svg>
);

const BotIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="10" x="3" y="11" rx="2"/>
    <circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/>
    <line x1="8" x2="8" y1="16" y2="16"/>
    <line x1="16" x2="16" y1="16" y2="16"/>
  </svg>
);

const UserIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

const SD_DEFAULT = [32.71, -117.16];

const Consultant = () => {
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [userPos, setUserPos] = useState(SD_DEFAULT);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Welcome to your personal AI Allergy Consultant. Upload a plant photo for instant species and pollen threat analysis, or ask me about current pollen conditions in your area."
    }
  ]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        () => {},
      );
    }
  }, []);

  const glassPanel = "bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]";

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMsg = { id: Date.now(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const query = input;
    setInput('');
    setSending(true);

    try {
      const reply = await consultantQuery(query, userPos[0], userPos[1]);
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: `Could not fetch pollen data: ${err.message}. Please check that the backend is running.`,
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const imageUrl = URL.createObjectURL(file);

    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', imageUrl }]);
    setSending(true);

    try {
      const base64 = await fileToBase64(file);
      const result = await classifyPhoto(base64, userPos[0], userPos[1]);
      const lines = [
        `**${result.species_name}** — ${Math.round(result.confidence * 100)}% confidence`,
        result.is_allergen ? '⚠ This is a known allergen.' : '✓ Not a tracked allergen.',
        `Stage: ${result.phenology_stage}${result.pollen_releasing ? ' — actively releasing pollen.' : '.'}`,
        '',
        result.explanation,
        '',
        `**Action:** ${result.action}`,
      ];
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: lines.join('\n') }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: `Image analysis failed: ${err.message}. Try a clearer photo of the plant.`,
      }]);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-teal-500/30 overflow-hidden flex flex-col relative">
      
      {/* ── Background Atmos ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-orange-900/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] mix-blend-screen opacity-20"/>
      </div>

      {/* ── Chat Container ───────────────────────────────────────────────── */}
      <div className="relative z-10 flex-grow flex flex-col max-w-4xl mx-auto w-full px-4 md:px-6 pb-4 md:pb-6 pt-24 md:pt-28 overflow-hidden">
        
        {/* Messages Feed */}
        <div className="flex-grow overflow-y-auto pr-4 space-y-6 scrollbar-thin scrollbar-thumb-teal-500/30 scrollbar-track-transparent pb-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              <div className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className="shrink-0 mt-1">
                  {msg.sender === 'user' ? (
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(251,146,60,0.3)]">
                      <BotIcon className="w-4 h-4 text-orange-400" />
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`p-4 rounded-2xl ${
                  msg.sender === 'user' 
                    ? 'bg-slate-800/80 border border-slate-700 text-slate-200 rounded-tr-none' 
                    : 'bg-slate-900/60 border border-orange-500/20 text-slate-300 rounded-tl-none shadow-[0_0_20px_rgba(0,0,0,0.3)] backdrop-blur-md'
                }`}>
                  {msg.text && (
                    <p className="text-sm leading-relaxed font-light whitespace-pre-wrap">{msg.text}</p>
                  )}
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Uploaded threat" className="max-w-full h-auto rounded-lg border border-slate-700 mt-2 max-h-64 object-cover" />
                  )}
                </div>
              </div>

            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input Widget ────────────────────────────────────────────────── */}
        <div className="mt-4 shrink-0">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex items-center gap-2 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-xl bg-slate-800/50 text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 transition-colors border border-transparent hover:border-teal-500/30"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <input 
              type="text" 
              placeholder="Ask for travel advisories or upload a plant photo..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-grow bg-transparent text-slate-200 text-sm px-4 py-3 focus:outline-none placeholder-slate-500 font-light"
            />

            <button 
              onClick={handleSend}
              disabled={sending}
              className="p-3 rounded-xl bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white transition-all shadow-[0_0_15px_rgba(251,146,60,0.2)] hover:shadow-[0_0_25px_rgba(251,146,60,0.5)] border border-orange-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending
                ? <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                : <SendIcon className="w-5 h-5" />
              }
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-600 mt-3 font-mono">
            AI inferences are based on local H3 resolution and your clinical prick-test data.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Consultant;
