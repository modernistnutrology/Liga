export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sortearDuplas<T>(jogadores: T[]): [T, T][] {
  const shuffled = shuffleArray(jogadores)
  const duplas: [T, T][] = []
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    duplas.push([shuffled[i], shuffled[i + 1]])
  }
  return duplas
}

export function distribuirEmGrupos<T>(items: T[], numGrupos: number): T[][] {
  const grupos: T[][] = Array.from({ length: numGrupos }, () => [])
  const shuffled = shuffleArray(items)
  shuffled.forEach((item, i) => {
    grupos[i % numGrupos].push(item)
  })
  return grupos
}
