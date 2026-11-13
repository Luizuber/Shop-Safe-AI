---
tags: [decisoes, historico]
---

# Decisões e evolução

## Antes desta implementação

O sistema tinha componentes chamados “IA”, mas o cálculo era uma soma de pesos fixos e o resumo era baseado em palavras-chave. Não havia treinamento, artefatos de modelo ou conjunto de teste estatístico. A nomenclatura foi esclarecida para não apresentar heurísticas como ML treinado.

## Decisões de 11/11/2026

| Decisão | Motivo e consequência |
| --- | --- |
| Treinar com bases públicas rotuladas | Permite experimentos reais com origem e avaliação reproduzíveis |
| Separar phishing, sentimento e preço | São problemas diferentes, com entradas e rótulos diferentes |
| Regressão logística para classificações | Modelo leve, pesos exportáveis e inferência auditável no backend existente |
| TF-IDF de palavras e bigramas | Aprende associações do português a partir das avaliações; permite reproduzir vetor no TypeScript |
| KDE de log-preços por consulta | Adapta a referência ao produto atual, sem inventar uma base histórica de preços |
| Manter regras de equivalência | ML de URL e sentimento não identifica se dois anúncios têm o mesmo modelo/cor |
| Modelo de URL só reduz a pontuação em alerta alto | Ausência de phishing lexical não comprova confiabilidade da compra |
| Responder `UNKNOWN` quando faltam preços | Impede classificar como justo um preço sem referência suficiente |
| Artefatos JSON, inferência TypeScript | Dispensa serviço Python em produção e evita pickle |
| Nada de autoaprendizagem com previsões | Evita transformar a própria saída em rótulo e contaminar treinamento |
| Não usar LLM para inventar justificativas | Textos continuam vinculados aos sinais e às previsões efetivamente obtidos |

## Evolução visual

Solicitações anteriores simplificaram cores e tipografia, fixaram uma aba lateral para abrir a extensão e reduziram a animação de hover. A interface detalhada agora mostra o estado do ML, a faixa de preços e a contagem de sentimentos.

## Publicação

Inspeções anteriores encontraram o Render usando contrato antigo, enquanto as mudanças estavam locais. Esta implementação não deve ser apresentada como publicada sem conferir `/analysis/models` e uma análise real. A versão local da extensão passou para 1.2.1.

## Correção de falso positivo em 11/11/2026

O usuário encontrou pontuação zero em uma página legítima da Amazon. O v1 usava o texto do caminho da URL e confundia descrições longas de produtos com phishing. Além disso, a integração convertia `1 - escore de phishing` diretamente em limite da nota geral. Foi reproduzido com caminhos longos, e não era ausência de resposta da API.

O modelo foi retreinado com características de domínio, normalização de `www.` e deduplicação por host. A nova política só aplica penalidade de ML com indício independente, limita-a a 20 pontos e identifica divergência em domínio HTTPS reconhecido como inconclusiva. No teste controlado do mesmo domínio com e sem caminho longo, a pontuação sem dados de preço ficou em 78/100. Isso não define uma nota fixa para qualquer oferta da Amazon.

O relatório anterior está preservado como aposentado. A menor acurácia retrospectiva do v2 está documentada em [[08 - Métricas e evidências]].

Relacionadas: [[01 - Visão e requisitos]], [[14 - Pendências e roteiro]].
