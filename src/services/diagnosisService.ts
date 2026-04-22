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
    mirror = `You say you want to "${decision}". You've been "thinking about this" for ${timeLower}. That's not reflection — it's fear using the name of caution so it won't be recognized. Every week, the loop restarts. And you already know how it ends.`;
    confrontation = `You claim to be waiting for "${waitingLower}". That condition will never be fully met. It's the same mechanism: creating a criterion that justifies inaction. And it works — because you're still here.`;
    permission = `YOU HAVE PERMISSION. IT'S TIME TO ACT.`;
  } else {
    mirror = `Você diz que quer "${decision}". Já faz ${timeLower} que você está "pensando nisso". Isso não é reflexão — é medo usando o nome de cautela para não ser reconhecido. A cada semana, o loop recomeça. E você já sabe como termina.`;
    confrontation = `Você alega estar esperando por "${waitingLower}". Essa condição nunca vai estar totalmente satisfeita. É o mesmo mecanismo: criar um critério que justifique a inação. E funciona — porque você ainda está aqui.`;
    permission = `VOCÊ TEM PERMISSÃO. É HORA DE AGIR.`;
  }

  const finalDiagnosis = [mirror, '', confrontation, '', permission].join('\n');

  return { diagnosis: finalDiagnosis, isSensitive: false };
};
