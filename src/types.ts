/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  classId: string;
  content: string;
  imageUrl?: string;
  likes: string[];
  forces?: string[];
  timestamp: any;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  target: "Todos" | "Alunos" | "Professores";
  targetSpecificUsers?: boolean;
  targetUserIds?: string[];
  likes?: string[];
  forces?: string[];
  lido?: boolean;
  createdBy: string;
  createdAt: any;
}

export type UserRole = "Aluno" | "Professor" | "Gestor" | "Diretor Pedagógico" | "Diretor Pedagógico e Professor" | "Auxiliar Administrativo";

export interface Badge {
  id: string;
  badgeId: string;
  name: string;
  icon: string;
  description: string;
  category?: string;
}

export interface UserBadge {
  id: string;
  badgeId: string;
  name: string;
  icon: string;
  description: string;
  dateReceived: any;
  message: string;
  classId?: string;
}

export interface SchoolEvent {
  id: string;
  titulo: string;
  tipo: "Ensaio" | "Peça" | "Workshop" | "Aula Aberta";
  data: any;
  inicio: string;
  fim: string;
  local: string;
  descricao: string;
  obrigatorio: boolean;
  criadoPor: string;
  lastUpdate: any;
}

export interface ClassFeedback {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className?: string;
  date: any;
  rating: number;
  npsRating?: number;
  expressionScore?: number;
  qualityScore?: number;
  challengeScore?: number;
  comment: string;
  timestamp: any;
}

export interface PedagogicalMeetingRequest {
  id: string;
  studentId: string;
  studentName: string;
  teacherId?: string;
  classId: string;
  className: string;
  status: "pendente" | "em_atendimento" | "concluido";
  createdAt: any;
  updatedAt: any;
}

export interface User {
  id: string;
  name: string;
  socialName?: string;
  pronouns?: string;
  artisticName?: string;
  birthDate?: string;
  email: string;
  role: UserRole;
  cpf: string;
  phone?: string;
  address?: string;
  bank?: string;
  bankAgency?: string;
  bankAccount?: string;
  pixKey?: string;
  cnpj?: string;
  photo?: string;
  createdAt: any;
  updatedAt: any;
  migratedFrom?: string;
  migratedTo?: string;
  inactive?: boolean;
  customMonthlyFee?: number;
}

export interface Class {
  id: string;
  type: string;
  code: string;
  weekday: string;
  time: string;
  startDate: string;
  isActive: boolean;
  inactivationReason?: string;
  teacherIds: string[];
  studentIds: string[];
  enrollmentDates?: Record<string, string>;
  studentPaymentTypes?: Record<string, "Pagante" | "Isento">;
  studentEnrollmentStatuses?: Record<string, "Ativo" | "Trancado" | "Inativo">;
  year: string;
}

export interface Evaluation {
  id: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  classId: string;
  classType?: string;
  month: number;
  year: number;
  notes: Record<string, number>;
  openAnswers: Record<string, string>;
  pedagogicalAnalysis?: {
    status_turma: {
      clima_emocional: string;
      nivel_engajamento: "alto" | "medio" | "baixo";
    };
    pilares_individuais: {
      acolhimento: "baixo" | "medio" | "alto";
      presenca: "baixo" | "medio" | "alto";
      desafio: "baixo" | "medio" | "alto";
      clareza: "baixo" | "medio" | "alto";
      coletividade: "baixo" | "medio" | "alto";
    };
    analise_qualitativa: string;
    alerta_coordenacao: boolean;
  } | null;
  createdAt: any;
  updatedAt?: any;
}

export interface Diary {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  classType: string;
  teacherId: string;
  teacherName: string;
  month: number;
  year: number;
  presences: number;
  absences: number;
  frequencyObs?: string;
  weeklyAttendance?: Record<string, any>;
  grades: Record<string, number | string>;
  unworkedCriteria?: Record<string, boolean>;
  criteriaObs?: Record<string, string>;
  generalPedagogicalObs?: string;
  averageGrade: number;
  status: "rascunho" | "concluido";
  createdAt: any;
  updatedAt: any;
}

export interface EvolutionRecord {
  id: string;
  studentId: string;
  classId: string;
  teacherId: string;
  notes: string;
  createdAt: any;
}

export interface ClassData {
  id?: string;
  code: string;
  type: string;
  teacherIds: string[];
  studentIds: string[];
  isActive: boolean;
  inactivationReason: string;
  year: string;
  weekday: string;
  time: string;
  startDate: string;
}

export interface CourseSyllabusFile {
  name: string;
  url: string; // base64 or download URL
  type?: string;
  size?: number;
  uploadedAt?: string;
}

export interface Course {
  id: string;
  name: string; // "Curso Livre Adultos", "Curso Livre 60+", "Prática Profissional de Montagem", etc.
  description?: string;
  ageGroup?: string; // "Acima de 60 anos", "18 a 59 anos", "Livre", etc.
  monthlyFee?: number; // Valor da mensalidade
  durationType?: "continua" | "meses"; // Contínua ou quantidade de meses
  durationMonths?: number; // Se durationType === "meses"
  syllabusFile?: CourseSyllabusFile | null; // Ementa pedagógica em PDF/doc
  linkedClassIds?: string[]; // IDs das turmas vinculadas a este curso
  createdAt?: any;
  updatedAt?: any;
}

export interface RescheduleRecord {
  previousDate: string;
  newDate: string;
  previousTime?: string;
  newTime?: string;
  reason: string;
  updatedAt: any;
}

export type ExperimentalTriageStatus = 
  | "MATRICULADO" 
  | "AGUARDANDO_RESPOSTA" 
  | "NAO_MATRICULOU" 
  | "NAO_COMPARECEU";

export type ExperimentalAttendanceConfirmation = 
  | "CONFIRMOU_VESPERA" 
  | "CONFIRMOU_NO_DIA" 
  | "REAGENDOU";

export interface ExperimentalClassBooking {
  id: string;
  studentName: string;
  course: string;
  classGroup: string;
  classTime: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  status: "PAGAMENTO_PENDENTE" | "AGENDAMENTO_CONFIRMADO";
  paymentReceiptUrl: string | null;
  rescheduleCount: number;
  rescheduleHistory: RescheduleRecord[];
  createdAt: any;
  updatedAt: any;
  studentEmail?: string;
  studentPhone?: string;
  notes?: string;
  manualConfirmationReason?: string | null;
  createdByUid?: string;
  createdByName?: string;
  createdByRole?: string;
  // Identificador de confirmação de presença (Véspera, No Dia, Reagendou)
  attendanceConfirmation?: ExperimentalAttendanceConfirmation | null;
  attendanceConfirmationUpdatedAt?: any;
  attendanceConfirmationUpdatedByName?: string | null;
  // Triage pós-conclusão de agendamento
  triageStatus?: ExperimentalTriageStatus | null;
  attended?: boolean | null;
  triageNotes?: string | null;
  triageReason?: string | null;
  triagedAt?: any;
  triagedByUid?: string;
  triagedByName?: string;
  triagedByRole?: string;
}

export interface LessonPlanActivity {
  objective: string;
  description: string;
  duration: number; // in minutes
}

export interface Skill {
  id: string;
  name: string;
  definition?: string;
  category?: string;
  courseScope?: "adult" | "professional" | "all";
  active?: boolean;
  createdAt?: any;
}

export interface LessonPlan {
  id?: string;
  teacherId: string;
  teacherName?: string;
  classId: string;
  className?: string;
  classType?: string;
  date: any; // Timestamp or ISO/YYYY-MM-DD
  generalObjective: string;
  skills: string[]; // array of skill IDs or skill names
  activities: LessonPlanActivity[];
  totalDuration?: number; // calculated sum of activities duration
  observations?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type ClassAttendanceStatus = "presente" | "falta" | "justificada";

export interface ClassDailyDiary {
  id?: string;
  classId: string;
  className?: string;
  classCode?: string;
  classType?: string;
  date: string; // YYYY-MM-DD
  teacherId: string;
  teacherName?: string;
  authorRole?: string;
  attendances: Record<string, ClassAttendanceStatus>; // studentId -> status
  studentObservations?: Record<string, string>; // studentId -> individual note
  classComment: string; // Relato da aula / observações confidenciais do professor (NÃO visível para alunos)
  isInternalPedagogicalOnly?: boolean; // Sempre true para proteção adicional
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  justifiedCount: number;
  createdAt?: any;
  updatedAt?: any;
}

export type StageProductionRole = "Professor" | "Diretor" | "Professor/Diretor" | "Outro";
export type StageProductionGenre = "Drama" | "Comédia" | "Musical" | "Dança" | "Mostra de Artes Visuais" | "Outro";
export type PriorityLevel = "Desejável" | "Indispensável";

export interface ProductionNeedItem {
  id: string;
  item: string;
  priority: PriorityLevel;
  indispensableReason?: string;
}

export interface TechnicalDocumentAttachment {
  name: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export type StageProductionStatus = 
  // Fluxo oficial de 10 etapas
  | "formulario_em_preenchimento"      // 1) Formulário em preenchimento
  | "formulario_em_analise"            // 2) Formulário em análise
  | "resultado_analise_disponivel"     // 3) Resultado de análise disponível
  | "em_retificacao"                   // 4) Em retificação
  | "em_planejamento"                  // 5) Em planejamento (Direção de Arte)
  | "em_processo_de_compras"           // 6) Em processo de compras (Planilha de compras)
  | "em_processo_de_entrega_parcial"   // 7) Em processo de entrega parcial
  | "em_processo_de_entrega_final"     // 8) Em processo de entrega final
  | "em_apresentacao"                  // 9) Em apresentação
  | "apresentacao_concluida"           // 10) Apresentação concluída
  // Compatibilidade legada
  | "aguardando_preenchimento"
  | "em_analise_pedagogica"
  | "analise_pedagogica_concluida"
  | "em_analise_artistica"
  | "analise_artistica_concluida"
  | "em_analise_executiva"
  | "projeto_em_execucao"
  | "ajustes_solicitados"
  | "precisa_retificacoes"
  | "rejeitada"
  | "pendente"
  | "em_analise"
  | "aprovada"
  | "aprovado";

export type EvaluationStatus = "APROVADO" | "PRECISA DE RETIFICAÇÕES" | "PENDENTE";

export interface StageProductionDevolutiva {
  status: EvaluationStatus;
  comment?: string;
  evaluatedByUid?: string;
  evaluatedByName?: string;
  evaluatedAt?: string;
}

export interface StageStatusHistoryEntry {
  status: StageProductionStatus;
  statusLabel: string;
  updatedAt: string;
  updatedByUid?: string;
  updatedByName?: string;
  notes?: string;
}

export interface StageProductionProposal {
  id?: string;

  // Informações e Cronograma definidos pelo GESTOR na criação do formulário
  classId?: string;
  className?: string;
  presentationDate?: string; // Data da apresentação
  submissionDeadline?: string; // Data Prazo de submissão do formulário pelo professor
  budgetPurchasesAcquisitions?: number; // Orçamento total da montagem para compras, confecções e aquisições
  budgetLabor?: number; // Orçamento total da montagem para mão-de-obra
  budgetTotal?: number; // Orçamento total da montagem ou apresentação
  pedagogicalArtisticFeedbackDate?: string; // Data de devolutiva da avaliação pedagógica e artística
  rectificationDeadline?: string; // Data de envio de retificação do formulário pelo professor caso haja pendências
  finalApprovalDate?: string; // Data de aprovação final do formulário
  planningMeetingDate?: string; // Data da reunião de planejamento da montagem
  executionPeriod?: string; // Período de execução de compras, aquisições, confecções
  partialDeliveryDate?: string; // Data de entrega dos objetos de cena e/ou cenografia parcial para ensaios e testes
  finalDeliveryDate?: string; // Data de entrega final de todos os itens para montagem/apresentação
  presentationDates?: string; // Datas de apresentação
  createdByGestorId?: string;
  createdByGestorName?: string;

  // Devolutivas da Avaliação
  pedagogicalFeedback?: StageProductionDevolutiva; // Diretor Pedagógico
  artisticFeedback?: StageProductionDevolutiva; // Gestor

  // Seção 1: Dados do Proponente (Professor Responsável)
  proponentName?: string;
  proponentRole?: StageProductionRole;
  proponentEmail?: string;
  proponentPhone?: string;
  proponentUserId?: string;

  // Seção 2: Identificação da Obra
  title?: string;
  genre?: StageProductionGenre;
  synopsis?: string;

  // Seção 3: Proposta Pedagógica e Elenco
  pedagogicalProposal?: string;
  castProfile?: string;

  // Seção 4: Necessidades de Produção (Itens com priorização individual)
  scenographyItems?: ProductionNeedItem[];
  scenographyNotes?: string;

  techItems?: ProductionNeedItem[];
  techNotes?: string;

  otherNeedsItems?: ProductionNeedItem[];
  otherNeedsNotes?: string;

  // Seção: Projetos Técnicos Obrigatórios (PDFs)
  scenographyPdf?: TechnicalDocumentAttachment | null;
  costumePdf?: TechnicalDocumentAttachment | null;
  lightingPdf?: TechnicalDocumentAttachment | null;

  // Seção: Termo de Aceite
  termsAccepted?: boolean;
  termsAcceptedAt?: any;

  // ETAPA 5: Projetos Técnicos e Proposta da Direção de Arte
  artDirectionProposalText?: string;
  artDirectionProjectsPdfs?: TechnicalDocumentAttachment[];
  artDirectionSubmittedAt?: string;
  artDirectionSubmittedByUid?: string;
  artDirectionSubmittedByName?: string;

  // ETAPA 6: Processo de Compras (Planilha de Compras & Finalização pelo Gestor)
  purchasesSpreadsheetAttachment?: TechnicalDocumentAttachment | null;
  purchasesSpreadsheetNotes?: string;
  purchasesCompletedAt?: string;
  purchasesCompletedByUid?: string;
  purchasesCompletedByName?: string;

  // ETAPA 7: Processo de Entrega Parcial (Conclusão pelo Gestor)
  partialDeliveryCompletedAt?: string;
  partialDeliveryCompletedByUid?: string;
  partialDeliveryCompletedByName?: string;
  partialDeliveryNotes?: string;

  // ETAPA 8: Processo de Entrega Final (Conclusão pelo Gestor)
  finalDeliveryCompletedAt?: string;
  finalDeliveryCompletedByUid?: string;
  finalDeliveryCompletedByName?: string;
  finalDeliveryNotes?: string;

  // ETAPAS 9 e 10: Apresentações e Apresentação Concluída
  presentationCompletedAt?: string;
  presentationCompletedByUid?: string;
  presentationCompletedByName?: string;
  presentationCompletedNotes?: string;

  // Metadados e Etapas de Evolução
  status?: StageProductionStatus;
  statusHistory?: StageStatusHistoryEntry[];
  currentStepIndex?: number;
  feedback?: string;
  reviewedByUid?: string;
  reviewedByName?: string;
  reviewedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface FormativeDocument {
  id: string;
  title: string; // Nome do arquivo exibido na página
  fileName: string; // Nome original do arquivo PDF anexado
  fileUrl: string; // Base64 data URL ou URL pública do PDF
  storagePath?: string; // Caminho no Firebase Storage (opcional)
  hasChunks?: boolean; // Se o PDF foi particionado em subcoleção no Firestore
  totalChunks?: number; // Total de partes
  fileSize?: number; // Tamanho em bytes
  fileType?: string; // MIME type (application/pdf)
  category?: string; // Categoria do documento (Diretrizes, Formação, etc.)
  description?: string; // Descrição / orientações
  uploadedBy: string; // ID do usuário que enviou
  uploadedByName: string; // Nome do usuário que enviou
  uploadedByRole?: string; // Cargo do usuário que enviou
  createdAt: any; // Timestamp do Firestore
  updatedAt?: any;
}


