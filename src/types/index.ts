export type FormatoTorneio =
  | 'eliminatorio'
  | 'grupos_e_mata_mata'
  | 'pontos_corridos'
  | 'dupla_eliminacao'

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

export interface Torneio {
  id: string
  nome: string
  descricao?: string
  esporte: string
  formato: FormatoTorneio
  status: StatusTorneio
  dataInicio: string
  dataFim?: string
  local?: string
  maxDuplas: number
  totalGrupos?: number
  classificadosPorGrupo?: number
  tipoContagem: 'sets' | 'games' | 'pontos' | 'simples'
  jogadores: Jogador[]
  duplas: Dupla[]
  grupos: Grupo[]
  jogos: Jogo[]
  criadoEm: string
  atualizadoEm: string
}
