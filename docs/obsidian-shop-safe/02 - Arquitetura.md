---
tags: [arquitetura]
---

# Arquitetura

```mermaid
flowchart TD
    Pagina["Página da loja: DOM e JSON-LD"] --> Extrator["Extensão: TypeScript + MutationObserver"]
    Extrator -->|"JSON por HTTPS"| API["API NestJS: validação de entrada"]
    API --> Busca["SerpAPI: ofertas e vendedores"]
    Busca --> Filtros["Regras de equivalência e modalidade"]
    Filtros --> KDE["KDE: aprende distribuição de log-preços"]
    API --> URL["Modelo de phishing: regressão logística"]
    API --> Sentimento["Modelo de sentimento: TF-IDF + regressão logística"]
    KDE --> Composicao["DecisionEngineService"]
    URL --> Composicao
    Sentimento --> Composicao
    Regras["HTTPS, domínio, vendedor e regras de segurança"] --> Composicao
    Composicao --> Painel["React: risco, ofertas, faixa e resumo"]
    Painel --> Historico["chrome.storage.local: até 50 análises"]
    Bases["Bases públicas UCI e B2W"] --> Treino["Python + pandas + scikit-learn"]
    Treino --> Artefatos["JSON versionado: pesos, vocabulário e IDF"]
    Artefatos --> URL
    Artefatos --> Sentimento
```

## Ferramentas por responsabilidade

| Ferramenta | Uso |
| --- | --- |
| Chrome Manifest V3 | Carregamento e permissões da extensão |
| React, TypeScript e Tailwind | Interface e controle de estados |
| Seletores CSS e JSON-LD | Extração dos dados da página |
| MutationObserver | Releitura quando a loja renderiza novos dados |
| Node.js e NestJS | Rotas, serviços, validação e resposta |
| Axios e SerpAPI | Consultas externas de produtos e ofertas |
| Python, pandas, NumPy, SciPy, scikit-learn | Preparação, treinamento e avaliação |
| Inferência TypeScript | Reprodução dos modelos no servidor sem Python em produção |
| Jest, Supertest e Vitest | Testes de backend, API e frontend |
| Obsidian e Markdown | Documentação local com links e diagramas |

## Fronteiras

- O navegador coleta dados; não recebe a chave da SerpAPI.
- O treinamento é uma atividade offline explícita; a API não abre um endpoint público de treinamento.
- Os artefatos são carregados uma vez pelo serviço. Não se usa pickle ou execução de Python por requisição.
- A resposta inclui os estados dos modelos. O frontend compatível com API antiga não transforma uma resposta antiga em previsão de ML.
- Textos explicativos são montados no código. Não há LLM na geração da resposta.

Relacionadas: [[07 - Treinamento e reprodução]], [[09 - Contrato da API]].
