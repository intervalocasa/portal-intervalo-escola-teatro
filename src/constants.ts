export const ADULT_COURSE_CRITERIA = [
  { id: "presence", label: "Presença cênica", definition: "Capacidade de sustentar atenção, disponibilidade e impacto em cena." },
  { id: "body", label: "Consciência corporal", definition: "Uso do corpo como instrumento expressivo, disponível e organizado em cena." },
  { id: "vocal", label: "Expressividade vocal", definition: "Projeção, articulação, intenção e uso expressivo da voz." },
  { id: "listening", label: "Escuta e prontidão cênica", definition: "Capacidade de reagir ao parceiro, ao jogo e aos estímulos da cena com atenção viva." },
  { id: "impro", label: "Improvisação e criatividade cênica", definition: "Capacidade de propor, imaginar e sustentar ações em situações abertas de criação." },
  { id: "character", label: "Construção de personagem", definition: "Capacidade de compor identidade, intenção, comportamento e lógica de personagem." },
  { id: "partner", label: "Relação com o parceiro e trabalho em grupo", definition: "Capacidade de atuar em relação, respeitar o coletivo e construir cena em conjunto." },
  { id: "text", label: "Apropriação de texto e memorização cênica", definition: "Capacidade de memorizar, compreender e sustentar texto com intenção e organicidade." },
  { id: "space", label: "Organização espacial e composição de cena", definition: "Uso do espaço, marcações, deslocamentos e leitura da cena como composição." },
  { id: "autonomy", label: "Autonomia e compromisso com o processo", definition: "Responsabilidade do aluno com o trabalho, prontidão para aula/ensaio e capacidade de avançar no processo com iniciativa." }
];

export const PROFESSIONAL_COURSE_CRITERIA = [
  ...ADULT_COURSE_CRITERIA,
  { id: "discipline", label: "Disciplina de ensaio", definition: "Capacidade de manter foco, constância, organização e conduta adequada durante os ensaios." },
  { id: "punctuality", label: "Pontualidade e preparação para o trabalho", definition: "Capacidade de chegar no horário e apresentar-se preparado para o ensaio, com prontidão física, mental e material." },
  { id: "continuity", label: "Continuidade processual entre ensaios", definition: "Capacidade de retomar, sustentar e desenvolver o trabalho de um encontro para o outro, sem romper o fluxo do processo." },
  { id: "direction", label: "Resposta à direção", definition: "Capacidade de escutar, compreender e incorporar orientações de direção de forma prática e consistente na cena." },
  { id: "precision", label: "Precisão de marcação cênica", definition: "Capacidade de memorizar e executar com segurança entradas, saídas, posições, deslocamentos e ações marcadas em cena." },
  { id: "repetition", label: "Sustentação de cena em repetição", definition: "Capacidade de repetir uma cena mantendo sua lógica, qualidade, intenção e considerência ao longo dos ensaios." },
  { id: "dramaturgy", label: "Compreensão dramatúrgica da obra", definition: "Capacidade de compreender a estrutura da obra, as relações entre personagens, os conflitos e a função da cena no conjunto." },
  { id: "materials", label: "Responsabilidade com figurino, objeto e material de cena", definition: "Capacidade de cuidar, organizar e utilizar com responsabilidade os elementos materiais necessários ao processo de montagem." },
  { id: "collective", label: "Capacidade de composição em cena coletiva", definition: "Capacidade de integrar-se ao conjunto, contribuindo para a unidade visual, espacial e expressiva das cenas coletivas." },
  { id: "professionalism", label: "Postura profissional diante da montagem", definition: "Capacidade de assumir o processo de montagem com responsabilidade, maturidade, compromisso e compreensão do trabalho coletivo." }
];

export const PROFESSIONAL_CRITERIA_BASE = ADULT_COURSE_CRITERIA;
export const PROFESSIONAL_CRITERIA_MONTAGEM = PROFESSIONAL_COURSE_CRITERIA;
export const ADULT_CRITERIA = ADULT_COURSE_CRITERIA;

export const GRADE_LEGEND = [
  { 
    value: "0", 
    label: "Ponto de Partida", 
    studentLabel: "Ainda não percebi esse aspecto no meu processo",
    desc: "Ainda não percebi esse aspecto no meu processo",
    detail: "O aluno ainda não apresenta os fundamentos deste critério ou não houve oportunidade de observação.",
    motivation: "Este é um aspecto que ainda está começando a aparecer no seu processo. Com prática, presença e acompanhamento, ele vai ganhar forma."
  },
  { 
    value: "1-3", 
    label: "Ainda não percebi mudança", 
    studentLabel: "Ainda não percebi mudança",
    desc: "Ainda não percebi mudança",
    detail: "Apresenta muita hesitação, instabilidade técnica e baixa sustentação ou engajamento com o critério.",
    motivation: "Você já começou a se aproximar dessa habilidade. Agora é hora de experimentar mais, testar caminhos e ganhar confiança."
  },
  { 
    value: "4-6", 
    label: "Em movimento", 
    studentLabel: "Percebo que este aspecto está em movimento",
    desc: "Percebo que este aspecto está em movimento",
    detail: "Apresenta compreensão básica, mas com oscilações frequentes e necessidade de orientação constante.",
    motivation: "Essa habilidade já está em movimento. Você está praticando, percebendo avanços e construindo mais segurança em cena."
  },
  { 
    value: "7-9", 
    label: "Se desenvolvendo", 
    studentLabel: "Sinto que este aspecto está se desenvolvendo",
    desc: "Sinto que este aspecto está se desenvolvendo",
    detail: "Apresenta segurança, autonomia e domínio técnico satisfatório, com aplicação orgânica em cena.",
    motivation: "Você já demonstra essa habilidade com consistência. O próximo passo é aprofundar, refinar e usar isso com mais autonomia artística."
  },
  { 
    value: "10", 
    label: "Presente e seguro", 
    studentLabel: "Sinto que este aspecto está presente e seguro",
    desc: "Sinto que este aspecto está presente e seguro",
    detail: "Demonstra domínio superior, criatividade excepcional e consistência artística plena em todos os desafios.",
    motivation: "Essa habilidade aparece com muita força no seu processo. Continue cultivando esse domínio e usando-o como potência criativa em cena."
  }
];

export const ADULT_OPEN_QUESTIONS = [
  { id: "strengths", label: "O que você percebe como seus pontos fortes no processo deste mês?", placeholder: "Reflita sobre suas conquistas..." },
  { id: "challenges", label: "Quais foram seus maiores desafios?", placeholder: "O que foi mais difícil de realizar?" },
  { id: "nextSteps", label: "Quais são seus objetivos para o próximo mês?", placeholder: "O que você deseja aprimorar?" }
];

export const PROFESSIONAL_OPEN_QUESTIONS = [
  ...ADULT_OPEN_QUESTIONS,
  { id: "commitment", label: "Como você analisa seu compromisso com a montagem e o elenco?", placeholder: "Reflita sobre sua postura profissional..." }
];

export const SCALES = [
  { value: 0, label: "Ainda não percebi esse aspecto no meu processo" },
  { value: 2, label: "Ainda não percebi mudança" },
  { value: 5, label: "Percebo que este aspecto está em movimento" },
  { value: 8, label: "Sinto que este aspecto está se desenvolvendo" },
  { value: 10, label: "Sinto que este aspecto está presente e seguro" }
];
