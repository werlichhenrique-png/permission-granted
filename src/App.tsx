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

// Renders diagnosis body split into styled sections (mirror + confrontation)
function DiagnosisSections({ text }: { text: string }) {
  const parts = text.split('\n\n').filter(Boolean);
  return (
    <div className="space-y-5">
      {parts[0] && (
        <p className="opacity-90 leading-relaxed">{parts[0]}</p>
      )}
      {parts[1] && (
        <div className="confrontation-text">
          <p className="opacity-90 leading-relaxed">{parts[1]}</p>
        </div>
      )}
    </div>
  );
}

// Static ASCII barcode for document authenticity feel
const ASCII_BARCODE = '█▌█▌▌ ▌██▌█ █▌▌█▌ ▌█▌▌█ ██▌▌█ ▌█▌█▌';

export default function App() {
  const [screen, setScreen] = useState<Screen>('INTRO');
  const [previousScreen, setPreviousScreen] = useState<Screen>('POST_PERMISSION');
  const [decision, setDecision] = useState('');
  const [timeRuminating, setTimeRuminating] = useState('');
  const [sessionTimestamp, setSessionTimestamp] = useState('');
  const [waitingFor, setWaitingFor] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [sharedFromFriend, setSharedFromFriend] = useState(false);
  const [friendMessage, setFriendMessage] = useState('');
  const [shareFriendDesc, setShareFriendDesc] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [viewOnlyData, setViewOnlyData] = useState<SessionData | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState(false);
  const [lang, setLang] = useState<Language>(detectLanguage);
  const [resultShareCopied, setResultShareCopied] = useState(false);
  const [friendLinkCopied, setFriendLinkCopied] = useState(false);
  const [sealVisible, setSealVisible] = useState(false);

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
      try {
        const ref = params.get('ref') || '';
        const padding = '=='.slice(0, (4 - (ref.length % 4)) % 4);
        const decoded = decodeURIComponent(atob(ref + padding));
        if (decoded) setFriendMessage(decoded);
      } catch (_) {
        // ignore decode errors
      }
    }

    const savedSession = localStorage.getItem('permission_granted_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession) as SessionData;
        setDecision(parsed.decision);
        setDiagnosis(parsed.diagnosis);
        setTimeRuminating(parsed.timeRuminating);
        setSessionTimestamp(parsed.timestamp);
        if (parsed.lang) setLang(parsed.lang);
        setScreen('ALREADY_GRANTED');
      } catch (_) {
        localStorage.removeItem('permission_granted_session');
      }
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

  const handleTimeSelect = useCallback((value: string) => {
    setTimeRuminating(value);
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
    const futureYear = new Date().getFullYear() + 5;
    const decisionShort = decision.toUpperCase().slice(0, 28);
    const waitingShort = waitingFor.toLowerCase().slice(0, 28);

    const messages = t.processing.messages.map((m) =>
      m
        .replace('{decision}', decisionShort)
        .replace('{time}', timeRuminating.toUpperCase())
        .replace('{waitingFor}', waitingShort)
        .replace('{year}', String(futureYear))
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
              const now = new Date();
              const timestamp = now.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US');
              const session: SessionData = {
                decision,
                timeRuminating,
                waitingFor,
                diagnosis: finalResult,
                timestamp,
                id: sessionId,
                lang,
              };
              localStorage.setItem('permission_granted_session', JSON.stringify(session));
              setSessionTimestamp(timestamp);
              setSealVisible(false);
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

  // Strips the permission stamp from diagnosis text for body display
  const diagnosisBody = useCallback((text: string): string => {
    const stamps = [
      'VOCÊ TEM PERMISSÃO. É HORA DE AGIR.',
      "YOU HAVE PERMISSION. IT'S TIME TO ACT.",
    ];
    let result = text;
    for (const stamp of stamps) {
      result = result.replace(stamp, '').trim();
    }
    return result;
  }, []);

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
      <div className="mt-8 text-center min-h-[3rem] flex items-center justify-center px-4">
        <p className="text-sm sm:text-base">
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
    navigator.clipboard.writeText(`${t.postPermission.shareMessage}\n${url}`).then(() => {
      setResultShareCopied(true);
      setTimeout(() => setResultShareCopied(false), 2500);
    });
  }, [decision, diagnosis, timeRuminating, sessionId, lang, t.postPermission.shareMessage]);

  const onIntroComplete = useCallback(() => {
    setTimeout(() => setScreen('DECISION'), 800);
  }, []);

  const onDiagnosisTypewriterComplete = useCallback(() => {
    setSealVisible(true);
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

  const handleViewVeredito = useCallback(() => {
    setScreen('POST_PERMISSION');
  }, []);

  const goToAbout = useCallback(() => {
    setPreviousScreen(screen);
    setScreen('ABOUT');
  }, [screen]);

  const statusDone = ['DIAGNOSIS', 'POST_PERMISSION', 'VIEW_SHARED'].includes(screen);
  const showFullFooter = ['POST_PERMISSION', 'DIAGNOSIS', 'ALREADY_GRANTED', 'SHARE_FRIEND'].includes(screen);
  const showMinimalFooter = ['DECISION', 'TIME', 'WAITING'].includes(screen);

  // Formatted emission date
  const emissionDate = new Date().toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US');
  const emissionTime = new Date().toLocaleTimeString(lang === 'pt' ? 'pt-BR' : 'en-US');

  return (
    <div className="flex flex-col h-screen p-4 sm:p-10 crt-overlay terminal-flicker relative bg-[#0a0a0a] overflow-hidden">

      {/* Header */}
      <div className="header-term crt-glow shrink-0">
        <span className="cursor-help transition-colors truncate mr-2" onClick={handleReset}>
          {t.header.title} [{statusDone ? t.header.statusDone : t.header.statusActive}]
        </span>
        <div className="flex items-center gap-3 shrink-0">
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
          <span className="hidden sm:inline opacity-60 text-[11px]">
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
              <div className="p-3 border border-[#00ff41]/30 bg-[#00ff41]/5">
                <p className="text-xs opacity-60 mb-1 font-mono">{t.viewShared.fileLabel}</p>
                <p className="text-sm">
                  {t.viewShared.permissionFor}{' '}
                  <span className="font-bold text-[#00ff41] underline">{viewOnlyData.decision}</span>
                </p>
              </div>

              <div className="text-base sm:text-[17px]">
                <span className="label opacity-60 text-[11px] mb-3 block">{t.diagnosis.verdictLabel}</span>
                <DiagnosisSections text={diagnosisBody(viewOnlyData.diagnosis || '')} />
              </div>

              <div className="permission-seal border-2 border-[#00ff41] bg-[#00ff41]/5 text-center mt-6">
                <span className="text-2xl sm:text-[38px] font-bold block mb-2 tracking-widest">
                  {t.diagnosis.sealTitle}
                </span>
                {viewOnlyData.decision && (
                  <span className="text-xs sm:text-sm opacity-80 block mb-3 tracking-wider underline">
                    {t.diagnosis.emittedFor} {viewOnlyData.decision}
                  </span>
                )}
                <span className="text-[12px] opacity-60 tracking-widest block leading-relaxed max-w-lg mx-auto">
                  {t.diagnosis.sealSubtitle}
                </span>
              </div>

              <div className="pt-8 space-y-4 text-center">
                <p className="text-sm font-bold tracking-widest">{t.viewShared.teaser}</p>
                <p className="text-xs opacity-60">{t.viewShared.teaserSub}</p>
                <button
                  onClick={() => window.location.assign(window.location.origin + window.location.pathname)}
                  className="border border-[#00ff41] px-8 py-3 hover:bg-[#00ff41] hover:text-black transition-all font-mono text-sm uppercase font-bold"
                >
                  {t.viewShared.ctaButton}
                </button>
              </div>
            </motion.div>
          )}

          {/* INTRO */}
          {screen === 'INTRO' && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {!sharedFromFriend && (
                <Typewriter text={t.intro.hook} delay={200} speed={42} className="opacity-60" />
              )}
              {sharedFromFriend && (
                <>
                  <Typewriter text={t.intro.sharedFromFriend} delay={300} speed={40} className="opacity-70" />
                  {friendMessage && (
                    <Typewriter
                      text={`${t.intro.friendContext} "${friendMessage.toUpperCase()}"`}
                      delay={2200}
                      speed={35}
                      className="opacity-90"
                    />
                  )}
                </>
              )}
              <Typewriter
                text={t.intro.title}
                delay={sharedFromFriend ? (friendMessage ? 5200 : 2800) : 2400}
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
              <form onSubmit={handleDecisionSubmit} className="space-y-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="input-field"
                  autoFocus={!isMobile}
                  enterKeyHint="done"
                />
                <p className="text-[10px] opacity-30 tracking-widest">{t.decision.hint}</p>
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
                    onClick={() => handleTimeSelect(opt.value)}
                    className="text-left hover:bg-[#00ff41] hover:text-[#0d0208] px-2 py-2 transition-colors cursor-pointer text-sm sm:text-base"
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
              <form onSubmit={handleWaitingSubmit} className="space-y-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={waitingFor}
                  onChange={(e) => setWaitingFor(e.target.value)}
                  className="input-field"
                  autoFocus={!isMobile}
                  enterKeyHint="done"
                />
                <p className="text-[10px] opacity-30 tracking-widest">{t.waiting.hint}</p>
              </form>
            </motion.div>
          )}

          {/* PROCESSING */}
          {screen === 'PROCESSING' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md mx-auto">
              {renderProgressBar()}
            </motion.div>
          )}

          {/* DIAGNOSIS — text first, seal + full content animate in after typewriter completes */}
          {screen === 'DIAGNOSIS' && (
            <motion.div key="diagnosis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="text-base sm:text-[17px]">
                <span className="label opacity-60 text-[11px] mb-3 block">{t.diagnosis.verdictLabel}</span>
                <Typewriter
                  text={diagnosisBody(diagnosis)}
                  speed={18}
                  onComplete={onDiagnosisTypewriterComplete}
                />
              </div>

              {sealVisible && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  >
                    <div className="permission-seal border-2 border-[#00ff41] bg-[#00ff41]/5 text-center">
                      <span className="text-2xl sm:text-[38px] font-bold block mb-2 tracking-widest">
                        {t.diagnosis.sealTitle}
                      </span>
                      {decision && (
                        <span className="text-xs sm:text-sm opacity-80 block mb-3 tracking-wider underline">
                          {t.diagnosis.emittedFor} {decision.toUpperCase()}
                        </span>
                      )}
                      <span className="text-[12px] opacity-60 tracking-widest block leading-relaxed max-w-lg mx-auto uppercase">
                        {t.diagnosis.sealSubtitle}
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.7 }}
                    className="space-y-6"
                  >
                    <div className="border border-[#00ff41]/40 p-3 text-center">
                      <p className="text-xs sm:text-sm tracking-wider opacity-80">{t.postPermission.urgencyLine}</p>
                    </div>

                    <div className="text-center">
                      <button
                        onClick={generateResultShareLink}
                        className="border border-[#00ff41] px-6 py-2 hover:bg-[#00ff41] hover:text-black transition-all font-mono text-xs sm:text-sm uppercase font-bold"
                      >
                        {resultShareCopied ? `✓ ${t.postPermission.linkCopied}` : t.footer.shareResult}
                      </button>
                    </div>

                    <div className="text-[10px] opacity-40 text-right leading-tight font-mono">
                      {t.diagnosis.emissionLabel}: {emissionDate} — {emissionTime}<br />
                      {t.diagnosis.noAppeal}<br />
                      {t.diagnosis.authCode} {sessionId}<br />
                      <span className="opacity-70 tracking-[0.15em]">{ASCII_BARCODE}</span>
                    </div>
                  </motion.div>
                </>
              )}
            </motion.div>
          )}

          {/* POST_PERMISSION */}
          {screen === 'POST_PERMISSION' && (
            <motion.div key="post_permission" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="permission-seal border-2 border-[#00ff41] bg-[#00ff41]/5 text-center">
                <span className="text-2xl sm:text-[38px] font-bold block mb-2 tracking-widest uppercase">
                  {t.diagnosis.sealTitle}
                </span>
                {decision && (
                  <span className="text-xs sm:text-sm opacity-80 block mb-3 tracking-wider underline uppercase">
                    {t.diagnosis.emittedFor} {decision}
                  </span>
                )}
                <span className="text-[12px] opacity-60 tracking-widest block leading-relaxed max-w-lg mx-auto uppercase">
                  {t.diagnosis.sealSubtitle}
                </span>
              </div>

              <div className="text-base sm:text-[17px]">
                <span className="label text-[#004411] opacity-60 text-[11px] block mb-3">{t.diagnosis.verdictLabel}</span>
                <DiagnosisSections text={diagnosisBody(diagnosis)} />
              </div>

              {/* Urgency line */}
              <div className="border border-[#00ff41]/40 p-3 text-center">
                <p className="text-xs sm:text-sm tracking-wider opacity-80">{t.postPermission.urgencyLine}</p>
              </div>

              {/* Share result as prominent action */}
              <div className="text-center">
                <button
                  onClick={generateResultShareLink}
                  className="border border-[#00ff41] px-6 py-2 hover:bg-[#00ff41] hover:text-black transition-all font-mono text-xs sm:text-sm uppercase font-bold"
                >
                  {resultShareCopied ? `✓ ${t.postPermission.linkCopied}` : t.footer.shareResult}
                </button>
              </div>

              <div className="metadata text-[10px] opacity-40 text-right mt-4 leading-tight font-mono">
                {t.diagnosis.emissionLabel}: {emissionDate} — {emissionTime}<br />
                {t.diagnosis.noAppeal}<br />
                {t.diagnosis.authCode} {viewOnlyData?.id || sessionId}<br />
                <span className="opacity-70 tracking-[0.15em]">{ASCII_BARCODE}</span>
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
              <form onSubmit={handleShareFriendSubmit} className="space-y-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={shareFriendDesc}
                  onChange={(e) => setShareFriendDesc(e.target.value)}
                  className="input-field"
                  autoFocus={!isMobile}
                  enterKeyHint="send"
                />
                {!shareUrl && (
                  <>
                    <p className="text-[10px] opacity-30 tracking-widest">{t.shareFriend.hint}</p>
                  </>
                )}
              </form>

              {shareUrl && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-4">
                  <p className="text-xs opacity-60">{t.shareFriend.shareIntro}</p>
                  <div className="bg-[#00ff41]/10 border border-[#00ff41]/50 p-3 break-all text-xs font-mono">
                    {shareUrl}
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <button
                      onClick={copyFriendLink}
                      className="border border-[#00ff41] px-4 py-2 text-xs hover:bg-[#00ff41] hover:text-[#0d0208] uppercase transition-all font-bold"
                    >
                      {friendLinkCopied ? `✓ ${t.shareFriend.linkCopied}` : t.shareFriend.copyButton}
                    </button>
                    <button
                      onClick={() => setScreen(previousScreen)}
                      className="text-xs opacity-40 hover:opacity-100 uppercase"
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

          {/* ALREADY_GRANTED — verdict first, block secondary */}
          {screen === 'ALREADY_GRANTED' && (
            <motion.div key="already_granted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">

              {/* Main: the verdict they already have */}
              <div className="space-y-3">
                <p className="text-xs opacity-50 tracking-widest">{t.alreadyGranted.verdictRegistered} {sessionTimestamp}</p>
                <p className="text-base sm:text-lg">
                  {t.alreadyGranted.youHavePermission}{' '}
                  <span className="text-[#00ff41] underline font-bold">{decision}</span>
                </p>
                <button
                  onClick={handleViewVeredito}
                  className="border border-[#00ff41] px-6 py-2 hover:bg-[#00ff41] hover:text-black transition-all font-mono text-sm uppercase font-bold mt-2"
                >
                  {t.alreadyGranted.viewVeredito}
                </button>
              </div>

              {/* Historical archive */}
              {diagnosis && (
                <div className="p-4 border-l-2 border-[#00ff41]/40 bg-[#00ff41]/3">
                  <span className="label text-[#004411] mb-3 block uppercase text-[11px]">
                    {t.alreadyGranted.archiveLabel}
                  </span>
                  <div className="text-sm opacity-70">
                    <DiagnosisSections text={diagnosisBody(diagnosis)} />
                  </div>
                </div>
              )}

              {/* Secondary: blocked state + admin */}
              <div className="border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                <p className="text-red-500/80 text-xs uppercase tracking-tight font-bold">{t.alreadyGranted.blockedTitle}</p>
                <p className="text-xs opacity-60">{t.alreadyGranted.blockedBody}</p>
                <form onSubmit={handleAdminReset} className="space-y-2 pt-2 border-t border-red-500/20">
                  <p className="text-[10px] uppercase opacity-40">{t.alreadyGranted.adminLabel}</p>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder={t.alreadyGranted.adminPlaceholder}
                    className={`w-full max-w-xs bg-black border ${adminError ? 'border-red-500 animate-shake' : 'border-red-500/30'} p-2 text-center text-red-500/60 placeholder:text-red-500/20 focus:outline-none text-xs font-mono`}
                  />
                  {adminError && (
                    <p className="text-[10px] text-red-600 font-bold">{t.alreadyGranted.adminError}</p>
                  )}
                  <button
                    type="submit"
                    className="border border-red-500/50 text-red-500/60 px-4 py-1 hover:bg-red-600 hover:text-white transition-all font-mono text-xs uppercase"
                  >
                    {t.alreadyGranted.adminButton}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ABOUT */}
          {screen === 'ABOUT' && (
            <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-lg">
              <div>
                <span className="label opacity-60 text-[11px] mb-4 block">{t.about.title}</span>
                <div className="space-y-3 text-base sm:text-lg leading-relaxed opacity-90">
                  {t.about.lines.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
              <div className="border-t border-[#00ff41]/20 pt-5 space-y-2">
                <p className="text-xs opacity-40 uppercase">{t.about.builtBy}</p>
                <p className="text-base font-bold">{t.about.author}</p>
                <p className="text-sm opacity-50">{t.about.role}</p>
                <a
                  href="https://www.linkedin.com/in/henrique-werlich"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 border border-[#00ff41] px-4 py-2 text-xs hover:bg-[#00ff41] hover:text-black transition-all uppercase font-bold"
                >
                  {t.about.portfolioLabel}
                </a>
              </div>
              <button
                onClick={() => setScreen(previousScreen)}
                className="text-xs opacity-40 hover:opacity-100 uppercase block"
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
            className="footer-btn text-red-500/40 hover:text-red-500 font-bold whitespace-nowrap"
          >
            {t.footer.restart}
          </button>
          <div className="flex flex-wrap justify-end items-center gap-x-1 gap-y-1">
            {(screen === 'POST_PERMISSION' || screen === 'DIAGNOSIS') && (
              <button
                onClick={generateResultShareLink}
                className="footer-option footer-btn whitespace-nowrap"
              >
                {resultShareCopied ? `✓ ${t.postPermission.linkCopied}` : t.footer.shareResult}
              </button>
            )}
            <button
              onClick={() => { setPreviousScreen(screen); setScreen('SHARE_FRIEND'); }}
              className="footer-option footer-btn whitespace-nowrap"
            >
              {t.footer.sendFriend}
            </button>
            <button onClick={goToAbout} className="footer-option footer-btn whitespace-nowrap">
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
            className="footer-btn text-red-500/25 hover:text-red-500 uppercase font-bold"
          >
            {t.footer.restart}
          </button>
        </div>
      )}
    </div>
  );
}
