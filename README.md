# Consulta de Clientes — Winthor + iSA API (Riograndense)

Portal em React (JSX puro) que autentica na API descrita em `docs/openapi.json` e consulta a
**situação cadastral** do cliente no endpoint `GET /clients/situacao` (CPF/CNPJ → Ativo ou
"Inativo ou não encontrado").

## Stack

| Camada     | Tecnologia                                         |
| ---------- | -------------------------------------------------- |
| Build/UI   | Vite 8 + React 19 (JSX, sem TypeScript)            |
| Rotas      | `react-router-dom` 7 (rota privada + redirect)     |
| Token      | `jwt-decode` (claims do JWT)                       |
| Estilo     | Tailwind CSS 4 (`@tailwindcss/vite`)               |
| Qualidade  | `oxlint` + `npm run check` (helpers de `src/lib`)  |

## Funcionalidades

- **Carteira de clientes** com paginação, filtros por nome/código/documento, município e vendedor.
- **Janela de atividade configurável** entre 1 e 365 dias, aplicada à lista e aos detalhes do cliente.
- **Situação cadastral por cliente** sob demanda, incluindo vendedor, cidade, última compra e itens
  com imagem retornados por `/clients/situacao`.
- **Resumo de status** recebido junto com cada cliente e filtro local para ativos e inativos.
- **Mapa interativo por praça ou cidade**, com cores e filtro por `SEQROTA`, busca, zoom,
  enquadramento automático e detalhes ao selecionar um marcador.
- **Busca integrada ao mapa**, interação ativada por clique, zoom pela roda sem rolar a página,
  rótulos adaptativos conforme a escala e resumo de ativos/inativos preparado para a API.
- **Aba de gráficos com Recharts** para situação dos clientes e cidades mais presentes na página atual.
- **Paginação no início e no fim da lista**, com ícones Lucide nos principais controles.
- **Tema escuro fixo** em verde floresta e latão, com layout responsivo para a carteira.
- **Login** em `POST /auth/login` (fluxo OAuth2 password do `securityScheme OAuth2PasswordBearer`,
  `application/x-www-form-urlencoded`, com fallback automático para JSON).
- **Sessão**: token persistido em `localStorage`, decodificado com `jwt-decode`, exibição das claims
  (usuário, perfil, codusur, emissão/expiração), **logout automático no `exp`** do token e logout
  forçado quando a API responde `401/403`.
- **Consulta de situação**: formulário com máscara e validação de CPF/CNPJ, janela de dias
  (1–365, atalhos de 7 a 365 dias), tempo de resposta, status destacado, nome do cliente e
  visualização da **resposta JSON bruta**.
- **Histórico** das últimas 6 consultas (somente no navegador) com reexecução em um clique.
- **Configuração da API em tempo de execução**: campo de URL base + botão "Testar conexão"
  (chama `GET /`), útil para alternar entre local e produção sem recompilar.
- Layout responsivo com Tailwind (painel de marca, cards com blur, animações de entrada).

## Estrutura

```
src/
├─ api/
│  ├─ client.js        # fetch com JSON/query/Bearer + ApiError normalizado (FastAPI detail)
│  ├─ auth.js          # login, logout, /auth/me, ping
│  └─ clients.js       # /clients/situacao, /clients/, /clients/{id}/prestacoes
├─ components/         # AppShell, ProtectedRoute, Alert, Spinner, StatusBadge
├─ context/
│  ├─ auth-context.js  # createContext + useAuth
│  └─ AuthProvider.jsx # estado da sessão, expiração, refresh de /auth/me
├─ lib/
│  ├─ config.js        # URL base da API (VITE_API_URL + override em localStorage)
│  ├─ format.js        # máscara/validação de CPF-CNPJ, formatação e leitura de status
│  ├─ history.js       # histórico local das consultas
│  ├─ jwt.js           # decode, expiração e descrição das claims
│  └─ storage.js       # persistência do token
├─ pages/
│  ├─ LoginPage.jsx
│  ├─ SituacaoPage.jsx
│  └─ NotFoundPage.jsx
├─ App.jsx             # AuthProvider + BrowserRouter + rotas
├─ index.css           # Tailwind 4 (@theme, camadas base, utility card-surface)
└─ main.jsx
```

## Como rodar

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev
```

`.env`:

```env
VITE_API_URL=http://localhost:8000
```

> O `docs/openapi.json` não declara `servers`, então a URL base vem de `VITE_API_URL`
> (padrão `http://localhost:8000`) e também pode ser alterada na tela de login em
> **Configuração da API** — o valor fica salvo no `localStorage`.

## Fluxo de autenticação

1. `POST /auth/login` com `username`/`password` (form-urlencoded) → `access_token`.
2. O token é decodificado por `jwt-decode` e guardado em `localStorage` (`consulta.auth.token`).
3. Toda requisição protegida envia `Authorization: Bearer <token>`.
4. `GET /auth/me` enriquece o cabeçalho (usuário/perfil); `401` encerra a sessão.
5. `POST /auth/logout` é chamado ao sair (best-effort) e o token local é removido.

## Endpoints utilizados

| Método | Rota                 | Uso                                              |
| ------ | -------------------- | ------------------------------------------------ |
| POST   | `/auth/login`        | Autenticação (token)                             |
| GET    | `/auth/me`           | Dados do usuário autenticado                     |
| POST   | `/auth/logout`       | Encerrar sessão no servidor                      |
| GET    | `/clients/situacao`  | **Consulta principal** (`documento`, `dias`)     |
| GET    | `/clients/`          | Carteira com busca, cidade, vendedor e paginação |
| GET    | `/clients/{codcli}`  | Dados cadastrais de um cliente                  |
| GET    | `/mapa/clientes/pracas` | Praças, rotas, coordenadas e totais de clientes |
| GET    | `/mapa/clientes/cidades` | Municípios, coordenadas e totais de clientes   |
| GET    | `/`                  | Teste de conectividade na tela de login          |

O mapa usa as coordenadas fornecidas pela própria API, priorizando a visão por praças. Cada
`SEQROTA` recebe uma cor própria e pode ser isolada pela legenda; a visão por cidades permanece
disponível como alternativa. A cartografia de fundo usa tiles do OpenStreetMap. A lista recebe o
status de cada cliente pelo endpoint `GET /clients/`.

## Scripts

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção
npm run lint     # oxlint
npm run check    # valida máscara de documento, classificação de status e leitura de JWT
npm run preview  # serve o build
```

## Observações

- A API precisa liberar CORS para a origem do front (ou use um proxy no `vite.config.js`).
- Se a API devolver um token opaco (não-JWT), a aplicação continua funcionando: as claims ficam
  vazias e a expiração passa a ser detectada pelas respostas `401`.
- Erros `422` do FastAPI são traduzidos para mensagens legíveis (`campo: mensagem`).
