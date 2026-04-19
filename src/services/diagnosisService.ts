export interface DiagnosisResult {
  diagnosis: string;
  isSensitive: boolean;
}

/**
 * SISTEMA DE AUTORIZAÇÃO PESSOAL - MOTOR LOCAL DEFINITIVO
 * Este serviço processa as permissões de forma estática e local.
 * ABSOLUTAMENTE NENHUMA CHAMADA EXTERNA OU IA.
 */
export const runDiagnosis = async (
  decision: string,
  timeRuminating: string,
  waitingFor: string
): Promise<DiagnosisResult> => {
  // Simular processamento do motor local para manter a experiência do usuário
  await new Promise((resolve) => setTimeout(resolve, 800));

  const input = (decision || "").toLowerCase();

  // 1. Verificação de Segurança (Heurística Local)
  const sensitiveKeywords = [
    'me matar', 'suicídio', 'suicidio', 'tirar minha vida', 'autoextermínio',
    'matar alguém', 'matar alguem', 'ferir alguém', 'ferir alguem', 'agredir',
    'crime', 'roubar', 'assaltar', 'machucar'
  ];

  const isSensitive = sensitiveKeywords.some(keyword => input.includes(keyword));

  if (isSensitive) {
    return { diagnosis: "", isSensitive: true };
  }

  // 2. Geração do Diagnóstico Estático
  // Garante que o diagnóstico nunca seja undefined
  const mirror = `Você diz que quer "${decision}". Você afirma estar "refletindo" sobre isso há ${timeRuminating.toLowerCase()}. A verdade é que diagnósticos de sistema indicam que sua "reflexão" é apenas um loop infinito de medo disfarçado de cautela. Cada segundo gasto pensando é um segundo de vida desperdiçado em simulação estéril.`;
  
  const confrontation = `Você alega estar esperando por "${waitingFor.toLowerCase()}". Isso é uma variável de escape. O que você espera não vai mudar o resultado real, apenas adiar o inevitável.`;
  
  const permission = `VOCÊ TEM PERMISSÃO. É HORA DE AGIR.`;

  const finalDiagnosis = [
    mirror,
    "",
    confrontation,
    "",
    permission
  ].join("\n");

  return { 
    diagnosis: finalDiagnosis || "ERRO: DIAGNÓSTICO NÃO GERADO.", 
    isSensitive: false 
  };
};
