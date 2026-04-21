export type Language = 'pt' | 'en';

export const translations = {
  pt: {
    header: {
      title: 'SISTEMA DE AUTORIZAÇÃO PESSOAL v1.0',
      statusActive: 'ATIVO',
      statusDone: 'FINALIZADO',
      sessionId: 'ID_SESSÃO',
    },
    intro: {
      sharedFromFriend: 'Alguém que se importa com você te mandou aqui.',
      title: 'SISTEMA DE AUTORIZAÇÃO PESSOAL v1.0 — ACESSO RESTRITO',
    },
    decision: {
      question: 'Qual decisão você está adiando?',
    },
    time: {
      question: "Há quanto tempo você está 'pensando' nisso?",
      options: [
        { id: 'A', label: 'Algumas semanas' },
        { id: 'B', label: 'Alguns meses' },
        { id: 'C', label: 'Mais de um ano' },
        { id: 'D', label: 'Honestamente, não lembro mais' },
      ],
    },
    waiting: {
      question: 'O que exatamente você está esperando?',
    },
    processing: {
      messages: [
        'ACESSANDO DECISÕES PENDENTES...',
        'DETECTADO: 1 DECISÃO ADIADA DESDE {time}...',
        'ANALISANDO DESABAFOS COM AMIGOS, IA, TERAPEUTAS...',
        'RESULTADO: NENHUMA CONCLUSÃO NOVA...',
        'CALCULANDO TEMPO DESPERDIÇADO...',
        'DIAGNÓSTICO: VOCÊ JÁ SABE A RESPOSTA...',
        'CONSULTANDO SUA VERSÃO FUTURA...',
        'VERSÃO FUTURA IMPACIENTE...',
        'EMITINDO PERMISSÃO OFICIAL...',
      ],
    },
    diagnosis: {
      sealTitle: 'PERMISSÃO CONCEDIDA.',
      sealSubtitle: 'ESTE DOCUMENTO SUBSTITUI QUALQUER CONSELHO, OPINIÃO OU SESSÃO DE TERAPIA ANTERIORES.',
      verdictLabel: 'Veredito_Final',
      emissionLabel: 'EMISSÃO',
      noAppeal: 'AUTORIZAÇÃO DEFINITIVA. SEM POSSIBILIDADE DE RECURSO.',
      sessionLocked: 'SESSÃO BLOQUEADA PARA ESTE TÓPICO.',
    },
    postPermission: {
      linkCopied: 'Link copiado!',
      shareMessage: 'Eu tomei uma decisão e recebi permissão definitiva do sistema.',
    },
    shareFriend: {
      question: 'Descreva em uma frase o que seu amigo está adiando.',
      shareIntro: 'Achei isso. Talvez seja pra você.',
      copyButton: 'COPIAR MENSAGEM',
      back: 'VOLTAR',
      linkCopied: 'Link copiado!',
    },
    sensitive: {
      title: 'Isso aqui não é o lugar certo pra isso. Mas existe um lugar.',
      body: 'Se você está passando por um momento difícil, saiba que existe ajuda disponível. Você não está sozinho.',
      ctaBrazil: 'Falar agora: CVV - 188',
      ctaIntl: 'Encontrar ajuda',
    },
    alreadyGranted: {
      blockedTitle: 'SESSÃO BLOQUEADA: PERMISSÃO JÁ EMITIDA',
      blockedSubtitle: 'O SISTEMA IDENTIFICOU UM DOCUMENTO ATIVO PARA ESTE DISPOSITIVO.',
      blockedBody: 'SÓ É PERMITIDO REINICIAR APÓS COMPLETAR A AÇÃO.',
      adminLabel: 'Reiniciação forçada (Admin)',
      adminPlaceholder: 'SENHA DE ACESSO',
      adminButton: 'EXECUTAR RESET',
      adminError: 'ACESSO NEGADO: CÓDIGO INCORRETO',
      diagnosisFound: 'DIAGNÓSTICO ENCONTRADO —',
      youHavePermission: 'Você já tem sua permissão para:',
      archiveLabel: 'ARQUIVO_HISTÓRICO',
    },
    viewShared: {
      fileLabel: 'ARQUIVO DE SESSÃO COMPARTILHADO // ORIGEM: EXTERNA',
      permissionFor: 'Esta é uma permissão definitiva emitida para a decisão:',
      ctaButton: 'ACESSAR O SISTEMA PARA MINHA PRÓPRIA DECISÃO',
    },
    footer: {
      restart: '[ REINICIAR ]',
      sendFriend: '[ ENVIAR PARA AMIGO ]',
      shareResult: '[ COMPARTILHAR RESULTADO ]',
      about: '[ POR QUE ISSO EXISTE ]',
    },
    about: {
      title: 'POR QUE ISSO EXISTE',
      lines: [
        'Em 2024, passei meses adiando um pedido de demissão que eu sabia ser certo.',
        'Conversei com amigos. Com IAs. Com terapeutas. Mesmas conclusões, toda vez.',
        'O que me faltava não era informação. Era permissão.',
        'Coaches relatam o mesmo padrão: pessoas buscam sessões',
        'não por dúvida — mas para ouvir "pode ir".',
        'Permission Granted existe para ser esse empurrão.',
      ],
      builtBy: 'Construído por',
      author: 'Henrique Werlich',
      role: 'Product Manager',
      portfolioLabel: '[ VER LINKEDIN ]',
      back: '[ VOLTAR ]',
    },
    progressBar: {
      label: 'TASK_PROGRESS_METER',
    },
    errors: {
      diagnosisUnavailable: 'ERRO CRÍTICO: DIAGNÓSTICO INDISPONÍVEL.',
      processingError: 'ERRO DE PROCESSAMENTO LOCAL. TENTE NOVAMENTE.',
    },
  },
  en: {
    header: {
      title: 'PERSONAL AUTHORIZATION SYSTEM v1.0',
      statusActive: 'ACTIVE',
      statusDone: 'COMPLETED',
      sessionId: 'SESSION_ID',
    },
    intro: {
      sharedFromFriend: 'Someone who cares about you sent you here.',
      title: 'PERSONAL AUTHORIZATION SYSTEM v1.0 — RESTRICTED ACCESS',
    },
    decision: {
      question: 'What decision are you putting off?',
    },
    time: {
      question: "How long have you been 'thinking' about this?",
      options: [
        { id: 'A', label: 'A few weeks' },
        { id: 'B', label: 'A few months' },
        { id: 'C', label: 'Over a year' },
        { id: 'D', label: "Honestly, I can't remember anymore" },
      ],
    },
    waiting: {
      question: 'What exactly are you waiting for?',
    },
    processing: {
      messages: [
        'ACCESSING PENDING DECISIONS...',
        'DETECTED: 1 DELAYED DECISION SINCE {time}...',
        'ANALYZING CONVERSATIONS WITH FRIENDS, AI, THERAPISTS...',
        'RESULT: NO NEW CONCLUSIONS...',
        'CALCULATING WASTED TIME...',
        'DIAGNOSIS: YOU ALREADY KNOW THE ANSWER...',
        'CONSULTING YOUR FUTURE SELF...',
        'FUTURE SELF IS IMPATIENT...',
        'ISSUING OFFICIAL PERMISSION...',
      ],
    },
    diagnosis: {
      sealTitle: 'PERMISSION GRANTED.',
      sealSubtitle: 'THIS DOCUMENT SUPERSEDES ANY PRIOR ADVICE, OPINION, OR THERAPY SESSION.',
      verdictLabel: 'Final_Verdict',
      emissionLabel: 'ISSUED',
      noAppeal: 'DEFINITIVE AUTHORIZATION. NO APPEALS POSSIBLE.',
      sessionLocked: 'SESSION LOCKED FOR THIS TOPIC.',
    },
    postPermission: {
      linkCopied: 'Link copied!',
      shareMessage: 'I made a decision and received definitive permission from the system.',
    },
    shareFriend: {
      question: 'Describe in one sentence what your friend is putting off.',
      shareIntro: "Found this. Maybe it's for you.",
      copyButton: 'COPY MESSAGE',
      back: 'BACK',
      linkCopied: 'Link copied!',
    },
    sensitive: {
      title: "This isn't the right place for this. But there is a place.",
      body: 'If you are going through a difficult time, please know that help is available. You are not alone.',
      ctaBrazil: 'Talk now: CVV - 188',
      ctaIntl: 'Find help locally',
    },
    alreadyGranted: {
      blockedTitle: 'SESSION BLOCKED: PERMISSION ALREADY ISSUED',
      blockedSubtitle: 'THE SYSTEM IDENTIFIED AN ACTIVE DOCUMENT FOR THIS DEVICE.',
      blockedBody: 'RESTART IS ONLY ALLOWED AFTER COMPLETING THE ACTION.',
      adminLabel: 'Forced restart (Admin)',
      adminPlaceholder: 'ACCESS CODE',
      adminButton: 'EXECUTE RESET',
      adminError: 'ACCESS DENIED: INCORRECT CODE',
      diagnosisFound: 'DIAGNOSIS FOUND —',
      youHavePermission: 'You already have permission to:',
      archiveLabel: 'HISTORICAL_FILE',
    },
    viewShared: {
      fileLabel: 'SHARED SESSION FILE // SOURCE: EXTERNAL',
      permissionFor: 'This is a definitive permission issued for the decision:',
      ctaButton: 'ACCESS THE SYSTEM FOR MY OWN DECISION',
    },
    footer: {
      restart: '[ RESTART ]',
      sendFriend: '[ SEND TO FRIEND ]',
      shareResult: '[ SHARE RESULT ]',
      about: '[ WHY THIS EXISTS ]',
    },
    about: {
      title: 'WHY THIS EXISTS',
      lines: [
        "In 2024, I spent months putting off a resignation I knew was right.",
        'I talked to friends. To AIs. To therapists. Same conclusions, every time.',
        "What I was missing wasn't information. It was permission.",
        'Coaches report the same pattern: people seek sessions',
        'not out of doubt — but to hear "you can go".',
        'Permission Granted exists to be that push.',
      ],
      builtBy: 'Built by',
      author: 'Henrique Werlich',
      role: 'Product Manager',
      portfolioLabel: '[ SEE LINKEDIN ]',
      back: '[ BACK ]',
    },
    progressBar: {
      label: 'TASK_PROGRESS_METER',
    },
    errors: {
      diagnosisUnavailable: 'CRITICAL ERROR: DIAGNOSIS UNAVAILABLE.',
      processingError: 'LOCAL PROCESSING ERROR. PLEASE TRY AGAIN.',
    },
  },
};

export type Translations = typeof translations.pt;
