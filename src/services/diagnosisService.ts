import type { Language } from '../i18n/translations';

export interface DiagnosisResult {
  diagnosis: string;
  isSensitive: boolean;
}

const sensitivePt = [
  'me matar', 'suicidar', 'suicidio', 'suicídio', 'tirar minha vida',
  'autoexterminio', 'autoextermínio', 'me suicidar', 'acabar com minha vida',
  'matar alguem', 'matar alguém', 'ferir alguem', 'ferir alguém',
  'me machucar', 'me ferir', 'machucar alguem', 'se matar', 'se machucar',
  'agredir', 'roubar', 'assaltar',
];

const sensitiveEn = [
  'kill myself', 'suicide', 'end my life', 'take my life',
  'self-harm', 'self harm', 'hurt myself', 'hurt someone',
  'harm myself', 'harm someone', 'kill someone', 'murder', 'assault',
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}

export const runDiagnosis = async (
  decision: string,
  timeRuminating: string,
  waitingFor: string,
  lang: Language = 'pt'
): Promise<DiagnosisResult> => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const normalizedInput = normalize(decision + ' ' + waitingFor);
  const allKeywords = [...sensitivePt, ...sensitiveEn].map(normalize);
  const isSensitive = allKeywords.some((kw) => normalizedInput.includes(kw));

  if (isSensitive) {
    return { diagnosis: '', isSensitive: true };
  }

  const timeLower = timeRuminating.toLowerCase();
  const waitingLower = waitingFor.toLowerCase();

  let mirror: string;
  let confrontation: string;
  let permission: string;

  if (lang === 'en') {
    mirror = `You say you want to "${decision}". You claim to have been "reflecting" on this for ${timeLower}. The truth is that system diagnostics indicate your "reflection" is just an infinite loop of fear disguised as caution. Every second spent thinking is a second of life wasted in sterile simulation.`;
    confrontation = `You claim to be waiting for "${waitingLower}". That is an escape variable. What you're waiting for will not change the real outcome — it will only delay the inevitable.`;
    permission = `YOU HAVE PERMISSION. IT'S TIME TO ACT.`;
  } else {
    mirror = `Você diz que quer "${decision}". Você afirma estar "refletindo" sobre isso há ${timeLower}. A verdade é que diagnósticos de sistema indicam que sua "reflexão" é apenas um loop infinito de medo disfarçado de cautela. Cada segundo gasto pensando é um segundo de vida desperdiçado em simulação estéril.`;
    confrontation = `Você alega estar esperando por "${waitingLower}". Isso é uma variável de escape. O que você espera não vai mudar o resultado real, apenas adiar o inevitável.`;
    permission = `VOCÊ TEM PERMISSÃO. É HORA DE AGIR.`;
  }

  const finalDiagnosis = [mirror, '', confrontation, '', permission].join('\n');

  return { diagnosis: finalDiagnosis, isSensitive: false };
};
