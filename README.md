# TradeLog

Journal local de day trade (mini dólar) para registrar as operações do dia, acompanhar a performance e **simular um teste de mesa proprietária**.

Roda inteiramente na sua máquina: o banco de dados é um arquivo SQLite local e **nada é enviado para a nuvem**.

## Recursos

- **Dashboard** — resultado líquido, taxa de acerto, profit factor, payoff, sequência, drawdown, curva de capital, desempenho por módulo e por direção e calendário de resultados.
- **Histórico** — lista do mês com filtros, edição e exclusão.
- **Journal** — revisão do contexto e das anotações de cada dia.
- **Simulador de teste de mesa proprietária** — recalcula as operações já registradas com outro número de contratos e outra banca inicial. Escolha a fonte de dados (todas as operações ou meses específicos), defina a meta do teste e os limites de perda, e veja se você passaria. A simulação encerra no momento da decisão (aprovação ou reprovação) e é somente leitura: não altera o journal.
- **Configurações** — valor por contrato, meta diária, limite de perda diária e banca.

## Requisitos

- **Node.js 24 ou superior** — obrigatório: o backend usa o módulo nativo `node:sqlite` (`DatabaseSync`), sem flag experimental.
- Windows, macOS ou Linux.

## Como rodar

### Windows (mais simples)

Dê um duplo clique em **`iniciar.bat`**. Ele instala as dependências na primeira vez, sobe backend e frontend e abre o navegador.

### macOS / Linux (ou manualmente)

```bash
npm run install:all   # instala as dependências da raiz, do servidor e do frontend
npm run dev           # sobe Fastify (porta 3001) + Vite (porta 5173)
```

Depois abra **http://localhost:5173**.

Outros comandos (a partir da raiz):

```bash
npm run typecheck     # verificação de tipos (server + web)
npm run build         # build dos dois pacotes
```

Para trabalhar em um pacote só: `npm --prefix server run <script>` ou `npm --prefix web run <script>`.

## Onde ficam os meus dados

Tudo é local:

- O banco é criado automaticamente na primeira execução em **`server/tradelog.db`** (SQLite, modo WAL).
- Os dados **nunca saem da sua máquina** — não há login, servidor na nuvem nem telemetria.
- **Backup**: use **Exportar banco** no menu lateral para baixar um arquivo `.db` completo (funciona com o app aberto). Também é possível, com o servidor parado, copiar `server/tradelog.db` manualmente.
- **Restaurar**: com o app parado, substitua `server/tradelog.db` pelo arquivo exportado e apague `server/tradelog.db-wal` e `server/tradelog.db-shm` antigos antes de iniciar.
- Para começar do zero, apague o arquivo (ele é recriado no próximo boot) ou use *Configurações → Apagar todas as operações*.

> O arquivo do banco está no `.gitignore`. Se você for contribuir, cuidado para não commitar seus dados.

## Estrutura

```
server/   API Fastify 5 + SQLite (node:sqlite), TypeScript ESM
web/      SPA React 19 + Vite + Tailwind v4
```

- O backend escuta em `127.0.0.1:3001` e todas as rotas ficam sob `/api`.
- O Vite (porta 5173) faz proxy de `/api` para o backend, então o front sempre chama caminhos relativos.
- O build do front é estático, mas o app depende da API local — não é possível usá-lo hospedado sem rodar o backend.

## Licença

MIT — veja [LICENSE](./LICENSE).
