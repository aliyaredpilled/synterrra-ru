
export const TITLES = [
  'КОГНИТИВНОЕ ЯДРО',
  'ПОСТРОЕНИЕ ГРАФА ЗНАНИЙ',
  'МУЛЬТИАГЕНТНАЯ СЕТЬ',
  'КРИСТАЛЛИЗАЦИЯ',
  'АРХИТЕКТУРА КЛАСТЕРА',
  'РОЕВОЙ ИНТЕЛЛЕКТ'
];

// Время полного цикла анимации в секундах
export const LOOP_DURATION = 25;

export const AGENT_NAMES = ['АНАЛИТИК', 'КРИТИК', 'ПЛАНИРОВЩИК', 'ИССЛЕДОВАТЕЛЬ', 'ВАЛИДАТОР'];

export const ACT_1_END = {
  sphereY: 6,
  sphereScale: 1,
  sphereRotationY: Math.PI * 0.5,
  sphereRotationX: 0
};

export const ACT_2_END = {
  sphereY: 0,
  sphereScale: 0.3,
  sphereRotationY: ACT_1_END.sphereRotationY + Math.PI * 0.3,
  graphRotationY: Math.PI * 0.3
};