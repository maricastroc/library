# Search evaluation — keywords × semantics

Generated at 2026-10-14T11:37:44.616Z. Embeddings: `embeddinggemma`. Classifier: `gemma4:e4b`. Relevance grades assigned automatically by `gemma4:12b` (0, 1 or 2), reading only title, author, genre and synopsis. This is not a human evaluation.

- **keywords** (`lexical`): FTS5/BM25 over title, author, genre, synopsis and note, with prefixes.
- **embeddings only** (`embedding`): closeness between the query and the synopsis.
- **shelf** (`full`): query interpretation, synopsis and reading embeddings, reranking by attributes.

## Summary

| engine | P@5 | nDCG@5 | queries with no results |
| --- | --- | --- | --- |
| keywords | 0.39 | 0.34 | 1 of 24 |
| embeddings only | 0.70 | 0.66 | 0 of 24 |
| shelf | 0.72 | 0.68 | 1 of 24 |

nDCG@5 by query type:

| type | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| emotional | 0.12 | 0.59 | 0.81 |
| abstract | 0.40 | 0.62 | 0.71 |
| author | 0.58 | 0.73 | 0.57 |
| negative | 0.34 | 0.69 | 0.65 |
| ambiguous | 0.23 | 0.68 | 0.64 |

Out-of-scope queries declined or flagged as weak: 7 of 7. In-scope queries answered with confidence: 23 of 23.

## Queries

### emo-1 · emotional — "I want something melancholic, but comforting"

Confidence: **high** (highest similarity to a synopsis 0.3305, to a reading 0.4983). Reading of the request: `{"atmospheres":["melancholic","comforting"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Counselor Ayres' Memorial — Machado de Assis **(1)** | Norwegian Wood — Haruki Murakami **(2)** | Kitchen — Banana Yoshimoto **(2)** |
| 2 | — | Atonement — Ian McEwan **(0)** | Counselor Ayres' Memorial — Machado de Assis **(1)** |
| 3 | — | Covert Joy — Clarice Lispector **(2)** | Atonement — Ian McEwan **(0)** |
| 4 | — | The Red and the Black — Stendhal **(0)** | Norwegian Wood — Haruki Murakami **(2)** |
| 5 | — | Kitchen — Banana Yoshimoto **(2)** | Dona Flor and Her Two Husbands — Jorge Amado **(1)** |

nDCG@5 — keywords 0.14 · embeddings only 0.79 · shelf 0.74

### emo-2 · emotional — "I need a book that makes me laugh"

Confidence: **high** (highest similarity to a synopsis 0.3046, to a reading 0.4379). Reading of the request: `{"atmospheres":["ironic"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | The Rogues' Trial — Ariano Suassuna **(0)** | The Hitchhiker's Guide to the Galaxy — Douglas Adams **(2)** | The Hitchhiker's Guide to the Galaxy — Douglas Adams **(2)** |
| 2 | — | O Cheiro do Ralo — Lourenço Mutarelli **(0)** | O Cheiro do Ralo — Lourenço Mutarelli **(0)** |
| 3 | — | The Alienist — Machado de Assis **(2)** | Memoirs of a Militia Sergeant — Manuel Antônio de Almeida **(0)** |
| 4 | — | The Midnight Library — Matt Haig **(0)** | The Rogues' Trial — Ariano Suassuna **(0)** |
| 5 | — | An Apprenticeship or The Book of Pleasures — Clarice Lispector **(0)** | Don Quixote — Miguel de Cervantes **(2)** |

nDCG@5 — keywords 0.00 · embeddings only 0.70 · shelf 0.65

### emo-3 · emotional — "something to read when your heart is broken"

Confidence: **high** (highest similarity to a synopsis 0.3516, to a reading 0.436). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":["melancholic","comforting"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Near to the Wild Heart — Clarice Lispector **(1)** | The Sorrows of Young Werther — Johann Wolfgang von Goethe **(2)** | Kitchen — Banana Yoshimoto **(2)** |
| 2 | Heart of Darkness — Joseph Conrad **(0)** | The Days of Abandonment — Elena Ferrante **(2)** | The Days of Abandonment — Elena Ferrante **(2)** |
| 3 | The Hound of the Baskervilles — Arthur Conan Doyle **(0)** | The Fault in Our Stars — John Green **(2)** | Norwegian Wood — Haruki Murakami **(2)** |
| 4 | Iracema — José de Alencar **(0)** | Atonement — Ian McEwan **(1)** | The Fault in Our Stars — John Green **(2)** |
| 5 | Ancient Tillage — Raduan Nassar **(0)** | Norwegian Wood — Haruki Murakami **(2)** | The Sorrows of Young Werther — Johann Wolfgang von Goethe **(2)** |

nDCG@5 — keywords 0.11 · embeddings only 0.90 · shelf 1.00

### emo-4 · emotional — "a story that gives hope"

Confidence: **high** (highest similarity to a synopsis 0.302, to a reading 0.2913). Reading of the request: `{"atmospheres":["luminous"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Quincas Borba — Machado de Assis **(0)** | The Hour of the Star — Clarice Lispector **(0)** | The Alchemist — Paulo Coelho **(2)** |
| 2 | The Great Gatsby — F. Scott Fitzgerald **(1)** | Klara and the Sun — Kazuo Ishiguro **(1)** | Harry Potter and the Philosopher's Stone — J. K. Rowling **(2)** |
| 3 | Do Androids Dream of Electric Sheep? — Philip K. Dick **(0)** | The Fault in Our Stars — John Green **(1)** | Tent of Miracles — Jorge Amado **(0)** |
| 4 | No One Writes to the Colonel — Gabriel García Márquez **(0)** | — | The City and the Mountains — Eça de Queirós **(0)** |
| 5 | Bestiary — Julio Cortázar **(0)** | — | Gabriela, Clove and Cinnamon — Jorge Amado **(0)** |

nDCG@5 — keywords 0.10 · embeddings only 0.18 · shelf 0.79

### emo-5 · emotional — "I want a book that keeps me up at night with suspense"

Confidence: **high** (highest similarity to a synopsis 0.3776, to a reading 0.4754). Reading of the request: `{"atmospheres":["tense"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Spilt Milk — Chico Buarque **(0)** | The Midnight Library — Matt Haig **(1)** | The Da Vinci Code — Dan Brown **(2)** |
| 2 | The Vampire of Curitiba — Dalton Trevisan **(2)** | The Maltese Falcon — Dashiell Hammett **(2)** | Murder on the Orient Express — Agatha Christie **(2)** |
| 3 | The Handmaid's Tale — Margaret Atwood **(1)** | The Book Thief — Markus Zusak **(0)** | A Game of Thrones — George R. R. Martin **(1)** |
| 4 | Kitchen — Banana Yoshimoto **(0)** | The Shadow of the Wind — Carlos Ruiz Zafón **(1)** | Crimes of August — Rubem Fonseca **(2)** |
| 5 | Hamlet — William Shakespeare **(0)** | Death with Interruptions — José Saramago **(0)** | The Maltese Falcon — Dashiell Hammett **(2)** |

nDCG@5 — keywords 0.27 · embeddings only 0.38 · shelf 0.89

### abs-1 · abstract — "something that feels like a rainy afternoon"

Confidence: **high** (highest similarity to a synopsis 0.2967, to a reading 0.3477). Reading of the request: `{"atmospheres":["melancholic","contemplative"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":"slow","length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Seeing — José Saramago **(1)** | Mrs. Dalloway — Virginia Woolf **(2)** | Mrs. Dalloway — Virginia Woolf **(2)** |
| 2 | The Alienist — Machado de Assis **(0)** | Seeing — José Saramago **(1)** | In Search of Lost Time — Marcel Proust **(2)** |
| 3 | The Sad End of Policarpo Quaresma — Lima Barreto **(0)** | The Shadow of the Wind — Carlos Ruiz Zafón **(2)** | The Remains of the Day — Kazuo Ishiguro **(1)** |
| 4 | — | A Time to Meet — Fernando Sabino **(0)** | The Waves — Virginia Woolf **(2)** |
| 5 | — | Norwegian Wood — Haruki Murakami **(2)** | The Passion According to G.H. — Clarice Lispector **(0)** |

nDCG@5 — keywords 0.11 · embeddings only 0.71 · shelf 0.76

### abs-2 · abstract — "a book that smells like grandma's house"

Confidence: **high** (highest similarity to a synopsis 0.4601, to a reading 0.4351). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":["nostalgic"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Perfume — Patrick Süskind **(1)** | Perfume — Patrick Süskind **(1)** | Ponciá Vicêncio — Conceição Evaristo **(0)** |
| 2 | The House of the Spirits — Isabel Allende **(0)** | O Cheiro do Ralo — Lourenço Mutarelli **(0)** | The House of the Spirits — Isabel Allende **(0)** |
| 3 | O Cheiro do Ralo — Lourenço Mutarelli **(0)** | The House of the Spirits — Isabel Allende **(0)** | Perfume — Patrick Süskind **(1)** |
| 4 | A Moreninha — Joaquim Manuel de Macedo **(0)** | Kitchen — Banana Yoshimoto **(0)** | The Seven Husbands of Evelyn Hugo — Taylor Jenkins Reid **(0)** |
| 5 | One Hundred Years of Solitude — Gabriel García Márquez **(0)** | The Seven Husbands of Evelyn Hugo — Taylor Jenkins Reid **(0)** | Dona Flor and Her Two Husbands — Jorge Amado **(1)** |

nDCG@5 — keywords 0.61 · embeddings only 0.61 · shelf 0.54

### abs-3 · abstract — "a short story that keeps me thinking for days"

Confidence: **high** (highest similarity to a synopsis 0.363, to a reading 0.338). Reading of the request: `{"atmospheres":["contemplative"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":"short","era":null,"genres":["Short stories","Novella"],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Fahrenheit 451 — Ray Bradbury **(0)** | Mrs. Dalloway — Virginia Woolf **(0)** | Family Ties — Clarice Lispector **(2)** |
| 2 | The Rogues' Trial — Ariano Suassuna **(0)** | And Still the Earth — Ignácio de Loyola Brandão **(1)** | Mrs. Dalloway — Virginia Woolf **(0)** |
| 3 | Antes do Baile Verde — Lygia Fagundes Telles **(2)** | No One Writes to the Colonel — Gabriel García Márquez **(2)** | Turbulence — Chico Buarque **(0)** |
| 4 | The Fault in Our Stars — John Green **(0)** | Covert Joy — Clarice Lispector **(2)** | Covert Joy — Clarice Lispector **(2)** |
| 5 | Sagarana — João Guimarães Rosa **(2)** | Family Ties — Clarice Lispector **(2)** | The Stranger — Albert Camus **(1)** |

nDCG@5 — keywords 0.30 · embeddings only 0.52 · shelf 0.53

### abs-4 · abstract — "a book to read slowly, savoring every sentence"

Confidence: **high** (highest similarity to a synopsis 0.3764, to a reading 0.5309). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":["contemplative"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":"slow","length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Barren Lives — Graciliano Ramos **(2)** | The Remains of the Day — Kazuo Ishiguro **(2)** | In Search of Lost Time — Marcel Proust **(2)** |
| 2 | The Passion According to G.H. — Clarice Lispector **(2)** | One Hundred Years of Solitude — Gabriel García Márquez **(2)** | The Remains of the Day — Kazuo Ishiguro **(2)** |
| 3 | A Cup of Rage — Raduan Nassar **(1)** | Death with Interruptions — José Saramago **(2)** | Mrs. Dalloway — Virginia Woolf **(2)** |
| 4 | Ancient Tillage — Raduan Nassar **(1)** | An Apprenticeship or The Book of Pleasures — Clarice Lispector **(2)** | The Passion According to G.H. — Clarice Lispector **(2)** |
| 5 | The Sorrows of Young Werther — Johann Wolfgang von Goethe **(2)** | Atonement — Ian McEwan **(1)** | The Waves — Virginia Woolf **(2)** |

nDCG@5 — keywords 0.79 · embeddings only 0.91 · shelf 1.00

### abs-5 · abstract — "a book that feels like a strange dream"

Confidence: **high** (highest similarity to a synopsis 0.3901, to a reading 0.5091). Reading of the request: `{"atmospheres":["unsettling","dreamlike"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Do Androids Dream of Electric Sheep? — Philip K. Dick **(1)** | Klara and the Sun — Kazuo Ishiguro **(1)** | Kafka on the Shore — Haruki Murakami **(2)** |
| 2 | The Alchemist — Paulo Coelho **(1)** | The Midnight Library — Matt Haig **(1)** | The Voices of the Dead — Autran Dourado **(0)** |
| 3 | The Stranger — Albert Camus **(0)** | The Book of Chameleons — José Eduardo Agualusa **(0)** | And Still the Earth — Ignácio de Loyola Brandão **(1)** |
| 4 | The Slum — Aluísio Azevedo **(0)** | Sleepwalking Land — Mia Couto **(2)** | Bestiary — Julio Cortázar **(2)** |
| 5 | Animal Farm — George Orwell **(0)** | The Land at the End of the World — António Lobo Antunes **(0)** | Incidente em Antares — Erico Verissimo **(2)** |

nDCG@5 — keywords 0.20 · embeddings only 0.36 · shelf 0.74

### aut-1 · author — "books for those who liked Clarice Lispector"

Confidence: **high** (highest similarity to a synopsis 0.5862, to a reading 0.3728). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":"Clarice Lispector"}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Near to the Wild Heart — Clarice Lispector **(2)** | An Apprenticeship or The Book of Pleasures — Clarice Lispector **(2)** | Turbulence — Chico Buarque **(1)** |
| 2 | An Apprenticeship or The Book of Pleasures — Clarice Lispector **(2)** | The Hour of the Star — Clarice Lispector **(2)** | Mrs. Dalloway — Virginia Woolf **(2)** |
| 3 | Água Viva — Clarice Lispector **(2)** | Covert Joy — Clarice Lispector **(2)** | Dom Casmurro — Machado de Assis **(1)** |
| 4 | The Passion According to G.H. — Clarice Lispector **(2)** | Family Ties — Clarice Lispector **(2)** | Ponciá Vicêncio — Conceição Evaristo **(1)** |
| 5 | Family Ties — Clarice Lispector **(2)** | Near to the Wild Heart — Clarice Lispector **(2)** | The Marble Dance — Lygia Fagundes Telles **(2)** |

nDCG@5 — keywords 1.00 · embeddings only 1.00 · shelf 0.56

### aut-2 · author — "something in the style of Gabriel García Márquez"

Confidence: **high** (highest similarity to a synopsis 0.5448, to a reading 0.4626). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":["dreamlike"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":"Gabriel García Márquez"}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | One Hundred Years of Solitude — Gabriel García Márquez **(2)** | One Hundred Years of Solitude — Gabriel García Márquez **(2)** | The Shadow of the Wind — Carlos Ruiz Zafón **(1)** |
| 2 | Love in the Time of Cholera — Gabriel García Márquez **(2)** | Love in the Time of Cholera — Gabriel García Márquez **(2)** | Hopscotch — Julio Cortázar **(1)** |
| 3 | No One Writes to the Colonel — Gabriel García Márquez **(2)** | No One Writes to the Colonel — Gabriel García Márquez **(2)** | The Old Man and the Sea — Ernest Hemingway **(0)** |
| 4 | Pedro Páramo — Juan Rulfo **(2)** | The Savage Detectives — Roberto Bolaño **(1)** | The House of the Spirits — Isabel Allende **(2)** |
| 5 | Gabriela, Clove and Cinnamon — Jorge Amado **(1)** | The Hour of the Star — Clarice Lispector **(0)** | Turbulence — Chico Buarque **(0)** |

nDCG@5 — keywords 0.91 · embeddings only 0.77 · shelf 0.33

### aut-3 · author — "for those who liked Crooked Plow"

Confidence: **high** (highest similarity to a synopsis 0.4664, to a reading 0.2295). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":"Crooked Plow"}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Crooked Plow — Itamar Vieira Junior **(0)** | Crooked Plow — Itamar Vieira Junior **(0)** | Um Defeito de Cor — Ana Maria Gonçalves **(2)** |
| 2 | — | The Road — Cormac McCarthy **(1)** | Sleepwalking Land — Mia Couto **(1)** |
| 3 | — | Hopscotch — Julio Cortázar **(0)** | Fogo Morto — José Lins do Rego **(2)** |
| 4 | — | Wuthering Heights — Emily Brontë **(1)** | Baltasar and Blimunda — José Saramago **(1)** |
| 5 | — | Ancient Tillage — Raduan Nassar **(2)** | Ancient Tillage — Raduan Nassar **(2)** |

nDCG@5 — keywords 0.00 · embeddings only 0.31 · shelf 0.93

### aut-4 · author — "books by Saramago"

Confidence: **high** (highest similarity to a synopsis 0.4561, to a reading 0.2659). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":["ironic"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":"José Saramago"}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Seeing — José Saramago **(2)** | Death with Interruptions — José Saramago **(2)** | Death with Interruptions — José Saramago **(2)** |
| 2 | The Gospel According to Jesus Christ — José Saramago **(2)** | The Gospel According to Jesus Christ — José Saramago **(2)** | Baltasar and Blimunda — José Saramago **(2)** |
| 3 | Baltasar and Blimunda — José Saramago **(2)** | Baltasar and Blimunda — José Saramago **(2)** | The Gospel According to Jesus Christ — José Saramago **(2)** |
| 4 | The Stone Raft — José Saramago **(2)** | Blindness — José Saramago **(2)** | Seeing — José Saramago **(2)** |
| 5 | Death with Interruptions — José Saramago **(2)** | Seeing — José Saramago **(2)** | Blindness — José Saramago **(2)** |

nDCG@5 — keywords 1.00 · embeddings only 1.00 · shelf 1.00

### aut-5 · author — "for those who like Rupi Kaur"

Confidence: **none** (highest similarity to a synopsis 0.343, to a reading 0.3574). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":"Rupi Kaur"}`

> Rupi Kaur is not in this catalog. Without knowing that reference's books, I would rather not invent a resemblance.

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | — | The God of Small Things — Arundhati Roy **(0)** | — |
| 2 | — | Kafka on the Shore — Haruki Murakami **(0)** | — |
| 3 | — | The Kite Runner — Khaled Hosseini **(1)** | — |
| 4 | — | An Apprenticeship or The Book of Pleasures — Clarice Lispector **(1)** | — |
| 5 | — | Norwegian Wood — Haruki Murakami **(0)** | — |

nDCG@5 — keywords — · embeddings only 0.57 · shelf —

### neg-1 · negative — "I want a book about loneliness, but without being depressing"

Confidence: **high** (highest similarity to a synopsis 0.4356, to a reading 0.445). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":["melancholic"],"avoid":["depressing"],"avoidAtmospheres":["dark"],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Of Mice and Men — John Steinbeck **(0)** | One Hundred Years of Solitude — Gabriel García Márquez **(1)** | Klara and the Sun — Kazuo Ishiguro **(1)** |
| 2 | Memorial de Maria Moura — Rachel de Queiroz **(0)** | Klara and the Sun — Kazuo Ishiguro **(1)** | One Hundred Years of Solitude — Gabriel García Márquez **(1)** |
| 3 | The Vampire of Curitiba — Dalton Trevisan **(1)** | Norwegian Wood — Haruki Murakami **(0)** | The Catcher in the Rye — J. D. Salinger **(1)** |
| 4 | The Little Prince — Antoine de Saint-Exupéry **(2)** | The Days of Abandonment — Elena Ferrante **(0)** | Norwegian Wood — Haruki Murakami **(0)** |
| 5 | — | Kitchen — Banana Yoshimoto **(2)** | Atonement — Ian McEwan **(0)** |

nDCG@5 — keywords 0.29 · embeddings only 0.45 · shelf 0.34

### neg-2 · negative — "a delicate novel, but not predictable"

Confidence: **high** (highest similarity to a synopsis 0.4394, to a reading 0.4689). Reading of the request: `{"atmospheres":["comforting"],"inferredAtmospheres":["melancholic"],"avoid":["predictable"],"avoidAtmospheres":[],"unassessable":["predictable"],"pace":null,"length":null,"era":null,"genres":["Novel"],"reference":null}`

> I have no way to assess "predictable" with the catalog data; I considered the rest of your request.

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Near to the Wild Heart — Clarice Lispector **(2)** | The Hour of the Star — Clarice Lispector **(2)** | A Moreninha — Joaquim Manuel de Macedo **(0)** |
| 2 | K — Bernardo Kucinski **(0)** | The Remains of the Day — Kazuo Ishiguro **(2)** | Pride and Prejudice — Jane Austen **(1)** |
| 3 | Memorial de Maria Moura — Rachel de Queiroz **(1)** | My Brilliant Friend — Elena Ferrante **(1)** | My Brilliant Friend — Elena Ferrante **(1)** |
| 4 | Ashes of the Amazon — Milton Hatoum **(0)** | Kitchen — Banana Yoshimoto **(2)** | Atonement — Ian McEwan **(2)** |
| 5 | Tale of a Certain Orient — Milton Hatoum **(0)** | Atonement — Ian McEwan **(2)** | Kitchen — Banana Yoshimoto **(2)** |

nDCG@5 — keywords 0.40 · embeddings only 0.89 · shelf 0.41

### neg-3 · negative — "science fiction that isn't pessimistic"

Confidence: **high** (highest similarity to a synopsis 0.3789, to a reading 0.3527). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":["pessimistic"],"avoidAtmospheres":["dark"],"unassessable":[],"pace":null,"length":null,"era":null,"genres":["Science fiction"],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Solaris — Stanisław Lem **(1)** | The Dispossessed — Ursula K. Le Guin **(1)** | Klara and the Sun — Kazuo Ishiguro **(1)** |
| 2 | Captains of the Sands — Jorge Amado **(0)** | Klara and the Sun — Kazuo Ishiguro **(1)** | The Hitchhiker's Guide to the Galaxy — Douglas Adams **(2)** |
| 3 | Dune — Frank Herbert **(1)** | The Left Hand of Darkness — Ursula K. Le Guin **(1)** | The Martian — Andy Weir **(2)** |
| 4 | Fahrenheit 451 — Ray Bradbury **(0)** | Do Androids Dream of Electric Sheep? — Philip K. Dick **(0)** | Neuromancer — William Gibson **(1)** |
| 5 | And Still the Earth — Ignácio de Loyola Brandão **(1)** | Solaris — Stanisław Lem **(1)** | Do Androids Dream of Electric Sheep? — Philip K. Dick **(0)** |

nDCG@5 — keywords 0.30 · embeddings only 0.41 · shelf 0.78

### neg-4 · negative — "a classic, but nothing too long"

Confidence: **high** (highest similarity to a synopsis 0.3337, to a reading 0.3678). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":["long"],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":"short","era":"classic","genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | A Cup of Rage — Raduan Nassar **(2)** | The Old Man and the Sea — Ernest Hemingway **(2)** | O Quinze — Rachel de Queiroz **(2)** |
| 2 | Rebellion in the Backlands — Euclides da Cunha **(0)** | The Hour of the Star — Clarice Lispector **(2)** | The Great Gatsby — F. Scott Fitzgerald **(2)** |
| 3 | Great Expectations — Charles Dickens **(1)** | Time and the Wind — Erico Verissimo **(0)** | Of Mice and Men — John Steinbeck **(2)** |
| 4 | The Savage Detectives — Roberto Bolaño **(0)** | Mrs. Dalloway — Virginia Woolf **(2)** | Mrs. Dalloway — Virginia Woolf **(2)** |
| 5 | The Maias — Eça de Queirós **(0)** | The Remains of the Day — Kazuo Ishiguro **(2)** | A Moreninha — Joaquim Manuel de Macedo **(2)** |

nDCG@5 — keywords 0.40 · embeddings only 0.83 · shelf 1.00

### neg-5 · negative — "a family story without being sad"

Confidence: **high** (highest similarity to a synopsis 0.4148, to a reading 0.3678). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":["sad"],"avoidAtmospheres":["melancholic"],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | The Sad End of Policarpo Quaresma — Lima Barreto **(0)** | Family Ties — Clarice Lispector **(1)** | Family Ties — Clarice Lispector **(1)** |
| 2 | The Shadow of the Wind — Carlos Ruiz Zafón **(0)** | Spilt Milk — Chico Buarque **(1)** | Resistance — Julián Fuks **(1)** |
| 3 | Family Ties — Clarice Lispector **(1)** | Resistance — Julián Fuks **(1)** | The First Wife: A Tale of Polygamy — Paulina Chiziane **(1)** |
| 4 | The Metamorphosis — Franz Kafka **(0)** | The Brothers — Milton Hatoum **(0)** | The Seven Husbands of Evelyn Hugo — Taylor Jenkins Reid **(0)** |
| 5 | The House of the Spirits — Isabel Allende **(1)** | One Hundred Years of Solitude — Gabriel García Márquez **(1)** | The Brothers — Milton Hatoum **(0)** |

nDCG@5 — keywords 0.30 · embeddings only 0.85 · shelf 0.72

### amb-1 · ambiguous — "romance"

Confidence: **high** (highest similarity to a synopsis 0.3615, to a reading 0.4156). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":["comforting","nostalgic"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Romance d'A Pedra do Reino — Ariano Suassuna **(0)** | Doomed Love — Camilo Castelo Branco **(2)** | A Moreninha — Joaquim Manuel de Macedo **(2)** |
| 2 | Romanceiro da Inconfidência — Cecília Meireles **(2)** | The Sorrows of Young Werther — Johann Wolfgang von Goethe **(2)** | The Sorrows of Young Werther — Johann Wolfgang von Goethe **(2)** |
| 3 | Memoirs of a Militia Sergeant — Manuel Antônio de Almeida **(0)** | Love in the Time of Cholera — Gabriel García Márquez **(2)** | Love in the Time of Cholera — Gabriel García Márquez **(2)** |
| 4 | Doomed Love — Camilo Castelo Branco **(2)** | Senhora — José de Alencar **(2)** | Doomed Love — Camilo Castelo Branco **(2)** |
| 5 | Don Quixote — Miguel de Cervantes **(0)** | A Moreninha — Joaquim Manuel de Macedo **(2)** | Senhora — José de Alencar **(2)** |

nDCG@5 — keywords 0.36 · embeddings only 1.00 · shelf 1.00

### amb-2 · ambiguous — "something light"

Confidence: **high** (highest similarity to a synopsis 0.3068, to a reading 0.2906). Reading of the request: `{"atmospheres":["luminous"],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Phenotypes — Paulo Scott **(0)** | The God of Small Things — Arundhati Roy **(1)** | Libertinagem — Manuel Bandeira **(1)** |
| 2 | Seeing — José Saramago **(0)** | Seeing — José Saramago **(0)** | The Alchemist — Paulo Coelho **(2)** |
| 3 | Chronicle of the Murdered House — Lúcio Cardoso **(1)** | The Hour of the Star — Clarice Lispector **(1)** | Harry Potter and the Philosopher's Stone — J. K. Rowling **(2)** |
| 4 | The Baron in the Trees — Italo Calvino **(1)** | — | Gabriela, Clove and Cinnamon — Jorge Amado **(1)** |
| 5 | Blindness — José Saramago **(0)** | — | The Divine Comedy — Dante Alighieri **(0)** |

nDCG@5 — keywords 0.15 · embeddings only 0.24 · shelf 0.78

### amb-3 · ambiguous — "sertão"

Confidence: **medium** (highest similarity to a synopsis 0.3331, to a reading 0.2354). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Barren Lives — Graciliano Ramos **(2)** | Death and Life of Severino — João Cabral de Melo Neto **(2)** | Gabriela, Clove and Cinnamon — Jorge Amado **(0)** |
| 2 | — | São Bernardo — Graciliano Ramos **(1)** | An Invincible Memory — João Ubaldo Ribeiro **(1)** |
| 3 | — | Sergeant Getúlio — João Ubaldo Ribeiro **(2)** | Death and Life of Severino — João Cabral de Melo Neto **(2)** |
| 4 | — | Senhora — José de Alencar **(0)** | Sergeant Getúlio — João Ubaldo Ribeiro **(2)** |
| 5 | — | Sagarana — João Guimarães Rosa **(1)** | Sagarana — João Guimarães Rosa **(1)** |

nDCG@5 — keywords 0.42 · embeddings only 0.77 · shelf 0.53

### amb-4 · ambiguous — "books about mothers and daughters"

Confidence: **medium** (highest similarity to a synopsis 0.3653, to a reading 0.3877). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":["comforting"],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | The House of the Spirits — Isabel Allende **(0)** | The House of the Spirits — Isabel Allende **(0)** | The House of the Spirits — Isabel Allende **(0)** |
| 2 | The Brothers — Milton Hatoum **(0)** | Family Ties — Clarice Lispector **(1)** | The Girl in the Photograph — Lygia Fagundes Telles **(0)** |
| 3 | The Maias — Eça de Queirós **(0)** | Klara and the Sun — Kazuo Ishiguro **(1)** | My Brilliant Friend — Elena Ferrante **(0)** |
| 4 | Madame Bovary — Gustave Flaubert **(0)** | The Girl in the Photograph — Lygia Fagundes Telles **(0)** | The Brothers — Milton Hatoum **(0)** |
| 5 | Senhora — José de Alencar **(0)** | The Maias — Eça de Queirós **(0)** | Family Ties — Clarice Lispector **(1)** |

nDCG@5 — keywords 0.00 · embeddings only 0.69 · shelf 0.24

### sem-1 · no match — "Rust programming manual"

Confidence: **none** (highest similarity to a synopsis 0.2013, to a reading 0.2583). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

> Nothing on this shelf answers “Rust programming manual”: no title or author goes by that name, and no synopsis comes close to it. The catalog may not have this kind of book.

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Klara and the Sun — Kazuo Ishiguro | — | — |
| 2 | Libertinagem — Manuel Bandeira | — | — |
| 3 | A Moreninha — Joaquim Manuel de Macedo | — | — |
| 4 | Memoirs of a Militia Sergeant — Manuel Antônio de Almeida | — | — |
| 5 | Hopscotch — Julio Cortázar | — | — |

### sem-2 · no match — "everyday vegan recipes"

Confidence: **none** (highest similarity to a synopsis 0.2946, to a reading 0.113). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

> Nothing on this shelf answers “everyday vegan recipes”: no title or author goes by that name, and no synopsis comes close to it. The catalog may not have this kind of book.

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | There Were Many Horses — Luiz Ruffato | — | — |
| 2 | Libertinagem — Manuel Bandeira | — | — |
| 3 | Family Ties — Clarice Lispector | — | — |
| 4 | The Vampire of Curitiba — Dalton Trevisan | — | — |
| 5 | Dona Flor and Her Two Husbands — Jorge Amado | — | — |

### sem-3 · no match — "travel guide to Japan"

Confidence: **none** (highest similarity to a synopsis 0.2231, to a reading 0.1858). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

> Nothing on this shelf answers “travel guide to Japan”: no title or author goes by that name, and no synopsis comes close to it. The catalog may not have this kind of book.

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | The Hitchhiker's Guide to the Galaxy — Douglas Adams | — | — |
| 2 | The Divine Comedy — Dante Alighieri | — | — |
| 3 | The Alchemist — Paulo Coelho | — | — |
| 4 | And Still the Earth — Ignácio de Loyola Brandão | — | — |
| 5 | The Metamorphosis — Franz Kafka | — | — |

### sem-4 · no match — "how to invest in the stock market"

Confidence: **none** (highest similarity to a synopsis 0.1125, to a reading 0.0418). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":[],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

> Nothing on this shelf answers “how to invest in the stock market”: no title or author goes by that name, and no synopsis comes close to it. The catalog may not have this kind of book.

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | The Maltese Falcon — Dashiell Hammett | — | — |
| 2 | The Brazilian People — Darcy Ribeiro | — | — |
| 3 | Crimes of August — Rubem Fonseca | — | — |
| 4 | The Posthumous Memoirs of Brás Cubas — Machado de Assis | — | — |
| 5 | The Book Thief — Markus Zusak | — | — |

### una-1 · unanswerable — "an underrated book"

Confidence: **none** (highest similarity to a synopsis 0, to a reading 0). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":["underrated"],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

> I cannot tell which books are "underrated": the catalog knows what each book is about and how it reads, not how it was received. Tell me a feeling, a theme or a pace and I will look for that.

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | — | The God of Small Things — Arundhati Roy | — |
| 2 | — | The Voices of the Dead — Autran Dourado | — |
| 3 | — | Klara and the Sun — Kazuo Ishiguro | — |
| 4 | — | The Shadow of the Wind — Carlos Ruiz Zafón | — |
| 5 | — | The Land at the End of the World — António Lobo Antunes | — |

### una-2 · unanswerable — "an overrated book"

Confidence: **none** (highest similarity to a synopsis 0, to a reading 0). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":["overrated"],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

> I cannot tell which books are "overrated": the catalog knows what each book is about and how it reads, not how it was received. Tell me a feeling, a theme or a pace and I will look for that.

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | — | The Book Thief — Markus Zusak | — |
| 2 | — | The God of Small Things — Arundhati Roy | — |
| 3 | — | Disgrace — J. M. Coetzee | — |
| 4 | — | The Voices of the Dead — Autran Dourado | — |
| 5 | — | Klara and the Sun — Kazuo Ishiguro | — |

### una-3 · unanswerable — "the best book you have"

Confidence: **none** (highest similarity to a synopsis 0, to a reading 0). Reading of the request: `{"atmospheres":[],"inferredAtmospheres":[],"avoid":[],"avoidAtmospheres":[],"unassessable":["best"],"pace":null,"length":null,"era":null,"genres":[],"reference":null}`

> I cannot tell which books are "best": the catalog knows what each book is about and how it reads, not how it was received. Tell me a feeling, a theme or a pace and I will look for that.

| # | keywords | embeddings only | shelf |
| --- | --- | --- | --- |
| 1 | Don Quixote — Miguel de Cervantes | An Apprenticeship or The Book of Pleasures — Clarice Lispector | — |
| 2 | Near to the Wild Heart — Clarice Lispector | The Book Thief — Markus Zusak | — |
| 3 | Lord of the Flies — William Golding | Don Quixote — Miguel de Cervantes | — |
| 4 | The Voices of the Dead — Autran Dourado | The Midnight Library — Matt Haig | — |
| 5 | Animal Farm — George Orwell | My Brilliant Friend — Elena Ferrante | — |
