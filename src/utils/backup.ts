import type { Torneio, Temporada } from '../types'

const APP_ID = 'liga-village-padel'
const VERSAO = 1

export interface BackupDados {
  app: typeof APP_ID
  versao: number
  geradoEm: string
  torneios: Torneio[]
  temporadas: Temporada[]
}

export async function exportarBackup(torneios: Torneio[], temporadas: Temporada[]): Promise<'compartilhado' | 'baixado' | 'cancelado'> {
  const dados: BackupDados = {
    app: APP_ID,
    versao: VERSAO,
    geradoEm: new Date().toISOString(),
    torneios,
    temporadas,
  }
  const json = JSON.stringify(dados, null, 2)
  const filename = `backup_liga_village_${new Date().toISOString().slice(0, 10)}.json`
  const file = new File([json], filename, { type: 'application/json' })

  const nav = navigator as any
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: 'Backup Liga Village' })
      return 'compartilhado'
    } catch (e: any) {
      if (e?.name === 'AbortError') return 'cancelado'
    }
  }

  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'baixado'
}

export async function lerBackup(file: File): Promise<BackupDados> {
  const texto = await file.text()
  let dados: any
  try {
    dados = JSON.parse(texto)
  } catch {
    throw new Error('Arquivo inválido (não é JSON).')
  }
  if (dados?.app !== APP_ID || !Array.isArray(dados.torneios) || !Array.isArray(dados.temporadas)) {
    throw new Error('Este arquivo não é um backup da Liga Village.')
  }
  return dados as BackupDados
}
