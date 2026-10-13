export type FormatoTorneio =
  | 'eliminatorio'
  | 'grupos_e_mata_mata'
  | 'pontos_corridos'
  | 'dupla_eliminacao'
  | 'reizinho'
  | 'todos_contra_todos'
  | 'liga_2_fases'

export type StatusJogo = 'aguardando' | 'em_andamento' | 'finalizado' | 'wo'
export type StatusTorneio = 'configurando' | 'em_andamento' | 'finalizado'

export interface Jogador {
  id: string
  nome: string
  apelido?: string
  telefone?: string
  nivel?: 'iniciante' | 'intermediario' | 'avancado'
  criadoEm: string
}

export interface Dupla {
  id: string
  jogador1Id: string
  jogador2Id: string
  nome?: string
  seed?: number
  grupo?: string
  criadoEm: string
}

export interface Jogo {
  id: string
  torneioId: string
  fase: string
  rodada: number
  posicaoChave: number
  dupla1Id: string | null
  dupla2Id: string | null
  placar1?: number
  placar2?: number
  sets1?: number[]
  sets2?: number[]
  vencedorId?: string
  status: StatusJogo
  dataHora?: string
  observacao?: string
}

export interface Grupo {
  id: string
  nome: string
  duplas: string[]
}

/** Uma "rodada" (etapa semanal) de uma Liga por Temporada. Congela a pontuação da rodada finalizada. */
export interface EtapaHistorico {
  numero: number
  data: string
  pontuacao: {
    jogadorId: string
    nome?: string
    apelido?: string
    pontos: number
    origem: string
    posicaoFinal?: number
  }[]
}

/** Temporada da Liga Village — Liga A/B com ranking acumulado por rodadas. */
export type Liga = 'A' | 'B'

export interface JogadorTemporada {
  id: string
  nome: string
  liga: Liga
  /** Opcional: sobrescreve a contagem de rodadas jogadas (usado em dados importados). */
  rodadasJogadasOverride?: number
  criadoEm: string
}

export interface JogoRodada {
  id: string
  fase: string // nome do grupo ou 'Fase Final'
  rodadaRotacao: number // 1, 2, 3
  dupla: [string, string]       // jogadorIds
  dupla2: [string, string]      // jogadorIds
  placar1?: number
  placar2?: number
  finalizado: boolean
}

export interface RodadaEstruturada {
  liga: Liga
  jogadoresIds: string[] // 8 ou 12 jogadores
  /** 2 ou 3 grupos de 4 jogadores (nova estrutura) */
  grupos?: string[][]
  /** @deprecated usar grupos. Mantido para rodadas antigas. */
  grupoA?: string[]
  /** @deprecated usar grupos. Mantido para rodadas antigas. */
  grupoB?: string[]
  jogos: JogoRodada[]
  faseFinalIds?: string[] // 4 classificados para Fase Final
  finalizada: boolean
}

export interface RodadaTemporada {
  id: string
  numero: number
  data: string
  nome?: string
  /** Pontuação da rodada por jogador */
  pontos: { jogadorId: string; pontos: number }[]
  /** Opcional: se true, foi criada/jogada no app (não manual) */
  estruturada?: RodadaEstruturada
  /** Bloco de totais importado da planilha; representa as rodadas anteriores ao app. */
  importada?: boolean
}

export interface Temporada {
  id: string
  nome: string
  /** Rodadas já disputadas antes de começar a usar o app (contidas na rodada importada). */
  rodadasAnteriores?: number
  jogadores: JogadorTemporada[]
  rodadas: RodadaTemporada[]
  criadoEm: string
  atualizadoEm: string
}

export interface Torneio {
  id: string
  nome: string
  descricao?: string
  /** Rodadas anteriores já encerradas (só para formato liga_2_fases usado como temporada) */
  etapasFinalizadas?: EtapaHistorico[]
  esporte: string
  formato: FormatoTorneio
  status: StatusTorneio
  dataInicio: string
  dataFim?: string
  local?: string
  maxDuplas: number
  totalGrupos?: number
  classificadosPorGrupo?: number
  jogadoresPorGrupo?: number  // usado no formato "reizinho"
  tipoContagem: 'sets' | 'games' | 'pontos' | 'simples'
  jogadores: Jogador[]
  duplas: Dupla[]
  grupos: Grupo[]
  jogos: Jogo[]
  criadoEm: string
  atualizadoEm: string
}
