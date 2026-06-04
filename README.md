# Liga Village Padel Club — Torneios

App web para gerenciamento de ligas e torneios com duplas: cadastro de jogadores, sorteio de duplas, chaveamento visual, lançamento de resultados e tabela de classificação.

## Stack

- React + Vite + TypeScript
- Tailwind CSS — paleta teal + dourado (identidade Village Padel Club)
- Zustand com persist em `localStorage` (sem backend)
- React Router v6
- lucide-react (ícones)

## Funcionalidades

- Múltiplos formatos: Eliminatório, Dupla Eliminação, Pontos Corridos, Grupos + Mata-mata
- Sorteio automático de duplas com animação slot-machine
- Geração automática do bracket respeitando seeds
- Avanço automático do vencedor + suporte a BYEs
- Lançamento de resultado (placar simples, sets, W.O.)
- Tabela de classificação com critérios de desempate
- 100% client-side — todos os dados persistidos em `localStorage`

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy (Vercel)

`vercel.json` já está configurado para SPA routing. Conecte o repo em [vercel.com](https://vercel.com) e o deploy é automático.
