import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LZString from 'lz-string';
import { Typewriter } from './components/Typewriter';
import { runDiagnosis, DiagnosisResult } from './services/diagnosisService';
import { translations, type Language } from './i18n/translations';

type Screen =
  | 'INTRO' | 'DECISION' | 'TIME' | 'WAITING' | 'PROCESSING'
  | 'DIAGNOSIS' | 'POST_PERMISSION' | 'SENSITIVE' | 'ALREADY_GRANTED'
  | 'SHARE_FRIEND' | 'VIEW_SHARED' | 'ABOUT';

interface SessionData {
  decision: string;
  timeRuminating: string;
  waitingFor: string;
  diagnosis: string;
  timestamp: string;
  id?: string;
  lang?: Language;
}

function detectLanguage(): Language {
  const stored = localStorage.getItem('pg_lang') as Language | null;
  if (stored === 'pt' || stored === 'en') return stored;
  if (navigator.language.startsWith('pt')) return 'pt';
  return 'en';
}

const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

export default function App() {
  const [screen, setScreen] = useState<Screen>('INTRO');
  const [previousScreen, setPreviousScreen] = useState<Screen>('POST_PERMISSION');
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
  const [lang, setLang] = useState<Language>(detectLanguage);
  const [resultShareCopied, setResultShareCopied] = useState(false);
  const [friendLinkCopied, setFriendLinkCopied] = useState(false);

  const sessionId = useMemo(() => Math.random().toString(16).substring(2, 8).toUpperCase(), []);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  const isBrazil = useMemo(
    () =>
      Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Sao_Paulo') ||
      navigator.language.startsWith('pt'),
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.has('p')) {
      try {
        const compressed = params.get('p') || '';
        const json = LZString.decompressFromEncodedURIComponent(compressed);
        if (json) {
          const parsed = JSON.parse(json) as SessionData;
          setViewOnlyData(parsed);
          if (parsed.lang) setLang(parsed.lang);
          setScreen('VIEW_SHARED');
          return;
        }
      } catch (e) {
        console.error('Failed to parse shared permission', e);
      }
    }

    if (params.has('ref')) {
      setSharedFromFriend(true);
    }

    const savedSession = localStorage.getItem('permission_granted_session');
    if (savedSession) {
      const parsed = JSON.parse(savedSession) as SessionData;
      setDecision(parsed.decision);
      setDiagnosis(parsed.diagnosis);
      setTimeRuminating(parsed.timestamp);
      if (parsed.lang) setLang(parsed.lang);
      setScreen('ALREADY_GRANTED');
    }
  }, []);

  const switchLang = useCallback((newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('pg_lang', newLang);
  }, []);

  const handleDecisionSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (decision.trim()) setScreen('TIME');
    },
    [decision]
  );

  const handleTimeSelect = useCallback((val: string) => {
    setTimeRuminating(val);
    setScreen('WAITING');
  }, []);

  const handleWaitingSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (waitingFor.trim()) {
        setScreen('PROCESSING');
        startProcessing();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [waitingFor, decision, timeRuminating, lang]
  );

  async function startProcessing() {
    const rawMessages = t.processing.messages;
    const messages = rawMessages.map((m) =>
      m.replace('{time}', timeRuminating.toUpperCase())
    );

    const startTime = Date.now();
    const duration = messages.length * 2300;

    const analysisPromise = runDiagnosis(decision, timeRuminating, waitingFor, lang);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);

      const messageIndex = Math.min(
        Math.floor((p / 100) * messages.length),
        messages.length - 1
      );
      setLoadingMessage(messages[messageIndex]);

      if (p >= 100) {
        clearInterval(interval);
        analysisPromise
          .then((result: DiagnosisResult) => {
            if (!result || result.isSensitive) {
              setScreen('SENSITIVE');
            } else {
              const finalResult = result.diagnosis || t.errors.diagnosisUnavailable;
              setDiagnosis(finalResult);
              const session: SessionData = {
                decision,
                timeRuminating,
                waitingFor,
                diagnosis: finalResult,
                timestamp: new Date().toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US'),
                id: sessionId,
                lang,
              };
              localStorage.setItem('permission_granted_session', JSON.stringify(session));
              setScreen('DIAGNOSIS');
            }
          })
          .catch(() => {
            setDiagnosis(t.errors.processingError);
            setScreen('DIAGNOSIS');
          });
      }
    }, 50);
  }

  const diagnosisBody = useCallback(
    (text: string) => {
      const permissionStamps = [
        'VOCÊ TEM PERMISSÃO. É HORA DE AGIR.',
        "YOU HAVE PERMISSION. IT'S TIME TO ACT.",
      ];
      let result = text;
      for (const stamp of permissionStamps) {
        result = result.replace(stamp, '').trim();
      }
      return result;
    },
    []
  );

  const renderProgressBar = () => (
    <div className="font-mono text-sm w-full">
      <div className="flex justify-between mb-1 opacity-60">
        <span>{t.progressBar.label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="border border-[#00ff41] p-[2px] bg-black">
        <div
          className="h-4 bg-[#00ff41]"
          style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
        />
      </div>
      <div className="mt-8 text-center min-h-[3rem] flex items-center justify-center">
        <p className="text-base sm:text-lg">
          <span className="animate-pulse">_</span> {loadingMessage}
        </p>
      </div>
    </div>
  );

  const generateShareLink = useCallback(() => {
    if (!shareFriendDesc.trim()) return;
    const obfuscated = btoa(encodeURIComponent(shareFriendDesc)).replace(/=/g, '');
    const url = `${window.location.origin}${window.location.pathname}?ref=${obfuscated}`;
    setShareUrl(url);
  }, [shareFriendDesc]);

  const handleShareFriendSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      generateShareLink();
    },
    [generateShareLink]
  );

  const copyFriendLink = useCallback(() => {
    const msg = `${t.shareFriend.shareIntro}\n${shareUrl}`;
    navigator.clipboard.writeText(msg).then(() => {
      setFriendLinkCopied(true);
      setTimeout(() => setFriendLinkCopied(false), 2500);
    });
  }, [shareUrl, t.shareFriend.shareIntro]);

  const generateResultShareLink = useCallback(() => {
    const data: SessionData = {
      decision,
      diagnosis,
      timeRuminating,
      waitingFor: '',
      timestamp: new Date().toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US'),
      id: sessionId,
      lang,
    };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(data));
    const url = `${window.location.origin}${window.location.pathname}?p=${compressed}`;
    const msg = `${t.postPermission.shareMessage}\n${url}`;
    navigator.clipboard.writeText(msg).then(() => {
      setResultShareCopied(true);
      setTimeout(() => setResultShareCopied(false), 2500);
    });
  }, [decision, diagnosis, timeRuminating, sessionId, lang, t.postPermission.shareMessage]);

  const onIntroComplete = useCallback(() => {
    setTimeout(() => setScreen('DECISION'), 1500);
  }, []);

  const onDiagnosisComplete = useCallback(() => {
    setTimeout(() => setScreen('POST_PERMISSION'), 5000);
  }, []);

  const handleReset = useCallback(() => {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.location.replace(cleanUrl);
  }, []);

  const handleAdminReset = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (adminPassword === '1122') {
        localStorage.removeItem('permission_granted_session');
        const cleanUrl = window.location.origin + window.location.pathname;
        window.location.replace(cleanUrl);
      } else {
        setAdminError(true);
        setTimeout(() => setAdminError(false), 2000);
      }
    },
    [adminPassword]
  );

  const goToAbout = useCallback(() => {
    setPreviousScreen(screen);
    setScreen('ABOUT');
  }, [screen]);

  const statusDone = ['DIAGNOSIS', 'POST_PERMISSION', 'VIEW_SHARED'].includes(screen);
  const showFullFooter = ['POST_PERMISSION', 'DIAGNOSIS', 'ALREADY_GRANTED', 'SHARE_FRIEND'].includes(screen);
  const showMinimalFooter = ['DECISION', 'TIME', 'WAITING'].includes(screen);

  return (
    <div className="flex flex-col h-screen p-4 sm:p-10 crt-overlay terminal-flicker relative bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <div className="header-term crt-glow shrink-0">
        <span className="cursor-help transition-colors truncate mr-2" onClick={handleReset}>
          {t.header.title} [{statusDone ? t.header.statusDone : t.header.statusActive}]
        </span>
        <div className="flex items-center gap-3 shrink-0">
          {/* Language switcher */}
          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => switchLang('pt')}
              className={`px-1 transition-colors ${lang === 'pt' ? 'text-[#00ff41] font-bold' : 'opacity-40 hover:opacity-70'}`}
            >
              PT
            </button>
            <span className="opacity-30">|</span>
            <button
              onClick={() => switchLang('en')}
              className={`px-1 transition-colors ${lang === 'en' ? 'text-[#00ff41] font-bold' : 'opacity-40 hover:opacity-70'}`}
            >
              EN
            </button>
          </div>
          <span className="hidden sm:inline opacity-60">
            {t.header.sessionId}: {viewOnlyData?.id || sessionId}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="container flex-1 max-w-[800px] mx-auto flex flex-col crt-glow w-full overflow-y-auto pb-10 custom-scroll shrink min-h-0">
        <AnimatePresence mode="wait">

          {/* VIEW_SHARED */}
          {screen === 'VIEW_SHARED' && viewOnlyData && (
            <motion.div key="view_shared" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="p-4 border border-[#00ff41]/30 bg-[#00ff41]/5 mb-8">
                <p className="text-xs opacity-70 mb-2 font-mono">{t.viewShared.fileLabel}</p>
                <p className="text-sm">
                  {t.viewShared.permissionFor}{' '}
                  <span className="font-bold text-[#00ff41] underline">{viewOnlyData.decision}</span>
                </p>
              </div>

              <div className="diagnostic-section space-y-8 text-base sm:text-[18px] leading-relaxed">
                <div className="content-block">
                  <span className="label opacity-60 text-[12px] mb-2 block uppercase text-[#004411]">
                    {t.diagnosis.verdictLabel}
                  </span>
                  <div className="opacity-90 whitespace-pre-wrap">
                    {diagnosisBody(viewOnlyData?.diagnosis || '')}
                  </div>
                </div>
              </div>

              <div className="permission-seal border-2 border-[#00ff41] bg-[#00ff41]/5 text-center mt-10">
                <span className="text-2xl sm:text-[40px] font-bold block mb-2 tracking-widest">
                  {t.diagnosis.sealTitle}
                </span>
                <span className="text-[13px] sm:text-[14px] opacity-80 tracking-widest block leading-relaxed max-w-lg mx-auto">
                  {t.diagnosis.sealSubtitle}
                </span>
              </div>

              <div className="pt-12 text-center">
                <button
                  onClick={() => window.location.assign(window.location.origin + window.location.pathname)}
                  className="border border-[#00ff41] px-6 py-2 hover:bg-[#00ff41] hover:text-black transition-all font-mono text-sm uppercase"
                >
                  {t.viewShared.ctaButton}
                </button>
              </div>
            </motion.div>
          )}

          {/* INTRO */}
          {screen === 'INTRO' && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {sharedFromFriend && (
                <Typewriter
                  text={t.intro.sharedFromFriend}
                  speed={40}
                  delay={1000}
                  className="mb-8 opacity-70"
                />
              )}
              <Typewriter
                text={t.intro.title}
                delay={sharedFromFriend ? 3000 : 2000}
                onComplete={onIntroComplete}
              />
            </motion.div>
          )}

          {/* DECISION */}
          {screen === 'DECISION' && (
            <motion.div key="decision" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Typewriter
                text={t.decision.question}
                onComplete={() => !isMobile && inputRef.current?.focus()}
              />
              <form onSubmit={handleDecisionSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="bg-transparent border-none outline-none text-[#00ff41] w-full font-mono text-lg caret-emerald-500 uppercase"
                  autoFocus={!isMobile}
                  enterKeyHint="done"
                />
              </form>
            </motion.div>
          )}

          {/* TIME */}
          {screen === 'TIME' && (
            <motion.div key="time" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <Typewriter text={t.time.question} />
              <div className="flex flex-col space-y-2 mt-4">
                {t.time.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleTimeSelect(opt.label)}
                    className="text-left hover:bg-[#00ff41] hover:text-[#0d0208] px-2 py-1 transition-colors cursor-pointer"
                  >
                    [{opt.id}] {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* WAITING */}
          {screen === 'WAITING' && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Typewriter
                text={t.waiting.question}
                onComplete={() => !isMobile && inputRef.current?.focus()}
              />
              <form onSubmit={handleWaitingSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  value={waitingFor}
                  onChange={(e) => setWaitingFor(e.target.value)}
                  className="bg-transparent border-none outline-none text-[#00ff41] w-full font-mono text-lg caret-emerald-500 uppercase"
                  autoFocus={!isMobile}
                  enterKeyHint="done"
                />
              </form>
            </motion.div>
          )}

          {/* PROCESSING */}
          {screen === 'PROCESSING' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto">
              {renderProgressBar()}
            </motion.div>
          )}

          {/* DIAGNOSIS */}
          {screen === 'DIAGNOSIS' && (
            <motion.div key="diagnosis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="permission-seal border-2 border-[#00ff41] bg-[#00ff41]/5 text-center mb-6">
                <span className="text-2xl sm:text-[40px] font-bold block mb-2 tracking-widest">
                  {t.diagnosis.sealTitle}
                </span>
                <span className="text-[13px] sm:text-[14px] opacity-80 tracking-widest block leading-relaxed max-w-lg mx-auto uppercase">
                  {t.diagnosis.sealSubtitle}
                </span>
              </div>

              <div className="diagnostic-section space-y-8 text-base sm:text-[18px] leading-relaxed">
                <div className="content-block">
                  <span className="label opacity-60 text-[12px] mb-2 block uppercase text-[#004411]">
                    {t.diagnosis.verdictLabel}
                  </span>
                  <div className="opacity-90">
                    <Typewriter
                      text={diagnosisBody(diagnosis)}
                      speed={20}
                      onComplete={onDiagnosisComplete}
                    />
                  </div>
                </div>
              </div>

              <div className="metadata text-[11px] opacity-50 text-right mt-5 leading-tight">
                {t.diagnosis.emissionLabel}: {new Date().toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US')} —{' '}
                {new Date().toLocaleTimeString(lang === 'pt' ? 'pt-BR' : 'en-US')}<br />
                {t.diagnosis.noAppeal}<br />
                {t.diagnosis.sessionLocked}
              </div>
            </motion.div>
          )}

          {/* POST_PERMISSION */}
          {screen === 'POST_PERMISSION' && (
            <motion.div key="post_permission" initial={{ opacity: 1 }} animate={{ opacity: 1 }} className="space-y-10">
              <div className="permission-seal border-2 border-[#00ff41] bg-[#00ff41]/5 text-center mb-6">
                <span className="text-2xl sm:text-[40px] font-bold block mb-2 tracking-widest uppercase">
                  {t.diagnosis.sealTitle}
                </span>
                <span className="text-[13px] sm:text-[14px] opacity-80 tracking-widest block uppercase leading-relaxed max-w-lg mx-auto">
                  {t.diagnosis.sealSubtitle}
                </span>
              </div>

              <div className="diagnostic-section space-y-8 text-base sm:text-[18px] leading-relaxed">
                <div className="content-block">
                  <span className="label text-[#004411] opacity-60 text-[12px] block uppercase mb-2">
                    {t.diagnosis.verdictLabel}
                  </span>
                  <div className="opacity-90 whitespace-pre-wrap">
                    {diagnosisBody(diagnosis)}
                  </div>
                </div>
              </div>

              <div className="metadata text-[11px] opacity-50 text-right mt-5 leading-tight">
                {t.diagnosis.emissionLabel}: {new Date().toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US')} —{' '}
                {new Date().toLocaleTimeString(lang === 'pt' ? 'pt-BR' : 'en-US')}<br />
                {t.diagnosis.noAppeal}<br />
                {t.diagnosis.sessionLocked}
              </div>
            </motion.div>
          )}

          {/* SHARE_FRIEND */}
          {screen === 'SHARE_FRIEND' && (
            <motion.div key="share_friend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Typewriter
                text={t.shareFriend.question}
                onComplete={() => !isMobile && inputRef.current?.focus()}
              />
              <form onSubmit={handleShareFriendSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  value={shareFriendDesc}
                  onChange={(e) => setShareFriendDesc(e.target.value)}
                  className="bg-transparent border-none outline-none text-[#00ff41] w-full font-mono text-lg caret-emerald-500 uppercase"
                  autoFocus={!isMobile}
                  enterKeyHint="send"
                />
                {!shareUrl && (
                  <button
                    type="submit"
                    className="mt-4 border border-[#00ff41] px-4 py-1 text-xs hover:bg-[#00ff41] hover:text-black transition-all uppercase"
                  >
                    {lang === 'pt' ? 'GERAR LINK' : 'GENERATE LINK'}
                  </button>
                )}
              </form>

              {shareUrl && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 space-y-4">
                  <p className="text-sm opacity-70">{t.shareFriend.shareIntro}</p>
                  <div className="bg-[#00ff41]/10 border border-[#00ff41] p-4 break-all text-sm">
                    {shareUrl}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      onClick={copyFriendLink}
                      className="text-xs border border-[#00ff41] px-3 py-1 hover:bg-[#00ff41] hover:text-[#0d0208] uppercase transition-all"
                    >
                      {friendLinkCopied ? '✓ ' + t.shareFriend.linkCopied : t.shareFriend.copyButton}
                    </button>
                    <button
                      onClick={() => setScreen(previousScreen)}
                      className="text-xs opacity-50 hover:opacity-100 uppercase"
                    >
                      {t.shareFriend.back}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* SENSITIVE */}
          {screen === 'SENSITIVE' && (
            <motion.div key="sensitive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white space-y-6 max-w-md mx-auto">
              <h1 className="text-xl font-sans font-bold">{t.sensitive.title}</h1>
              <div className="space-y-4">
                <p className="font-sans opacity-80">{t.sensitive.body}</p>
                <a
                  href={isBrazil ? 'https://www.cvv.org.br/' : 'https://www.befrienders.org/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-white text-black px-6 py-3 font-sans font-bold hover:bg-gray-200 transition-colors"
                >
                  {isBrazil ? t.sensitive.ctaBrazil : t.sensitive.ctaIntl}
                </a>
              </div>
            </motion.div>
          )}

          {/* ALREADY_GRANTED */}
          {screen === 'ALREADY_GRANTED' && (
            <motion.div key="already_granted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="p-4 border border-red-500 bg-red-500/10 flex flex-col items-center space-y-4">
                <p className="text-red-500 font-bold text-sm uppercase tracking-tighter text-center">
                  {t.alreadyGranted.blockedTitle}
                </p>
                <p className="text-xs text-center opacity-70">{t.alreadyGranted.blockedSubtitle}</p>
                <p className="text-2xl sm:text-3xl font-bold mt-2 tracking-[0.2em] leading-tight text-center">
                  {t.alreadyGranted.blockedBody}
                </p>

                <form onSubmit={handleAdminReset} className="w-full max-w-xs space-y-2 mt-4 border-t border-red-500/30 pt-4">
                  <p className="text-[10px] uppercase opacity-50 text-center">{t.alreadyGranted.adminLabel}</p>
                  <div className="relative">
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder={t.alreadyGranted.adminPlaceholder}
                      className={`w-full bg-black border ${adminError ? 'border-red-500 animate-shake' : 'border-red-500/50'} p-2 text-center text-red-500 placeholder:text-red-500/20 focus:outline-none focus:border-red-500 text-xs font-mono`}
                    />
                    {adminError && (
                      <p className="text-[10px] text-red-600 text-center font-bold mt-1">
                        {t.alreadyGranted.adminError}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-red-600 text-white px-4 py-2 hover:bg-white hover:text-black transition-all font-mono font-bold uppercase cursor-pointer text-xs border border-red-500"
                  >
                    {t.alreadyGranted.adminButton}
                  </button>
                </form>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#00ff41]/20">
                <p className="opacity-70">
                  {t.alreadyGranted.diagnosisFound} {timeRuminating}
                </p>
                <p>
                  {t.alreadyGranted.youHavePermission}{' '}
                  <span className="text-[#00ff41] underline">{decision}</span>
                </p>
              </div>

              <div className="mt-8 p-6 border-l-2 border-[#00ff41] bg-[#00ff41]/5 opacity-60">
                <span className="label text-[#004411] mb-2 block uppercase">
                  {t.alreadyGranted.archiveLabel}
                </span>
                <div className="whitespace-pre-wrap text-sm">{diagnosisBody(diagnosis)}</div>
              </div>
            </motion.div>
          )}

          {/* ABOUT */}
          {screen === 'ABOUT' && (
            <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-lg">
              <div>
                <span className="label opacity-60 text-[12px] mb-4 block uppercase text-[#004411]">
                  {t.about.title}
                </span>
                <div className="space-y-3 text-base sm:text-lg leading-relaxed opacity-90">
                  {t.about.lines.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#00ff41]/20 pt-6 space-y-2">
                <p className="text-xs opacity-50 uppercase">{t.about.builtBy}</p>
                <p className="text-base font-bold">{t.about.author}</p>
                <p className="text-sm opacity-60">{t.about.role}</p>
                <a
                  href="https://www.linkedin.com/in/henrique-werlich"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 border border-[#00ff41] px-4 py-1 text-xs hover:bg-[#00ff41] hover:text-black transition-all uppercase"
                >
                  {t.about.portfolioLabel}
                </a>
              </div>

              <button
                onClick={() => setScreen(previousScreen)}
                className="text-xs opacity-50 hover:opacity-100 uppercase block"
              >
                {t.about.back}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full footer — post-diagnosis screens */}
      {showFullFooter && (
        <div className="footer-term crt-glow shrink-0">
          <button
            onClick={handleReset}
            className="text-[10px] text-red-500/50 hover:text-red-500 transition-colors uppercase font-bold whitespace-nowrap"
          >
            {t.footer.restart}
          </button>

          <div className="flex flex-wrap justify-end items-center gap-x-3 gap-y-1">
            {(screen === 'POST_PERMISSION' || screen === 'DIAGNOSIS') && (
              <button
                onClick={generateResultShareLink}
                className="footer-option transition-all px-2 text-[10px] sm:text-xs whitespace-nowrap"
              >
                {resultShareCopied ? '✓ ' + t.postPermission.linkCopied : t.footer.shareResult}
              </button>
            )}
            <button
              onClick={() => { setPreviousScreen(screen); setScreen('SHARE_FRIEND'); }}
              className="footer-option transition-all px-2 text-[10px] sm:text-xs whitespace-nowrap"
            >
              {t.footer.sendFriend}
            </button>
            <button
              onClick={goToAbout}
              className="footer-option transition-all px-2 text-[10px] sm:text-xs whitespace-nowrap"
            >
              {t.footer.about}
            </button>
          </div>
        </div>
      )}

      {/* Minimal footer — early input screens */}
      {showMinimalFooter && (
        <div className="footer-term crt-glow shrink-0 justify-end">
          <button
            onClick={handleReset}
            className="text-[10px] text-red-500/30 hover:text-red-500 transition-colors uppercase font-bold"
          >
            {t.footer.restart}
          </button>
        </div>
      )}
    </div>
  );
}
