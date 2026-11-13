---
tags: [tcc, apresentacao]
---

# Apresentação do TCC

## Descrição fiel da implementação

O Shop Safe é uma extensão de navegador que coleta informações de ofertas e avaliações e as envia a uma API. O backend combina regras de verificação com modelos de machine learning próprios: um classificador de padrões de phishing em URLs, um classificador de sentimento de avaliações em português e um estimador não supervisionado da distribuição de preços de ofertas equivalentes. O resultado apresenta pontuação composta, alertas, ofertas e informações sobre os dados usados.

Os classificadores supervisionados foram treinados com bases públicas e avaliados em conjuntos separados por grupos. Os parâmetros aprendidos são exportados em JSON e a inferência é executada em TypeScript na API NestJS. Testes verificam equivalência das previsões em relação ao treinamento em Python.

## Roteiro de demonstração

1. Mostrar a versão 1.2.1 da extensão e a página real do produto.
2. Mostrar os dados efetivamente capturados, incluindo o limite da amostra de comentários.
3. Consultar `/analysis/models` para evidenciar versões publicadas.
4. Mostrar `machineLearning` em uma resposta real de `/analysis`.
5. Explicar o sinal de phishing sem afirmar que ele certifica a compra.
6. Mostrar faixa de preço quando há cinco lojas independentes; mostrar inconclusivo quando faltam dados.
7. Mostrar contagens de sentimento e os comentários de origem.
8. Apresentar métricas e matrizes de confusão de [[08 - Métricas e evidências]].
9. Encerrar com limites, trabalho futuro e situação de publicação.

## Afirmações que exigem cuidado

| Pode ser dito | Não foi demonstrado |
| --- | --- |
| “Treinamos classificadores com dados públicos rotulados” | “A IA aprende automaticamente a cada acesso” |
| “Há avaliação de URL e sentimento em teste separado” | “A acurácia vale para todas as fraudes na internet” |
| “KDE identifica preços atípicos nas referências encontradas” | “O sistema conhece o preço justo definitivo” |
| “Resumo e alertas são vinculados aos dados” | “O sistema verifica que todo comentário é verdadeiro” |
| “Histórico local implementado” | “PostgreSQL e feedback estão concluídos” |
| “Código local com ML integrado” | “Render atualizado sem verificar a versão publicada” |

Para citar as fontes e as restrições dos dados, usar [[15 - Referências e licenças]]. Para o DOCX final, confrontar esta documentação com os requisitos integrais quando o arquivo estiver acessível.
