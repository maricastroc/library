# Entrelinhas

Estante digital para livrarias independentes. O visitante descreve o que quer sentir ("algo melancólico, mas reconfortante") e a estante reorganiza as lombadas, explica por que cada livro foi indicado e abre o livro escolhido. A IA é aberta e roda neste computador, via Ollama.

## Rodar

Requisitos: Node 22+, [Ollama](https://ollama.com) com os modelos `embeddinggemma` e `gemma4:e4b`.

```bash
ollama pull embeddinggemma && ollama pull gemma4:e4b
npm install
cp .env.example .env.local
npm run db:seed -- --complete --notes
npm run ai:enrich
npm run dev
```

Edite `.env.local` antes de subir: `ADMIN_PASSWORD` (8+ caracteres) e `SESSION_SECRET` (24+ caracteres) protegem o balcão em `/admin`.

O catálogo inicial já está em `data/seed/catalog.json`. Para refazer a coleta na Open Library e na Wikipédia: `npm run catalog:fetch`.

## Comandos

| comando | o que faz |
| --- | --- |
| `npm run dev` | aplicação em desenvolvimento |
| `npm run build && npm start` | versão de produção |
| `npm test` | testes automatizados |
| `npm run lint` · `npm run typecheck` | verificações estáticas |
| `npm run db:seed` | carrega o catálogo inicial (`--complete` inclui livros sem sinopse; `--notes` aplica as notas de exemplo; `--refresh-meta` atualiza dados bibliográficos) |
| `npm run ai:enrich` | embeddings e classificação dos livros pendentes (`--all` refaz tudo; `--retry` refaz os que falharam) |
| `npm run ai:eval -- --judge` | compara busca por palavras e busca semântica; grava `data/eval/REPORT.md` e `data/eval/results.json` |

## Onde está cada coisa

| caminho | responsabilidade |
| --- | --- |
| `src/lib/catalog` | livros, ISBN, importação CSV |
| `src/lib/semantic` | taxonomia, cliente Ollama, classificação, embeddings, fila de enriquecimento |
| `src/lib/search` | interpretação da consulta, busca lexical, busca semântica, justificativas |
| `src/lib/shelf` | regras visuais das lombadas, ordenação e layout da estante |
| `src/lib/shop`, `src/lib/showcase`, `src/lib/interest`, `src/lib/auth` | configuração da livraria, vitrines, reservas, sessão do balcão |
| `src/lib/db` | conexão SQLite, esquema e migrações |
| `src/components/shelf`, `src/components/book`, `src/components/showcase` | experiência pública: estante, livro aberto, vitrine |
| `src/components/admin`, `src/app/admin` | balcão da livraria |
| `scripts` | coleta do catálogo, carga, enriquecimento, avaliação |

O código (arquivos, rotas, funções, valores internos, classes CSS) está em inglês; os textos da interface, os prompts do modelo e os dados do catálogo estão em português.

Decisões de arquitetura e pendências: [DECISIONS.md](DECISIONS.md).
