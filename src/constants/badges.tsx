import React from 'react';
import { 
  Star, 
  Award, 
  UserCheck, 
  Zap, 
  MessageSquare, 
  Search, 
  Music, 
  Heart,
  Briefcase,
  Users
} from 'lucide-react';

export interface BadgeDefinition {
  badgeId: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  defaultMessage: string;
}

export const BADGES: BadgeDefinition[] = [
  {
    badgeId: 'presenca-vip',
    name: 'Presença VIP',
    description: 'Frequente 100% das aulas no mês para conquistar este selo de compromisso.',
    icon: <UserCheck className="w-8 h-8" />,
    defaultMessage: 'Construir uma carreira no teatro começa com o compromisso. Você esteve presente em 100% das aulas este mês. Parabéns pela disciplina!'
  },
  {
    badgeId: 'rato-de-coxia',
    name: 'Rato de Coxia',
    description: 'Seja proativo e ajude na organização e bastidores para ganhar este selo.',
    icon: <Briefcase className="w-8 h-8" />,
    defaultMessage: 'O espetáculo não acontece só no palco. O seu apoio e proatividade nos bastidores foram fundamentais hoje. Obrigado por fortalecer o grupo!'
  },
  {
    badgeId: 'curinga-cenico',
    name: 'Curinga Cênico',
    description: 'Arrisque-se em papéis diferentes e saia da sua zona de conforto para conquistar este selo.',
    icon: <Zap className="w-8 h-8" />,
    defaultMessage: 'Sua versatilidade brilhou! Você se desafiou fora da zona de conforto e entregou uma performance surpreendente. Continue explorando seus limites.'
  },
  {
    badgeId: 'escuta-ativa',
    name: 'Escuta Ativa',
    description: 'Demonstre conexão profunda e escuta real com seus parceiros de cena.',
    icon: <Users className="w-8 h-8" />,
    defaultMessage: 'No teatro, saber ouvir é tão importante quanto saber falar. Sua conexão e presença com seus colegas de cena foram o destaque da aula.'
  },
  {
    badgeId: 'critico-de-arte',
    name: 'Crítico de Arte',
    description: 'Avalie todas as aulas do mês para obter',
    icon: <Search className="w-8 h-8" />,
    defaultMessage: 'Sua visão analítica enriquece nossa escola. Obrigado por compartilhar sua percepção e ajudar a elevar o nível do nosso debate artístico.'
  },
  {
    badgeId: 'embaixador-da-arte',
    name: 'Embaixador da Arte',
    description: 'Demonstre paixão pela escola e ajude nossa comunidade a crescer com indicações.',
    icon: <Heart className="w-8 h-8" />,
    defaultMessage: 'Sua paixão pelo teatro transbordou a sala de aula. Obrigado por indicar nossa escola e ajudar a nossa comunidade a crescer!'
  }
];
