import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LZString from 'lz-string';
import { Typewriter } from './components/Typewriter';
import { runDiagnosis, DiagnosisResult } from './services/diagnosisService';

type Screen = 'INTRO' | 'DECISION' | 'TIME' | 'WAITING' | 'PROCESSING' | 'DIAGNOSIS' | 'POST_PERMISSION' | 'SENSITIVE' | 'ALREADY_GRANTED' | 'SHARE_FRIEND' | 'VIEW_SHARED';

interface SessionData {
  decision: string;
  timeRuminating: string;
  waitingFor: string;
  diagnosis: string;
  timestamp: string;
  id?: string;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('INTRO');
  const [decision, setDecision] = useState('');
  const [timeRuminating, setTimeRuminating] = useState('');
  const [waitingFor, setWaitingFor] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [sharedFromFriend, setSharedFromFriend] = useState(false);
  const [shareFriendDesc, setShareFriendDesc] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [viewOnlyData, setViewOnlyData] = useState<SessionData | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState(false);

  const sessionId = useMemo(() => Math.random().toString(16).substring(2, 8).toUpperCase(), []);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check for shared link
    const params = new URLSearchParams(window.location.search);
    
    // Check for shared diagnosis (View Only)
    if (params.has('p')) {
      try {
        const compressed = params.get('p') || '';
        const json = LZString.decompressFromEncodedURIComponent(compressed);
        if (json) {
          setViewOnlyData(JSON.parse(json));
          setScreen('VIEW_SHARED');
          return;
        }
      } catch (e) {
        console.error("Failed to parse shared permission", e);
      }
    }

    if (params.has('ref')) {
      setSharedFromFriend(true);
    }

    // Check for previous session
    const savedSession = localStorage.getItem('permission_granted_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession) as SessionData;
      setDecision(parsed.decision);
      setDiagnosis(parsed.diagnosis);
      setTimeRuminating(parsed.timestamp);
      setScreen('ALREADY_GRANTED');
    }
  }, []);

  const isBrazil = Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Sao_Paulo') || 
                   navigator.language.startsWith('pt');

  const handleDecisionSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (decision.trim()) {
      setScreen('TIME');
    }
  }, [decision]);

  const handleTimeSelect = useCallback((val: string, id: string) => {
    setTimeRuminating(val);
    setScreen('WAITING');
  }, []);

  const handleWaitingSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (waitingFor.trim()) {
      setScreen('PROCESSING');
      startProcessing();
    }
  }, [waitingFor, decision, timeRuminating]);

  async function startProcessing() {
    const messages = [
      "ACESSANDO DECISÕES PENDENTES...",
      `DETECTADO: 1 DECISÃO ADIADA DESDE ${timeRuminating.toUpperCase()}...`,
      "ANALISANDO DESABAFOS COM AMIGOS, IA, TERAPEUTAS...",
      "RESULTADO: NENHUMA CONCLUSÃO NOVA...",
      "CALCULANDO TEMPO DESPERDIÇADO...",
      "DIAGNÓSTICO: VOCÊ JÁ SABE A RESPOSTA...",
      "CONSULTANDO SUA VERSÃO FUTURA...",
      "VERSÃO FUTURA IMPACIENTE...",
      "EMITINDO PERMISSÃO OFICIAL..."
    ];

    const startTime = Date.now();
    const duration = messages.length * 2300; // 2.3 seconds per message (15% increase)

    // Iniciar o motor de diagnóstico local
    const analysisPromise = runDiagnosis(decision, timeRuminating, waitingFor);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);
      
      const messageIndex = Math.min(Math.floor((p / 100) * messages.length), messages.length - 1);
      setLoadingMessage(messages[messageIndex]);

      if (p >= 100) {
        clearInterval(interval);
        analysisPromise.then((result) => {
          if (!result || result.isSensitive) {
            setScreen('SENSITIVE');
          } else {
            const finalResult = result.diagnosis || "ERRO CRÍTICO: DIAGNÓSTICO INDISPONÍVEL.";
            setDiagnosis(finalResult);
            const session: SessionData = {
              decision,
              timeRuminating,
              waitingFor,
              diagnosis: finalResult,
              timestamp: new Date().toLocaleString('pt-BR'),
              id: sessionId
            };
            localStorage.setItem('permission_granted_session', JSON.stringify(session));
            setScreen('DIAGNOSIS');
          }
        }).catch(() => {
          setDiagnosis("ERRO DE PROCESSAMENTO LOCAL. TENTE NOVAMENTE.");
          setScreen('DIAGNOSIS');
        });
      }
    }, 50);
  }

  const renderProgressBar = () => {
    return (
      <div className="font-mono text-sm">
        <div className="flex justify-between mb-1 opacity-60">
          <span>TASK_PROGRESS_METER</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="border border-[#00ff41] p-[2px] bg-black">
          <div 
            className="h-4 bg-[#00ff41]" 
            style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
          />
        </div>
        <div className="mt-8 text-center min-h-[3rem] flex items-center justify-center">
          <p className="text-lg"><span className="animate-pulse">_</span> {loadingMessage}</p>
        </div>
      </div>
    );
  };

  const generateShareLink = useCallback(() => {
    const obfuscated = btoa(encodeURIComponent(shareFriendDesc)).replace(/=/g, '');
    const url = `${window.location.origin}${window.location.pathname}?ref=${obfuscated}`;
    setShareUrl(url);
  }, [shareFriendDesc]);

  const generateResultShareLink = useCallback(() => {
    const data: SessionData = {
      decision,
      diagnosis,
      timeRuminating,
      waitingFor: '',
      timestamp: new Date().toLocaleDateString('pt-BR'),
      id: sessionId
    };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(data));
    const url = `${window.location.origin}${window.location.pathname}?p=${compressed}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(`Eu tomei uma decisão e recebi permissão definitiva do sistema.\n${url}`);
    alert('Link de compartilhamento copiado!');
  }, [decision, diagnosis, timeRuminating, sessionId]);

  const onIntroComplete = useCallback(() => {
    setTimeout(() => setScreen('DECISION'), 1500);
  }, []);

  const onDiagnosisComplete = useCallback(() => {
    setTimeout(() => setScreen('POST_PERMISSION'), 5000);
  }, []);

  const handleReset = useCallback(() => {
    // Apenas recarrega a página. Se houver sessão, o useEffect inicial bloqueará o acesso.
    const cleanUrl = window.location.origin + window.location.pathname;
    window.location.replace(cleanUrl);
  }, []);

  const handleAdminReset = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === '1122') {
      localStorage.removeItem('permission_granted_session');
      const cleanUrl = window.location.origin + window.location.pathname;
      window.location.replace(cleanUrl);
    } else {
      setAdminError(true);
      setTimeout(() => setAdminError(false), 2000);
    }
  }, [adminPassword]);

  return (
    <div className="flex flex-col h-screen p-4 sm:p-10 crt-overlay terminal-flicker relative bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <div className="header-term crt-glow shrink-0">
        <span 
          className="cursor-help transition-colors"
          onClick={handleReset}
        >
          SISTEMA DE AUTORIZAÇÃO PESSOAL v1.0 [STATUS: {['DIAGNOSIS', 'POST_PERMISSION', 'VIEW_SHARED'].includes(screen) ? 'FINALIZADO' : 'ATIVO'}]
        </span>
        <span>ID_SESSÃO: {viewOnlyData?.id || sessionId}</span>
      </div>

      {/* Main Container */}
      <div className="container flex-1 max-w-[800px] mx-auto flex flex-col crt-glow w-full overflow-y-auto pb-10 custom-scroll shrink min-h-0">
        <AnimatePresence mode="wait">
          {screen === 'VIEW_SHARED' && viewOnlyData && (
            <motion.div
              key="view_shared"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="p-4 border border-[#00ff41]/30 bg-[#00ff41]/5 mb-8">
                <p className="text-xs opacity-70 mb-2 font-mono">ARQUIVO DE SESSÃO COMPARTILHADO // ORIGEM: EXTERNA</p>
                <p className="text-sm">Esta é uma permissão definitiva emitida para a decisão: <span className="font-bold text-[#00ff41] underline">{viewOnlyData.decision}</span></p>
              </div>

              <div className="diagnostic-section space-y-8 text-[18px] leading-relaxed">
                <div className="content-block">
                  <span className="label opacity-60 text-[12px] mb-2 block uppercase text-[#004411]">Veredito_Final</span>
                  <div className="opacity-90 whitespace-pre-wrap">
                    (viewOnlyData?.diagnosis || '').replace(/VOCÊ TEM PERMISSÃO\. VÁ FAZER\./gi, '').trim()
                  </div>
                </div>
              </div>

              <div className="permission-seal border-2 border-[#00ff41] p-10 bg-[#00ff41]/5 text-center mt-10">
                <span className="text-[40px] font-bold block mb-2 tracking-widest whitespace-nowrap">PERMISSÃO CONCEDIDA.</span>
                <span className="text-[14px] opacity-80 tracking-widest block leading-relaxed max-w-lg mx-auto">ESTE DOCUMENTO SUBSTITUI QUALQUER CONSELHO, OPINIÃO OU SESSÃO DE TERAPIA ANTERIORES.</span>
              </div>

              <div className="pt-12 text-center">
                <button 
                  onClick={() => window.location.assign(window.location.origin + window.location.pathname)}
                  className="border border-[#00ff41] px-6 py-2 hover:bg-[#00ff41] hover:text-black transition-all font-mono text-sm uppercase"
                >
                  ACESSAR O SISTEMA PARA MINHA PRÓPRIA DECISÃO
                </button>
              </div>
            </motion.div>
          )}

          {screen === 'INTRO' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {sharedFromFriend && (
                <Typewriter 
                  text="Alguém que se importa com você te mandou aqui." 
                  speed={40} 
                  delay={1000}
                  className="mb-8 opacity-70"
                />
              )}
              <Typewriter 
                text="SISTEMA DE AUTORIZAÇÃO PESSOAL v1.0 — ACESSO RESTRITO" 
                delay={sharedFromFriend ? 3000 : 2000}
                onComplete={onIntroComplete}
              />
            </motion.div>
          )}

          {screen === 'DECISION' && (
            <motion.div
              key="decision"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <Typewriter text="Qual decisão você está adiando?" onComplete={() => inputRef.current?.focus()} />
              <form onSubmit={handleDecisionSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="bg-transparent border-none outline-none text-[#00ff41] w-full font-mono text-lg caret-emerald-500 uppercase"
                  autoFocus
                />
              </form>
            </motion.div>
          )}

          {screen === 'TIME' && (
            <motion.div
              key="time"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <Typewriter text="Há quanto tempo você está 'pensando' nisso?" />
              <div className="flex flex-col space-y-2 mt-4">
                {[
                  { id: 'A', label: 'Algumas semanas' },
                  { id: 'B', label: 'Alguns meses' },
                  { id: 'C', label: 'Mais de um ano' },
                  { id: 'D', label: 'Honestamente, não lembro mais' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleTimeSelect(opt.label, opt.id)}
                    className="text-left hover:bg-[#00ff41] hover:text-[#0d0208] px-2 py-1 transition-colors cursor-pointer"
                  >
                    [{opt.id}] {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {screen === 'WAITING' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <Typewriter text="O que exatamente você está esperando?" onComplete={() => inputRef.current?.focus()} />
              <form onSubmit={handleWaitingSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  value={waitingFor}
                  onChange={(e) => setWaitingFor(e.target.value)}
                  className="bg-transparent border-none outline-none text-[#00ff41] w-full font-mono text-lg caret-emerald-500 uppercase"
                  autoFocus
                />
              </form>
            </motion.div>
          )}

          {screen === 'PROCESSING' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-md mx-auto"
            >
              {renderProgressBar()}
            </motion.div>
          )}

          {screen === 'DIAGNOSIS' && (
            <motion.div
              key="diagnosis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-10"
            >
              <div className="permission-seal border-2 border-[#00ff41] p-10 bg-[#00ff41]/5 text-center mb-6">
                <span className="text-[40px] font-bold block mb-2 tracking-widest whitespace-nowrap">PERMISSÃO CONCEDIDA.</span>
                <span className="text-[14px] opacity-80 tracking-widest block leading-relaxed max-w-lg mx-auto uppercase">ESTE DOCUMENTO SUBSTITUI QUALQUER CONSELHO, OPINIÃO OU SESSÃO DE TERAPIA ANTERIORES.</span>
              </div>

              <div className="diagnostic-section space-y-8 text-[18px] leading-relaxed">
                <div className="content-block">
                  <span className="label opacity-60 text-[12px] mb-2 block uppercase text-[#004411]">Veredito_Final</span>
                  <div className="opacity-90">
                    <Typewriter 
                      text={(diagnosis || '').replace(/VOCÊ TEM PERMISSÃO\. VÁ FAZER\./gi, '').trim()} 
                      speed={20} 
                      onComplete={onDiagnosisComplete}
                      onUpdate={() => {}} // Hook para futura persistência se necessário
                    />
                  </div>
                </div>
              </div>

              <div className="metadata text-[11px] opacity-50 text-right mt-5 leading-tight">
                EMISSÃO: {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR')} UTC-3<br/>
                AUTORIZAÇÃO DEFINITIVA. SEM POSSIBILIDADE DE RECURSO.<br/>
                SESSÃO BLOQUEADA PARA ESTE TÓPICO.
              </div>
            </motion.div>
          )}

          {screen === 'POST_PERMISSION' && (
            <motion.div
              key="post_permission"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              className="space-y-10"
            >
              <div className="permission-seal border-2 border-[#00ff41] p-10 bg-[#00ff41]/5 text-center mb-6">
                <span className="text-[40px] font-bold block mb-2 tracking-widest uppercase">PERMISSÃO CONCEDIDA.</span>
                <span className="text-[14px] opacity-80 tracking-widest block uppercase leading-relaxed max-w-lg mx-auto">ESTE DOCUMENTO SUBSTITUI QUALQUER CONSELHO, OPINIÃO OU SESSÃO DE TERAPIA ANTERIORES.</span>
              </div>

              <div className="diagnostic-section space-y-8 text-[18px] leading-relaxed">
                <div className="content-block">
                  <span className="label text-[#004411] opacity-60 text-[12px] block uppercase mb-2">Veredito_Final</span>
                  <div className="opacity-90 whitespace-pre-wrap">
                    (diagnosis || '').replace(/VOCÊ TEM PERMISSÃO\. VÁ FAZER\./gi, '').trim()
                  </div>
                </div>
              </div>

              <div className="metadata text-[11px] opacity-50 text-right mt-5 leading-tight">
                EMISSÃO: {new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR')} UTC-3<br/>
                AUTORIZAÇÃO DEFINITIVA. SEM POSSIBILIDADE DE RECURSO.<br/>
                SESSÃO BLOQUEADA PARA ESTE TÓPICO.
              </div>
            </motion.div>
          )}

          {screen === 'SHARE_FRIEND' && (
            <motion.div
              key="share_friend"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <Typewriter text="Descreva em uma frase o que seu amigo está adiando." onComplete={() => inputRef.current?.focus()} />
              <form onSubmit={(e) => { e.preventDefault(); generateShareLink(); }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={shareFriendDesc}
                  onChange={(e) => setShareFriendDesc(e.target.value)}
                  className="bg-transparent border-none outline-none text-[#00ff41] w-full font-mono text-lg caret-emerald-500 uppercase"
                  autoFocus
                />
              </form>
              
              {shareUrl && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="mt-8 space-y-4"
                >
                  <p className="text-sm opacity-70">Achei isso. Talvez seja pra você.</p>
                  <div className="bg-[#00ff41]/10 border border-[#00ff41] p-4 break-all">
                    {shareUrl}
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`Achei isso. Talvez seja pra você.\n${shareUrl}`);
                      alert('Link copiado!');
                    }}
                    className="text-xs border border-[#00ff41] px-2 py-1 hover:bg-[#00ff41] hover:text-[#0d0208] uppercase"
                  >
                    COPIAR MENSAGEM
                  </button>
                  <button 
                    onClick={() => setScreen('POST_PERMISSION')}
                    className="block text-xs opacity-50 hover:opacity-100 uppercase"
                  >
                    VOLTAR
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {screen === 'SENSITIVE' && (
            <motion.div
              key="sensitive"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white space-y-6 max-w-md mx-auto"
            >
              <h1 className="text-xl font-sans font-bold">
                {isBrazil ? "Isso aqui não é o lugar certo pra isso. Mas existe um lugar." : "This isn't the right place for this. But there is a place."}
              </h1>
              <div className="space-y-4">
                <p className="font-sans opacity-80">
                  {isBrazil 
                    ? "Se você está passando por um momento difícil, saiba que existe ajuda disponível. Você não está sozinho."
                    : "If you are going through a difficult time, please know that help is available. You are not alone."}
                </p>
                <a 
                  href={isBrazil ? "https://www.cvv.org.br/" : "https://www.befrienders.org/"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block bg-white text-black px-6 py-3 font-sans font-bold hover:bg-gray-200 transition-colors"
                >
                  {isBrazil ? "Falar agora: CVV - 188" : "Find help locally"}
                </a>
              </div>
            </motion.div>
          )}

          {screen === 'ALREADY_GRANTED' && (
            <motion.div
              key="already_granted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="p-4 border border-red-500 bg-red-500/10 flex flex-col items-center space-y-4">
                <p className="text-red-500 font-bold text-sm uppercase tracking-tighter">SESSÃO BLOQUEADA: PERMISSÃO JÁ EMITIDA</p>
                <p className="text-xs text-center opacity-70">O SISTEMA IDENTIFICOU UM DOCUMENTO ATIVO PARA ESTE DISPOSITIVO.</p>
                <p className="text-3xl font-bold mt-2 tracking-[0.2em] leading-tight text-center">SÓ É PERMITIDO REINICIAR APÓS COMPLETAR A AÇÃO.</p>
                
                <form onSubmit={handleAdminReset} className="w-full max-w-xs space-y-2 mt-4 border-t border-red-500/30 pt-4">
                  <p className="text-[10px] uppercase opacity-50 text-center">Reiniciação forçada (Admin)</p>
                  <div className="relative">
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="SENHA DE ACESSO"
                      className={`w-full bg-black border ${adminError ? 'border-red-500 animate-shake' : 'border-red-500/50'} p-2 text-center text-red-500 placeholder:text-red-500/20 focus:outline-none focus:border-red-500 text-xs font-mono`}
                    />
                    {adminError && (
                      <p className="text-[10px] text-red-600 text-center font-bold mt-1">ACESSO NEGADO: CÓDIGO INCORRETO</p>
                    )}
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-red-600 text-white px-4 py-2 hover:bg-white hover:text-black transition-all font-mono font-bold uppercase cursor-pointer text-xs border border-red-500"
                  >
                    EXECUTAR RESET
                  </button>
                </form>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#00ff41]/20">
                <p className="opacity-70">DIAGNÓSTICO ENCONTRADO — {timeRuminating}</p>
                <p>Você já tem sua permissão para: <span className="text-[#00ff41] underline">{decision}</span></p>
              </div>
              
              <div className="mt-8 p-6 border-l-2 border-[#00ff41] bg-[#00ff41]/5 opacity-60">
                <span className="label text-[#004411] mb-2 block uppercase">ARQUIVO_HISTÓRICO</span>
                <div className="whitespace-pre-wrap text-sm">{(diagnosis || '').replace(/VOCÊ TEM PERMISSÃO\. VÁ FAZER\./gi, '').trim()}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {(screen === 'POST_PERMISSION' || screen === 'DIAGNOSIS' || screen === 'ALREADY_GRANTED' || screen === 'SHARE_FRIEND') && (
        <div className="footer-term crt-glow items-center border-t border-[#00ff41]/20 pt-4 mt-6">
          <button 
            onClick={handleReset}
            className="text-[10px] text-red-500/50 hover:text-red-500 transition-colors mr-8 uppercase font-bold whitespace-nowrap"
          >
            [ REINICIAR ]
          </button>
          
          <div className="flex-1 flex justify-around sm:justify-between items-center gap-2">
            <button 
              onClick={() => setScreen('SHARE_FRIEND')}
              className="footer-option transition-all px-2 text-[10px] sm:text-xs"
            >
              [ ENVIAR PARA AMIGO ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
