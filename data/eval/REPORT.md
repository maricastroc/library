# Avaliação da busca — palavras × semântica

Gerado em 2026-10-13T16:27:08.750Z. Embeddings: `embeddinggemma`. Classificador: `gemma4:e4b`. Sem notas de relevância (rode com --judge).

- **palavras** (`lexical`): FTS5/BM25 sobre título, autor, gênero, sinopse e nota, com prefixos.
- **só embeddings** (`embedding`): proximidade entre a consulta e a sinopse.
- **estante** (`full`): interpretação da consulta, embeddings de sinopse e de leitura, reordenação por atributos.

## Resumo

| motor | P@5 | nDCG@5 | consultas sem resultado |
| --- | --- | --- | --- |
| palavras | — | — | 1 de 24 |
| só embeddings | — | — | 1 de 24 |
| estante | — | — | 1 de 24 |

nDCG@5 por tipo de consulta:

| tipo | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| emocional | — | — | — |
| abstrata | — | — | — |
| autor | — | — | — |
| negativa | — | — | — |
| ambígua | — | — | — |

Consultas fora do escopo recusadas ou sinalizadas como fracas: 4 de 4. Consultas dentro do escopo respondidas com confiança: 23 de 23.

## Consultas

### emo-1 · emocional — «quero algo melancólico, mas reconfortante»

Confiança: **high** (maior similaridade com sinopse 0.3108, com leitura 0.525). Leitura do pedido: `{"atmospheres":["melancholic","comforting"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Memorial de Aires — Machado de Assis | Memorial de Aires — Machado de Assis | Kitchen — Banana Yoshimoto |
| 2 | — | Perto do Coração Selvagem — Clarice Lispector | Memorial de Aires — Machado de Assis |
| 3 | — | O Vermelho e o Negro — Stendhal | O Pequeno Príncipe — Antoine de Saint-Exupéry |
| 4 | — | Sentimento do Mundo — Carlos Drummond de Andrade | Dona Flor e Seus Dois Maridos — Jorge Amado |
| 5 | — | O Encontro Marcado — Fernando Sabino | Reparação — Ian McEwan |

### emo-2 · emocional — «preciso de um livro que me faça rir»

Confiança: **high** (maior similaridade com sinopse 0.3732, com leitura 0.4525). Leitura do pedido: `{"atmospheres":["ironic"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Auto da Compadecida — Ariano Suassuna | O Cheiro do Ralo — Lourenço Mutarelli | O Cheiro do Ralo — Lourenço Mutarelli |
| 2 | Torto Arado — Itamar Vieira Junior | Uma Aprendizagem ou O Livro dos Prazeres — Clarice Lispector | O Guia do Mochileiro das Galáxias — Douglas Adams |
| 3 | Urupês — Monteiro Lobato | O Alienista — Machado de Assis | Auto da Compadecida — Ariano Suassuna |
| 4 | — | O Nome da Rosa — Umberto Eco | Memórias de um Sargento de Milícias — Manuel Antônio de Almeida |
| 5 | — | O Guia do Mochileiro das Galáxias — Douglas Adams | O Barão nas Árvores — Italo Calvino |

### emo-3 · emocional — «algo para ler quando o coração está partido»

Confiança: **high** (maior similaridade com sinopse 0.4395, com leitura 0.4878). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":["melancholic","comforting"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Perto do Coração Selvagem — Clarice Lispector | Perto do Coração Selvagem — Clarice Lispector | Dias de Abandono — Elena Ferrante |
| 2 | Coração das Trevas — Joseph Conrad | A Hora da Estrela — Clarice Lispector | Perto do Coração Selvagem — Clarice Lispector |
| 3 | Feliz Ano Novo — Rubem Fonseca | A Paixão segundo G.H. — Clarice Lispector | Kitchen — Banana Yoshimoto |
| 4 | O Cão dos Baskervilles — Arthur Conan Doyle | Uma Aprendizagem ou O Livro dos Prazeres — Clarice Lispector | A Hora da Estrela — Clarice Lispector |
| 5 | Amor de Perdição — Camilo Castelo Branco | Crônica da Casa Assassinada — Lúcio Cardoso | Uma Aprendizagem ou O Livro dos Prazeres — Clarice Lispector |

### emo-4 · emocional — «uma história que dê esperança»

Confiança: **high** (maior similaridade com sinopse 0.3698, com leitura 0.3191). Leitura do pedido: `{"atmospheres":["luminous"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Grandes Esperanças — Charles Dickens | Grandes Esperanças — Charles Dickens | O Alquimista — Paulo Coelho |
| 2 | Ninguém Escreve ao Coronel — Gabriel García Márquez | Ensaio sobre a Lucidez — José Saramago | Tenda dos Milagres — Jorge Amado |
| 3 | O Grande Gatsby — F. Scott Fitzgerald | Felicidade Clandestina — Clarice Lispector | O Hobbit — J. R. R. Tolkien |
| 4 | Quincas Borba — Machado de Assis | A Hora da Estrela — Clarice Lispector | Sapiens: Uma Breve História da Humanidade — Yuval Noah Harari |
| 5 | Bestiário — Julio Cortázar | Feliz Ano Novo — Rubem Fonseca | A Cidade e as Serras — Eça de Queirós |

### emo-5 · emocional — «quero um livro que me tire o sono de tanto suspense»

Confiança: **high** (maior similaridade com sinopse 0.3902, com leitura 0.5088). Leitura do pedido: `{"atmospheres":["tense"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | O Lobo da Estepe — Hermann Hesse | As Intermitências da Morte — José Saramago | Assassinato no Expresso do Oriente — Agatha Christie |
| 2 | Leite Derramado — Chico Buarque | O Falcão Maltês — Dashiell Hammett | O Falcão Maltês — Dashiell Hammett |
| 3 | O Vampiro de Curitiba — Dalton Trevisan | O Lobo da Estepe — Hermann Hesse | Agosto — Rubem Fonseca |
| 4 | Pedro Páramo — Juan Rulfo | Ópera dos Mortos — Autran Dourado | O Cão dos Baskervilles — Arthur Conan Doyle |
| 5 | O Conto da Aia — Margaret Atwood | Agosto — Rubem Fonseca | A Sangue Frio — Truman Capote |

### abs-1 · abstrata — «algo que pareça uma tarde chuvosa»

Confiança: **high** (maior similaridade com sinopse 0.3293, com leitura 0.3955). Leitura do pedido: `{"atmospheres":["melancholic","contemplative"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":"slow","length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Ensaio sobre a Lucidez — José Saramago | Ensaio sobre a Lucidez — José Saramago | Em Busca do Tempo Perdido — Marcel Proust |
| 2 | A Divina Comédia — Dante Alighieri | O Tempo e o Vento — Erico Verissimo | Mrs. Dalloway — Virginia Woolf |
| 3 | O Alienista — Machado de Assis | Eles Eram Muitos Cavalos — Luiz Ruffato | As Ondas — Virginia Woolf |
| 4 | Feliz Ano Novo — Rubem Fonseca | Mrs. Dalloway — Virginia Woolf | A Hora da Estrela — Clarice Lispector |
| 5 | Mar Morto — Jorge Amado | O Quinze — Rachel de Queiroz | Senhora — José de Alencar |

### abs-2 · abstrata — «um livro com cheiro de casa de vó»

Confiança: **high** (maior similaridade com sinopse 0.5045, com leitura 0.4545). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":["nostalgic","comforting"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | O Cheiro do Ralo — Lourenço Mutarelli | O Cheiro do Ralo — Lourenço Mutarelli | Gabriela, Cravo e Canela — Jorge Amado |
| 2 | Crônica da Casa Assassinada — Lúcio Cardoso | O Perfume — Patrick Süskind | Leite Derramado — Chico Buarque |
| 3 | A Amiga Genial — Elena Ferrante | Leite Derramado — Chico Buarque | O Perfume — Patrick Süskind |
| 4 | O Perfume — Patrick Süskind | Viva o Povo Brasileiro — João Ubaldo Ribeiro | Dona Flor e Seus Dois Maridos — Jorge Amado |
| 5 | Um Copo de Cólera — Raduan Nassar | Crônica da Casa Assassinada — Lúcio Cardoso | O Cheiro do Ralo — Lourenço Mutarelli |

### abs-3 · abstrata — «uma história curta que me deixe pensando por dias»

Confiança: **high** (maior similaridade com sinopse 0.3892, com leitura 0.3545). Leitura do pedido: `{"atmospheres":["contemplative"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":"short","era":null,"genres":["Contos","Novela"],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Auto da Compadecida — Ariano Suassuna | Dias de Abandono — Elena Ferrante | Laços de Família — Clarice Lispector |
| 2 | O Apanhador no Campo de Centeio — J. D. Salinger | Teoria Geral do Esquecimento — José Eduardo Agualusa | Felicidade Clandestina — Clarice Lispector |
| 3 | — | Mrs. Dalloway — Virginia Woolf | A Paixão segundo G.H. — Clarice Lispector |
| 4 | — | A Paixão segundo G.H. — Clarice Lispector | Mrs. Dalloway — Virginia Woolf |
| 5 | — | Memorial de Maria Moura — Rachel de Queiroz | Estorvo — Chico Buarque |

### abs-4 · abstrata — «um livro para ler devagar, saboreando cada frase»

Confiança: **high** (maior similaridade com sinopse 0.4024, com leitura 0.5452). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":["contemplative"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":"slow","length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Vidas Secas — Graciliano Ramos | Ensaio sobre a Cegueira — José Saramago | Em Busca do Tempo Perdido — Marcel Proust |
| 2 | A Paixão segundo G.H. — Clarice Lispector | Uma Aprendizagem ou O Livro dos Prazeres — Clarice Lispector | Água Viva — Clarice Lispector |
| 3 | As Ondas — Virginia Woolf | As Intermitências da Morte — José Saramago | As Ondas — Virginia Woolf |
| 4 | As Intermitências da Morte — José Saramago | Eles Eram Muitos Cavalos — Luiz Ruffato | Os Vestígios do Dia — Kazuo Ishiguro |
| 5 | O Senhor dos Anéis — J. R. R. Tolkien | A Paixão segundo G.H. — Clarice Lispector | Perto do Coração Selvagem — Clarice Lispector |

### abs-5 · abstrata — «um livro que pareça um sonho estranho»

Confiança: **high** (maior similaridade com sinopse 0.4282, com leitura 0.4688). Leitura do pedido: `{"atmospheres":["unsettling","dreamlike"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | O Alquimista — Paulo Coelho | Não Verás País Nenhum — Ignácio de Loyola Brandão | Macunaíma — Mário de Andrade |
| 2 | O Estrangeiro — Albert Camus | Os Despossuídos — Ursula K. Le Guin | O Jogo da Amarelinha — Julio Cortázar |
| 3 | O Cortiço — Aluísio Azevedo | O Alienista — Machado de Assis | Não Verás País Nenhum — Ignácio de Loyola Brandão |
| 4 | O Vendedor de Passados — José Eduardo Agualusa | Incidente em Antares — Erico Verissimo | A Vegetariana — Han Kang |
| 5 | A Revolução dos Bichos — George Orwell | As Intermitências da Morte — José Saramago | As Intermitências da Morte — José Saramago |

### aut-1 · autor — «livros para quem gostou de Clarice Lispector»

Confiança: **high** (maior similaridade com sinopse 0.6232, com leitura 0.3923). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":["comforting","intense"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":"Clarice Lispector"}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Perto do Coração Selvagem — Clarice Lispector | Felicidade Clandestina — Clarice Lispector | Mrs. Dalloway — Virginia Woolf |
| 2 | Uma Aprendizagem ou O Livro dos Prazeres — Clarice Lispector | Uma Aprendizagem ou O Livro dos Prazeres — Clarice Lispector | Grande Sertão: Veredas — João Guimarães Rosa |
| 3 | Água Viva — Clarice Lispector | Laços de Família — Clarice Lispector | Estorvo — Chico Buarque |
| 4 | A Paixão segundo G.H. — Clarice Lispector | Água Viva — Clarice Lispector | As Meninas — Lygia Fagundes Telles |
| 5 | Laços de Família — Clarice Lispector | Perto do Coração Selvagem — Clarice Lispector | Em Busca do Tempo Perdido — Marcel Proust |

### aut-2 · autor — «algo no estilo de Gabriel García Márquez»

Confiança: **high** (maior similaridade com sinopse 0.4448, com leitura 0.3995). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":["unsettling"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":"Gabriel García Márquez"}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Cem Anos de Solidão — Gabriel García Márquez | Cem Anos de Solidão — Gabriel García Márquez | O Tempo e o Vento — Erico Verissimo |
| 2 | O Amor nos Tempos do Cólera — Gabriel García Márquez | Ninguém Escreve ao Coronel — Gabriel García Márquez | Pedro Páramo — Juan Rulfo |
| 3 | Ninguém Escreve ao Coronel — Gabriel García Márquez | O Amor nos Tempos do Cólera — Gabriel García Márquez | O Apanhador no Campo de Centeio — J. D. Salinger |
| 4 | Pedro Páramo — Juan Rulfo | O Que É Isso, Companheiro? — Fernando Gabeira | Um Copo de Cólera — Raduan Nassar |
| 5 | Gabriela, Cravo e Canela — Jorge Amado | Gabriela, Cravo e Canela — Jorge Amado | Dom Casmurro — Machado de Assis |

### aut-3 · autor — «para quem gostou de Torto Arado»

Confiança: **high** (maior similaridade com sinopse 0.4648, com leitura 0.2868). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":"Torto Arado"}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Torto Arado — Itamar Vieira Junior | Torto Arado — Itamar Vieira Junior | O Avesso da Pele — Jeferson Tenório |
| 2 | — | Tenda dos Milagres — Jorge Amado | Um Defeito de Cor — Ana Maria Gonçalves |
| 3 | — | Triste Fim de Policarpo Quaresma — Lima Barreto | Vidas Secas — Graciliano Ramos |
| 4 | — | Mar Morto — Jorge Amado | Viva o Povo Brasileiro — João Ubaldo Ribeiro |
| 5 | — | O Jogo da Amarelinha — Julio Cortázar | Recordações do Escrivão Isaías Caminha — Lima Barreto |

### aut-4 · autor — «livros do Saramago»

Confiança: **high** (maior similaridade com sinopse 0.474, com leitura 0.324). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":["ironic"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":"José Saramago"}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Ensaio sobre a Lucidez — José Saramago | O Evangelho segundo Jesus Cristo — José Saramago | O Evangelho segundo Jesus Cristo — José Saramago |
| 2 | O Evangelho segundo Jesus Cristo — José Saramago | Ensaio sobre a Cegueira — José Saramago | As Intermitências da Morte — José Saramago |
| 3 | Memorial do Convento — José Saramago | As Intermitências da Morte — José Saramago | Ensaio sobre a Cegueira — José Saramago |
| 4 | A Jangada de Pedra — José Saramago | Memorial do Convento — José Saramago | Memorial do Convento — José Saramago |
| 5 | Ensaio sobre a Cegueira — José Saramago | Ensaio sobre a Lucidez — José Saramago | Ensaio sobre a Lucidez — José Saramago |

### aut-5 · autor — «para quem gosta de Rupi Kaur»

Confiança: **none** (maior similaridade com sinopse 0.3585, com leitura 0.389). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":["comforting"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":"Rupi Kaur"}`

> Rupi Kaur não está neste catálogo. Sem conhecer os livros dessa referência, prefiro não inventar uma semelhança.

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | — | O Caçador de Pipas — Khaled Hosseini | — |
| 2 | — | A Menina que Roubava Livros — Markus Zusak | — |
| 3 | — | Pessoas Normais — Sally Rooney | — |
| 4 | — | O Apanhador no Campo de Centeio — J. D. Salinger | — |
| 5 | — | Persépolis — Marjane Satrapi | — |

### neg-1 · negativa — «quero um livro sobre solidão, mas sem ser deprimente»

Confiança: **high** (maior similaridade com sinopse 0.4765, com leitura 0.4813). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":["melancholic"],"avoid":["deprimente"],"avoidAtmospheres":["dark"],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Cem Anos de Solidão — Gabriel García Márquez | Cem Anos de Solidão — Gabriel García Márquez | Cem Anos de Solidão — Gabriel García Márquez |
| 2 | Memorial de Maria Moura — Rachel de Queiroz | A Paixão segundo G.H. — Clarice Lispector | O Lobo da Estepe — Hermann Hesse |
| 3 | O Vampiro de Curitiba — Dalton Trevisan | Dias de Abandono — Elena Ferrante | Dias de Abandono — Elena Ferrante |
| 4 | As Ondas — Virginia Woolf | Uma Aprendizagem ou O Livro dos Prazeres — Clarice Lispector | A Jangada de Pedra — José Saramago |
| 5 | Dias de Abandono — Elena Ferrante | A Hora da Estrela — Clarice Lispector | Ratos e Homens — John Steinbeck |

### neg-2 · negativa — «um romance delicado, mas não previsível»

Confiança: **high** (maior similaridade com sinopse 0.4556, com leitura 0.474). Leitura do pedido: `{"atmospheres":["comforting"],"inferredAtmospheres":["melancholic"],"avoid":["previsível"],"avoidAtmospheres":[],"unassessable":["previsível"],"pace":null,"length":null,"era":null,"genres":["Romance"],"reference":null}`

> Não tenho como avaliar "previsível" com os dados do catálogo; considerei o restante do pedido.

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Romance d'A Pedra do Reino — Ariano Suassuna | Perto do Coração Selvagem — Clarice Lispector | A Moreninha — Joaquim Manuel de Macedo |
| 2 | Romanceiro da Inconfidência — Cecília Meireles | Uma Aprendizagem ou O Livro dos Prazeres — Clarice Lispector | Orgulho e Preconceito — Jane Austen |
| 3 | Dom Quixote — Miguel de Cervantes | Ponciá Vicêncio — Conceição Evaristo | Gabriela, Cravo e Canela — Jorge Amado |
| 4 | Perto do Coração Selvagem — Clarice Lispector | Os Sofrimentos do Jovem Werther — Johann Wolfgang von Goethe | Dona Flor e Seus Dois Maridos — Jorge Amado |
| 5 | Memorial de Maria Moura — Rachel de Queiroz | A Moreninha — Joaquim Manuel de Macedo | O Encontro Marcado — Fernando Sabino |

### neg-3 · negativa — «ficção científica que não seja pessimista»

Confiança: **high** (maior similaridade com sinopse 0.4538, com leitura 0.3944). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":["pessimista"],"avoidAtmospheres":["dark"],"unassessable":[],"pace":null,"length":null,"era":null,"genres":["Ficção científica"],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Solaris — Stanisław Lem | Solaris — Stanisław Lem | Solaris — Stanisław Lem |
| 2 | Duna — Frank Herbert | Androides Sonham com Ovelhas Elétricas? — Philip K. Dick | O Guia do Mochileiro das Galáxias — Douglas Adams |
| 3 | Não Verás País Nenhum — Ignácio de Loyola Brandão | Os Despossuídos — Ursula K. Le Guin | Androides Sonham com Ovelhas Elétricas? — Philip K. Dick |
| 4 | Neuromancer — William Gibson | Neuromancer — William Gibson | Neuromancer — William Gibson |
| 5 | A Mão Esquerda da Escuridão — Ursula K. Le Guin | O Guia do Mochileiro das Galáxias — Douglas Adams | Não Verás País Nenhum — Ignácio de Loyola Brandão |

### neg-4 · negativa — «um clássico, mas nada muito longo»

Confiança: **high** (maior similaridade com sinopse 0.3518, com leitura 0.42). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":["nostalgic","melancholic"],"avoid":["longo"],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":"short","era":"classic","genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Os Maias — Eça de Queirós | Felicidade Clandestina — Clarice Lispector | Mensagem — Fernando Pessoa |
| 2 | O Jogo da Amarelinha — Julio Cortázar | O Tempo e o Vento — Erico Verissimo | O Quinze — Rachel de Queiroz |
| 3 | O Vampiro de Curitiba — Dalton Trevisan | Mrs. Dalloway — Virginia Woolf | Ópera dos Mortos — Autran Dourado |
| 4 | Os Sertões — Euclides da Cunha | Uma Aprendizagem ou O Livro dos Prazeres — Clarice Lispector | Um Copo de Cólera — Raduan Nassar |
| 5 | Grandes Esperanças — Charles Dickens | Os Vestígios do Dia — Kazuo Ishiguro | A Moreninha — Joaquim Manuel de Macedo |

### neg-5 · negativa — «uma história de família sem ser triste»

Confiança: **high** (maior similaridade com sinopse 0.4745, com leitura 0.4043). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":["triste"],"avoidAtmospheres":["melancholic"],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Triste Fim de Policarpo Quaresma — Lima Barreto | Laços de Família — Clarice Lispector | Leite Derramado — Chico Buarque |
| 2 | A Hora da Estrela — Clarice Lispector | Leite Derramado — Chico Buarque | A Resistência — Julián Fuks |
| 3 | Dias de Abandono — Elena Ferrante | Os Maias — Eça de Queirós | Laços de Família — Clarice Lispector |
| 4 | Laços de Família — Clarice Lispector | A Resistência — Julián Fuks | Dois Irmãos — Milton Hatoum |
| 5 | A Metamorfose — Franz Kafka | Felicidade Clandestina — Clarice Lispector | A Casa dos Espíritos — Isabel Allende |

### amb-1 · ambígua — «romance»

Confiança: **high** (maior similaridade com sinopse 0.317, com leitura 0.3024). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":["Romance"],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Romance d'A Pedra do Reino — Ariano Suassuna | K. Relato de uma Busca — Bernardo Kucinski | Amor de Perdição — Camilo Castelo Branco |
| 2 | Romanceiro da Inconfidência — Cecília Meireles | Cinzas do Norte — Milton Hatoum | A Moreninha — Joaquim Manuel de Macedo |
| 3 | Dom Quixote — Miguel de Cervantes | Amor de Perdição — Camilo Castelo Branco | O Amor nos Tempos do Cólera — Gabriel García Márquez |
| 4 | Perto do Coração Selvagem — Clarice Lispector | Os Sofrimentos do Jovem Werther — Johann Wolfgang von Goethe | Os Sofrimentos do Jovem Werther — Johann Wolfgang von Goethe |
| 5 | Memorial de Maria Moura — Rachel de Queiroz | Memorial de Maria Moura — Rachel de Queiroz | Memorial de Maria Moura — Rachel de Queiroz |

### amb-2 · ambígua — «algo leve»

Confiança: **medium** (maior similaridade com sinopse 0.2384, com leitura 0.2639). Leitura do pedido: `{"atmospheres":["luminous"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | O Barão nas Árvores — Italo Calvino | — | O Alquimista — Paulo Coelho |
| 2 | Dom Quixote — Miguel de Cervantes | — | Tenda dos Milagres — Jorge Amado |
| 3 | Fahrenheit 451 — Ray Bradbury | — | O Hobbit — J. R. R. Tolkien |
| 4 | — | — | Os Lusíadas — Luís de Camões |
| 5 | — | — | A Cidade e as Serras — Eça de Queirós |

### amb-3 · ambígua — «sertão»

Confiança: **high** (maior similaridade com sinopse 0.4399, com leitura 0.3044). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Os Sertões — Euclides da Cunha | Os Sertões — Euclides da Cunha | Os Sertões — Euclides da Cunha |
| 2 | Grande Sertão: Veredas — João Guimarães Rosa | Grande Sertão: Veredas — João Guimarães Rosa | Vidas Secas — Graciliano Ramos |
| 3 | Torto Arado — Itamar Vieira Junior | Morte e Vida Severina — João Cabral de Melo Neto | Morte e Vida Severina — João Cabral de Melo Neto |
| 4 | Morte e Vida Severina — João Cabral de Melo Neto | São Bernardo — Graciliano Ramos | Torto Arado — Itamar Vieira Junior |
| 5 | Vidas Secas — Graciliano Ramos | Sargento Getúlio — João Ubaldo Ribeiro | Sargento Getúlio — João Ubaldo Ribeiro |

### amb-4 · ambígua — «livros sobre mães e filhas»

Confiança: **high** (maior similaridade com sinopse 0.4179, com leitura 0.3725). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":["comforting"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Dois Irmãos — Milton Hatoum | As Meninas — Lygia Fagundes Telles | Laços de Família — Clarice Lispector |
| 2 | Ninguém Escreve ao Coronel — Gabriel García Márquez | Laços de Família — Clarice Lispector | O Segundo Sexo — Simone de Beauvoir |
| 3 | Os Maias — Eça de Queirós | Os Maias — Eça de Queirós | Gabriela, Cravo e Canela — Jorge Amado |
| 4 | Quarto de Despejo — Carolina Maria de Jesus | Memorial de Maria Moura — Rachel de Queiroz | As Meninas — Lygia Fagundes Telles |
| 5 | O Vermelho e o Negro — Stendhal | Becos da Memória — Conceição Evaristo | Um Teto Todo Seu — Virginia Woolf |

### sem-1 · sem correspondência — «manual de programação em Rust»

Confiança: **none** (maior similaridade com sinopse 0.2445, com leitura 0.2646). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

> Não encontrei nesta estante nada que responda bem a esse pedido. Talvez o catálogo não tenha esse tipo de livro.

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Libertinagem — Manuel Bandeira | — | — |
| 2 | A Moreninha — Joaquim Manuel de Macedo | — | — |
| 3 | Memórias de um Sargento de Milícias — Manuel Antônio de Almeida | — | — |
| 4 | O Jogo da Amarelinha — Julio Cortázar | — | — |
| 5 | Mar Morto — Jorge Amado | — | — |

### sem-2 · sem correspondência — «receitas veganas para o dia a dia»

Confiança: **none** (maior similaridade com sinopse 0.3875, com leitura 0.1515). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

> Não encontrei nesta estante nada que responda bem a esse pedido. Talvez o catálogo não tenha esse tipo de livro.

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Eles Eram Muitos Cavalos — Luiz Ruffato | — | — |
| 2 | Os Vestígios do Dia — Kazuo Ishiguro | — | — |
| 3 | Mrs. Dalloway — Virginia Woolf | — | — |
| 4 | Quarto de Despejo — Carolina Maria de Jesus | — | — |
| 5 | As Intermitências da Morte — José Saramago | — | — |

### sem-3 · sem correspondência — «guia de viagem para o Japão»

Confiança: **none** (maior similaridade com sinopse 0.2674, com leitura 0.2137). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

> Não encontrei nesta estante nada que responda bem a esse pedido. Talvez o catálogo não tenha esse tipo de livro.

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | O Guia do Mochileiro das Galáxias — Douglas Adams | — | — |
| 2 | A Divina Comédia — Dante Alighieri | — | — |
| 3 | O Alquimista — Paulo Coelho | — | — |
| 4 | Moby Dick — Herman Melville | — | — |
| 5 | Recordações do Escrivão Isaías Caminha — Lima Barreto | — | — |

### sem-4 · sem correspondência — «como investir em ações na bolsa»

Confiança: **none** (maior similaridade com sinopse 0.189, com leitura 0.0996). Leitura do pedido: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

> Não encontrei nesta estante nada que responda bem a esse pedido. Talvez o catálogo não tenha esse tipo de livro.

| # | palavras | só embeddings | estante |
| --- | --- | --- | --- |
| 1 | Agosto — Rubem Fonseca | — | — |
| 2 | Drácula — Bram Stoker | — | — |
| 3 | O Nome da Rosa — Umberto Eco | — | — |
| 4 | Niketche: Uma História de Poligamia — Paulina Chiziane | — | — |
| 5 | A Sangue Frio — Truman Capote | — | — |
