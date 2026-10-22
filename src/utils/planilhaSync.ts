import type { Temporada } from '../types'
import { calcularRankingTemporada, rotuloRodada, pontosLiquidosNaRodada, atrasouNaRodada } from './temporada'

export interface PlanilhaConfig {
  url: string
  senha: string
  automatico: boolean
}

export const CODIGO_APPS_SCRIPT = `const SENHA = 'COLOQUE_A_MESMA_SENHA_DO_APP';
const NOME_ABA = 'App';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const dados = JSON.parse(e.postData.contents);
    if (dados.senha !== SENHA) return resposta({ ok: false, erro: 'Senha incorreta' });

    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    const aba = planilha.getSheetByName(NOME_ABA) || planilha.insertSheet(NOME_ABA);
    aba.clear();

    aba.getRange(1, 1).setValue(dados.titulo).setFontWeight('bold').setFontSize(14);
    aba.getRange(2, 1).setValue(dados.subtitulo).setFontColor('#666666');

    const tabela = [dados.cabecalho].concat(dados.linhas);
    aba.getRange(4, 1, tabela.length, dados.cabecalho.length).setValues(tabela);
    aba.getRange(4, 1, 1, dados.cabecalho.length).setFontWeight('bold').setBackground('#062a32').setFontColor('#facc15');
    aba.setFrozenRows(4);
    aba.autoResizeColumns(1, dados.cabecalho.length);

    return resposta({ ok: true, linhas: dados.linhas.length });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
`

export function montarTabelaPlanilha(t: Temporada) {
  // Liga A e Liga B da mesma rodada compartilham o número e viram uma coluna só
  const importadas = t.rodadas.filter(r => r.importada)
  const numeros = [...new Set(t.rodadas.filter(r => !r.importada).map(r => r.numero))].sort((a, b) => a - b)
  const colunas = [
    ...importadas.map(r => ({ titulo: rotuloRodada(t, r).replace(/^Rodadas? /, 'R'), rodadas: [r] })),
    ...numeros.map(n => ({ titulo: `R${n}`, rodadas: t.rodadas.filter(r => !r.importada && r.numero === n) })),
  ]
  const cabecalho = ['Pos.', 'Jogador', 'Liga', 'Rodadas jogadas', 'Atrasos', 'Total', ...colunas.map(c => c.titulo)]
  const linhas = calcularRankingTemporada(t).map(l => [
    l.pos,
    l.jogador.nome,
    l.jogador.liga,
    l.rodadasJogadas,
    l.atrasos || '',
    l.pontos,
    ...colunas.map(c => {
      const jogou = c.rodadas.some(r => r.pontos.some(p => p.jogadorId === l.jogador.id && p.pontos > 0) || atrasouNaRodada(r, l.jogador.id))
      return jogou ? c.rodadas.reduce((soma, r) => soma + pontosLiquidosNaRodada(r, l.jogador.id), 0) : ''
    }),
  ])
  return {
    titulo: `${t.nome} — Classificação geral (app)`,
    subtitulo: `Atualizado pelo app em ${new Date().toLocaleString('pt-BR')}. Não editar: esta aba é reescrita a cada envio.`,
    cabecalho,
    linhas,
  }
}

export async function enviarParaPlanilha(config: PlanilhaConfig, t: Temporada): Promise<void> {
  const corpo = JSON.stringify({ senha: config.senha, ...montarTabelaPlanilha(t) })
  let resp: Response
  try {
    // text/plain evita o preflight CORS, que o Apps Script não responde
    resp = await fetch(config.url.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: corpo,
      redirect: 'follow',
    })
  } catch {
    throw new Error('Sem conexão com a planilha. Confira a internet e o link do script.')
  }
  let json: any
  try {
    json = await resp.json()
  } catch {
    throw new Error('O link não respondeu como o script esperado. Confira se publicou como "Qualquer pessoa".')
  }
  if (!json?.ok) throw new Error(json?.erro || 'A planilha recusou os dados.')
}
