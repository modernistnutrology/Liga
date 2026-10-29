import type { Temporada, JogadorTemporada, RodadaTemporada, Liga } from '../types'
import { nanoid } from './nanoid'
import { ATRASOS_ANTES_DO_APP, VERSAO_REGRAS_ATUAL } from './temporada'

/** Dados importados da planilha oficial em 2026-10-13. */
const DADOS: { nome: string; liga: Liga; pontos: number; rodadas: number }[] = [
  { nome: 'Marco Paulo',   liga: 'A', pontos: 3000, rodadas: 4 },
  { nome: 'Murillo',       liga: 'A', pontos: 1900, rodadas: 4 },
  { nome: 'Christian',     liga: 'A', pontos: 1600, rodadas: 3 },
  { nome: 'Aruã',          liga: 'A', pontos: 1500, rodadas: 3 },
  { nome: 'André Perly',   liga: 'A', pontos: 1400, rodadas: 3 },
  { nome: 'Conrado',       liga: 'A', pontos: 1300, rodadas: 4 },
  { nome: 'Vinicius',      liga: 'A', pontos: 1200, rodadas: 3 },
  { nome: 'Gabriel Tivo',  liga: 'A', pontos: 1150, rodadas: 2 },
  { nome: 'Lucio',         liga: 'A', pontos: 1000, rodadas: 3 },
  { nome: 'Alexandre',     liga: 'A', pontos: 900,  rodadas: 4 },
  { nome: 'Lucão',         liga: 'A', pontos: 900,  rodadas: 2 },
  { nome: 'Nani',          liga: 'A', pontos: 900,  rodadas: 3 },
  { nome: 'Yuri',          liga: 'A', pontos: 900,  rodadas: 3 },
  { nome: 'Fernando',      liga: 'A', pontos: 750,  rodadas: 2 },
  { nome: 'Hugo',          liga: 'A', pontos: 750,  rodadas: 4 },
  { nome: 'João Negrão',   liga: 'B', pontos: 750,  rodadas: 2 },
  { nome: 'Manfredo',      liga: 'B', pontos: 750,  rodadas: 2 },
  { nome: 'Yamao',         liga: 'A', pontos: 650,  rodadas: 2 },
  { nome: 'Virgilio',      liga: 'B', pontos: 630,  rodadas: 3 },
  { nome: 'João Perly',    liga: 'B', pontos: 600,  rodadas: 3 },
  { nome: 'Lucas',         liga: 'B', pontos: 450,  rodadas: 2 },
  { nome: 'Aurélio',       liga: 'B', pontos: 450,  rodadas: 1 },
  { nome: 'Yabiko',        liga: 'B', pontos: 400,  rodadas: 1 },
  { nome: 'Bruno',         liga: 'B', pontos: 390,  rodadas: 3 },
  { nome: 'Canever',       liga: 'B', pontos: 300,  rodadas: 2 },
  { nome: 'Thiago',        liga: 'B', pontos: 300,  rodadas: 1 },
  { nome: 'Ruben',         liga: 'B', pontos: 300,  rodadas: 1 },
  { nome: 'Junior',        liga: 'B', pontos: 300,  rodadas: 1 },
  { nome: 'Gabriel',       liga: 'B', pontos: 250,  rodadas: 1 },
  { nome: 'Ericles',       liga: 'B', pontos: 250,  rodadas: 1 },
  { nome: 'Matheus',       liga: 'B', pontos: 250,  rodadas: 1 },
  { nome: 'Pedro',         liga: 'B', pontos: 250,  rodadas: 1 },
  { nome: 'Snoop',         liga: 'B', pontos: 250,  rodadas: 1 },
  { nome: 'Toshio',        liga: 'B', pontos: 250,  rodadas: 1 },
  { nome: 'Alisson',       liga: 'B', pontos: 150,  rodadas: 1 },
  { nome: 'Lucas Filho',   liga: 'B', pontos: 90,   rodadas: 1 },
  { nome: 'Italo',         liga: 'B', pontos: 50,   rodadas: 1 },
]

export function criarTemporadaVillageSeed(): Temporada {
  const now = new Date().toISOString()
  const jogadores: JogadorTemporada[] = DADOS.map(d => ({
    id: nanoid(),
    nome: d.nome,
    liga: d.liga,
    rodadasJogadasOverride: d.rodadas,
    atrasosAnteriores: ATRASOS_ANTES_DO_APP[d.nome],
    criadoEm: now,
  }))
  const rodadaImportada: RodadaTemporada = {
    id: nanoid(),
    numero: 1,
    data: now,
    nome: 'Totais acumulados (importado da planilha)',
    pontos: jogadores.map((j, i) => ({ jogadorId: j.id, pontos: DADOS[i].pontos })),
    importada: true,
  }
  return {
    id: nanoid(),
    nome: 'Temporada Village — atual',
    rodadasAnteriores: 4,
    versaoRegras: VERSAO_REGRAS_ATUAL,
    jogadores,
    rodadas: [rodadaImportada],
    criadoEm: now,
    atualizadoEm: now,
  }
}
