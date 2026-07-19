# 🎨 Figma Context Cache MCP

🇺🇸 **Read in English:** [README.md](README.md)

> **Contexto persistente de design para agentes de IA.**
>
> *Construa uma vez. Armazene localmente. Reutilize sempre.*

Um servidor MCP (Model Context Protocol) que fornece **contexto do Figma em cache, sincronizável e estruturado** para assistentes de programação com IA, como **Codex**, **Claude Code** e qualquer outro cliente compatível com o protocolo MCP.

Em vez de consultar a API do Figma a cada solicitação, este servidor armazena localmente as respostas dos nós e disponibiliza ferramentas para recuperar, inspecionar, sincronizar e gerenciar esse contexto de forma eficiente.

---

# Por quê?

Assistentes de programação baseados em IA frequentemente precisam consultar informações do Figma durante a implementação ou manutenção de aplicações frontend.

Sem uma camada de cache, cada solicitação:

- realiza uma nova chamada para a API do Figma;
- consome limites de requisição (*rate limits*);
- aumenta a latência;
- baixa repetidamente exatamente os mesmos dados.

Este projeto introduz uma camada de cache persistente com sincronização explícita, tornando o contexto do Figma:

- ⚡ Mais rápido
- ♻️ Reutilizável
- 📦 Persistente
- 🤖 Preparado para IA

---

# Arquitetura

```text
               Agente de IA
           (Codex / Claude Code)

                     │
                     ▼

               Servidor MCP

                     │

         ┌───────────┴───────────┐
         │                       │

         ▼                       ▼

 Cache Local (JSON)       API REST do Figma

         │

         ▼

 Contexto Persistente de Design
```

---

# Funcionalidades

- ✅ Cache persistente em disco
- ✅ Tempo de expiração (TTL) configurável
- ✅ Sincronização explícita com o Figma
- ✅ Inspeção do cache
- ✅ Limpeza seletiva do cache
- ✅ Totalmente tipado com TypeScript
- ✅ Testes automatizados com Vitest
- ✅ Compatível com MCP

---

# Ferramentas MCP

| Ferramenta                | Descrição                                                |
|---------------------------|----------------------------------------------------------|
| `health_check`            | Verifica se o servidor MCP está em execução              |
| `get_figma_node`          | Recupera um nó a partir do cache ou diretamente do Figma |
| `sync_figma_node`         | Força uma nova consulta ao Figma e atualiza o cache      |
| `list_cached_figma_nodes` | Lista os nós armazenados no cache e seus estados         |
| `clear_figma_cache`       | Remove entradas do cache de forma seletiva               |

---

# Ciclo de Vida do Cache

```text
get_figma_node

        │

        ▼

Existe no cache?

   │
   ├── Sim ───────────────► Retorna o nó armazenado
   │
   └── Não
        │
        ▼

Consulta a API do Figma

        │

        ▼

Armazena no cache

        │

        ▼

Retorna a resposta


sync_figma_node

        │

        ▼

Sempre consulta o Figma

        │

        ▼

Atualiza o cache

        │

        ▼

Retorna a versão mais recente
```

---

# Exemplo

Sincronizando um nó:

```text
Use sync_figma_node com:

fileKey: wdva3WcsFmz54Sg5e6OWJl
nodeId: 4510-5941
depth: 1
```

Resposta:

```json
{
  "message": "Nó sincronizado com sucesso.",
  "metadata": {
    "source": "figma",
    "cacheUpdated": true
  }
}
```

Após a sincronização:

```text
Use get_figma_node...
```

Resposta:

```json
{
  "metadata": {
    "source": "cache"
  }
}
```

---

# Estrutura do Projeto

```text
src/
├── cache/
├── figma/
├── server/
├── tools/
└── sync/

tests/
├── cache/
└── figma/
```

---

# Testes

Este projeto utiliza **Vitest** para testes automatizados.

Cobertura atual:

| Componente | Cobertura |
|------------|-----------|
| CacheService | 90%+ |
| FigmaContextService | 100% |
| FigmaClient | Em andamento |

Executar os testes:

```bash
npm test
```

Gerar relatório de cobertura:

```bash
npm run test:coverage
```

---

# Instalação

Clone o repositório:

```bash
git clone https://github.com/AysllaGomes/figma-context-cache-mcp.git

cd figma-context-cache-mcp

npm install
```

Configure as variáveis de ambiente:

```text
FIGMA_API_KEY=seu-token
CACHE_TTL_SECONDS=3600
STORAGE_PATH=./storage
```

Inicie o servidor:

```bash
npm run dev
```

---

# Roadmap

- [x] Cache persistente
- [x] Inspeção do cache
- [x] Sincronização do cache
- [x] Testes automatizados
- [ ] Metadados estruturados dos nós
- [ ] Grafo de relacionamentos entre componentes
- [ ] Integração com Storybook
- [ ] Mapeamento de componentes Angular
- [ ] Indexação de Design Tokens
- [ ] Busca semântica

---

# Visão

Este projeto nasceu como uma simples camada de cache para a API do Figma.

Com o tempo, a proposta evoluiu. O objetivo agora é transformá-lo em um **Frontend Context Engine**: uma camada capaz de conectar design, código e contexto para que agentes de IA possam compreender aplicações frontend de forma muito mais rica do que apenas consumindo respostas da API do Figma.

A longo prazo, o projeto pretende mapear relações entre componentes, Design Tokens, Storybook e implementações no código, tornando o contexto reutilizável, persistente e realmente útil para acelerar o desenvolvimento assistido por IA.

---

# Licença

[MIT](LICENSE)