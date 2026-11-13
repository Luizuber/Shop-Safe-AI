---
projeto: Shop Safe
atualizado: 2026-11-11
tags: [tcc, indice]
---

# Shop Safe — documentação do projeto

Este cofre documenta a implementação local real da extensão, da API e dos modelos de machine learning. No Obsidian, use **Abrir pasta como cofre** e escolha a pasta `docs/obsidian-shop-safe`. Não requer plugins de terceiros ou serviços pagos.

> [!important] Implementação e publicação
> Modelos treinados e integrados no código local. Publicação no Render e validação em navegador de outros usuários precisam ser confirmadas separadamente. O diagrama anterior de 11/11 que dizia que ML não estava implementado é histórico e foi superado por esta implementação.

## Navegação

- [[01 - Visão e requisitos]] — objetivo, escopo e referência das conversas.
- [[02 - Arquitetura]] — módulos, ferramentas e fluxo completo.
- [[03 - Captação e qualidade dos dados]] — página, notas, comentários e limitações.
- [[04 - Segurança e phishing]] — modelo de URL e composição com regras.
- [[05 - Preços e ofertas]] — equivalência, pesquisa e modelo de preços.
- [[06 - Avaliações e sentimento]] — treinamento em português e resumo.
- [[07 - Treinamento e reprodução]] — comandos e separação dos conjuntos.
- [[08 - Métricas e evidências]] — resultados medidos e interpretação.
- [[09 - Contrato da API]] — rotas, campos e estados.
- [[10 - Instalação e publicação]] — desenvolvimento, extensão e Render.
- [[11 - Segurança e privacidade]] — limites de dados e proteções técnicas.
- [[12 - Testes e diagnóstico]] — testes, falhas e validação de produção.
- [[13 - Decisões e evolução]] — por que o sistema foi construído assim.
- [[14 - Pendências e roteiro]] — o que não foi implementado/verificado.
- [[15 - Referências e licenças]] — fontes, atribuição e licenças.
- [[16 - Mapa do código e glossário]] — onde está cada funcionalidade.
- [[17 - Apresentação do TCC]] — descrição fiel para a banca.
- [[18 - Fluxo visual da IA treinada]] — imagem atualizada da captura, processamento, modelos e resultado.
- [[Arquitetura.canvas]] — mapa visual navegável.

## Estado resumido

| Área | Estado local |
| --- | --- |
| Captura de produto e avaliações | Implementada; depende do DOM da loja |
| Busca de preços e links diretos | Implementada via SerpAPI; requer chave no backend |
| Classificação ML de URL | Treinada com PhiUSIIL e integrada |
| Sentimento em português | Treinado com B2W e integrado |
| Anomalia de preço por KDE | Implementada; mínimo de 5 lojas independentes |
| Histórico | Local no Chrome, até 50 análises |
| PostgreSQL e feedback rotulado | Pendentes |
| Publicação do novo backend | Não confirmada por este cofre |

As métricas de teste das bases e as contagens de testes funcionais são conceitos diferentes. Consulte [[08 - Métricas e evidências]].
