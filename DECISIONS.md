# Decisões e pendências

## Convenções

- **Código em inglês, conteúdo em português.** Arquivos, rotas, componentes, funções, valores internos (status, ids da taxonomia, chaves de ordenação), classes CSS e tokens do tema estão em inglês. Ficam em português os textos da interface, os prompts enviados ao modelo, os dados do catálogo e os cabeçalhos aceitos na importação CSV. Os rótulos em português de cada id interno vivem em `src/lib/semantic/taxonomy.ts`.
- **Valores gravados também foram traduzidos.** `src/lib/db/migrations.ts` converte um banco anterior (versão 1) para o vocabulário atual (versão 2) na abertura.

## Arquitetura

- **Next.js 16 (App Router) + SQLite (`better-sqlite3`)**. Leitura do catálogo em Server Components; escrita por Server Actions e rotas `/api/admin/*`. Sem serviços pagos.
- **SQLite em modo de journal `TRUNCATE`, não WAL.** Em WAL, scripts de linha de comando fechando a conexão apagaram o `-wal` enquanto o servidor de desenvolvimento o mantinha aberto; as gravações do servidor ficaram num arquivo órfão. Com journal simples, cada transação termina no arquivo principal.
- **Vetores em BLOB e busca por força bruta em memória.** Com 200 livros (≈2.100 vetores de 768 dimensões, entre livros e frases de sinopse) a comparação leva milissegundos; um índice vetorial só acrescentaria dependência. O índice em memória é invalidado por um contador de revisão gravado no banco.
- **Módulos de servidor nunca são importados por componentes de cliente.** Constantes compartilhadas ficam em módulos puros (`import-types.ts`, `palettes.ts`, `taxonomy.ts`).

## IA

- **Embeddings: `embeddinggemma` (768d). Classificação: `gemma4:e4b`.** Ambos locais, via Ollama.
- **O modelo de linguagem trabalha fora do caminho da consulta.** Ele lê cada sinopse uma vez e grava atmosfera, ritmo, densidade, estilo, experiência, temas e um retrato de leitura. A busca usa só embeddings e regras, e responde em dezenas de milissegundos.
- **Saída do classificador sem `format`/schema.** Medido nesta máquina: JSON restrito por schema gera ~7 tokens/s e não escala em paralelo; texto livre com quatro requisições simultâneas chega a ~25 tokens/s. A validação é feita no código.
- **Evidência verificada.** O classificador precisa citar trechos da sinopse; cada trecho é localizado literalmente no texto (ignorando acentos e caixa) e descartado se não existir. A confiança exibida depende do tamanho da sinopse e de quantos trechos sobreviveram.
- **Sinopse com menos de 140 caracteres não é classificada.** O livro fica em papel pardo e só é encontrado por palavras.
- **Busca**: a consulta é separada em pedido e restrição ("mas sem ser…", "que não seja…", "nada muito…"); o pedido vira vetor e é comparado com o vetor da sinopse e com o vetor da leitura de cada livro; a ordem final soma atributos pedidos, penaliza atributos evitados e considera extensão, ritmo, gênero e coincidência de palavras. "Para quem gostou de X" usa o centróide dos livros de X que estão no catálogo e exclui os próprios.
- **Quando não responder.** Abaixo de um piso de similaridade a estante não mostra nada; em faixa intermediária mostra no máximo três livros e avisa que a correspondência é fraca. Referência a autor ou livro ausente do catálogo é declarada, sem inventar semelhança. Os limiares foram calibrados com `data/eval/queries.json`.
- **Se o Ollama cair**, a rota de busca devolve resultado por palavras e diz isso na interface.

## Dados

- **Google Books ficou de fora**: a cota anônima diária estava esgotada (HTTP 429) e não há chave configurada.
- **Open Library** fornece ISBN, editora, páginas, ano e capa. Só é aceita edição em português de editora regular; reimpressões sob demanda são descartadas e o campo fica vazio. O ano é o menor entre os registros da mesma obra.
- **Wikipédia em português (CC BY-SA 4.0)** fornece a sinopse: introdução mais a seção de enredo, com atribuição e link em cada livro. O artigo só é aceito se for sobre a obra: o título da página ou a primeira frase precisam trazer o título do livro, e páginas de autor são recusadas. Uma primeira versão sem essa regra gravou biografias como sinopse em cerca de 40 livros; eles foram recoletados e reclassificados.
- **Capas não são baixadas nem redistribuídas**; a página do livro aponta para a imagem da Open Library.
- **Preço e estoque do catálogo inicial são demonstrativos** e aparecem marcados assim. Ao serem editados no balcão ou importados por CSV, passam a valer como reais.
- **Notas da livreira**: as 21 notas do catálogo inicial foram escritas para a demonstração e aparecem como "nota de exemplo". Notas reais vêm do balcão ou do CSV. A IA nunca preenche esse campo.

## Interface

- **Lombadas posicionadas por `transform`, com ordem estável no DOM.** Reordenar muda só coordenadas, então não há remontagem nem perda de foco. A transição é CSS no compositor; lombadas fora da área visível trocam de lugar sem animar.
- **A estante é uma única parada de Tab** (roving tabindex); setas seguem a ordem visual. Como a ordem do DOM não acompanha a ordem visual, há o modo **Índice**, uma lista semântica na ordem escolhida.
- **Regras das lombadas** (`src/lib/shelf/identity.ts`): cor = atmosfera predominante, levemente misturada com a segunda; espessura = páginas; altura = densidade e forma; faixas = ritmo; tipografia = gênero. A cor do texto é escolhida para manter contraste de pelo menos 4,5:1, verificado em teste para todas as combinações.
- **Livro aberto**: `<dialog>` modal nativo. Um volume 3D (lombada e capa) sai da posição medida da lombada, gira e pousa; a capa abre sobre a dobradiça. Motion conduz a coreografia por `MotionValue`. Com `prefers-reduced-motion`, ou quando a lombada de origem não está visível, a transição é um esmaecimento.
- **Estado na URL**: `?q=`, `?sort=` e `?book=`; o botão voltar do navegador fecha o livro.

## Balcão

- Senha única em `ADMIN_PASSWORD`; sessão em cookie `httpOnly` assinado com HMAC, 12 horas. `src/proxy.ts` barra `/admin/*` e `/api/admin/*`, e cada Server Action e rota confere a sessão de novo.
- Importação CSV em duas etapas: análise com prévia e depois gravação em uma transação.

## Pendências

- A avaliação usa um modelo local como juiz de relevância. Falta julgamento humano das mesmas listas.
- 58 dos 326 títulos pesquisados não tinham artigo utilizável na Wikipédia em português (ou só tinham a página do autor, que é recusada). No catálogo de 200 livros, 163 têm ISBN de edição em português e 178 têm capa.
- Sem autenticação por usuário, sem pagamento, sem envio de e-mail: a reserva só registra o pedido para a livraria responder.
- Interpretação de consultas por regras cobre as negações mais comuns do português; construções incomuns passam como texto livre.
- Limite de requisições em memória, por processo.
- Não há testes automatizados de navegador; os fluxos foram verificados manualmente.
