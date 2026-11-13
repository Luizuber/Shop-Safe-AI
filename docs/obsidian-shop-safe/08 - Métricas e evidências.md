---
tags: [ml, metricas, resultados]
---

# Métricas e evidências

Resultados medidos no treinamento executado nesta implementação, usando até 100.000 registros preparados por tarefa. Métricas são da tarefa definida na base, não de todas as fraudes possíveis.

## Divisões reais

| Tarefa | Treino | Validação | Teste |
| --- | ---: | ---: | ---: |
| Domínios (v2) | 64.216 | 17.490 | 18.294 |
| Sentimento | 64.231 | 15.458 | 20.311 |

As proporções variam levemente porque a separação é por grupos, não por linhas isoladas.

## Métricas no teste

| Experimento | Acurácia | Precisão | Recall | F1 | ROC-AUC |
| --- | ---: | ---: | ---: | ---: | ---: |
| Phishing de domínio v2, corte 0,5 | 96,130% | 97,132% | 91,919% | 94,454% | 97,655% |
| Phishing de domínio v2, corte operacional 0,8 | 95,818% | 99,454% | 88,825% | 93,839% | 97,655% |
| Sentimento, corte 0,5 | 94,589% | 98,104% | 94,266% | 96,146% | 98,749% |

Classe positiva: phishing na segurança; opinião de nota 4/5 no sentimento. A API de sentimento pode se abster no intervalo de baixa separação; a tabela acima apresenta a avaliação binária em todas as amostras, não apenas a parte em que o runtime decide.

## Matriz de confusão

Ordem: `[[verdadeiro negativo, falso positivo], [falso negativo, verdadeiro positivo]]`.

- Segurança v2 em 0,5: `[[11557, 178], [530, 6029]]`.
- Segurança v2 em 0,8: `[[11703, 32], [733, 5826]]`.
- Sentimento em 0,5: `[[5502, 265], [834, 13710]]`.

Essas métricas **não significam que o sistema nunca erra**. Existem falsos positivos e negativos, e a população real pode ser muito diferente. A base pode favorecer atalhos de HTTPS/padrões de coleta; falta validação temporal e externa.

O modelo v1 foi aposentado após falsos positivos em links longos legítimos da Amazon, apesar dos resultados retrospectivos superiores. Suas métricas anteriores estão preservadas em `ml/reports/security-v1-retired.json`. Na v2 o caminho do produto não é usado, o prefixo `www.` é normalizado e hosts com rótulos conflitantes são retirados. As métricas menores desta versão não foram escondidas.

As métricas acima avaliam o classificador isolado. A política final de exigir indício independente e limitar a penalidade é outra camada; não foi medida como um classificador completo de fraudes de compra.

## Versões

- Domínio: `security-v2-c15d93bf2e33`.
- Sentimento: `sentiment-v1-5fad2abae306`.

Os valores integrais e hashes estão nos [resultados de segurança](Anexos/metricas-seguranca.json) e [resultados de sentimento](Anexos/metricas-sentimento.json). As fontes originais ficam em `ml/reports/`. Se forem regeneradas, atualizar as cópias e esta nota junto com o experimento.

## Preço

KDE é ajustado online com as lojas encontradas. Não há nesta entrega uma base rotulada de preço justo/fraude para calcular acurácia real de mercado. Há testes numéricos contra scikit-learn/SciPy e casos de anomalia, ausência de dados e independência das referências.

## O que os testes funcionais provam

Testes de código comprovam transformação, limites, estados, contratos, inferência e integrações em cenários definidos. Não são substitutos da avaliação estatística nem de testes de usabilidade. Veja [[12 - Testes e diagnóstico]] e [[14 - Pendências e roteiro]].
