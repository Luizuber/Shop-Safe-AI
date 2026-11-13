---
tags: [ml, nlp, avaliacoes]
---

# Avaliações e sentimento

O modelo de sentimento foi treinado com avaliações reais em português da base B2W-Reviews01. Usa TF-IDF de palavras e bigramas, vocabulário de até 12.000 termos e regressão logística. Vetor IDF, vocabulário, coeficientes e intercepto são exportados para JSON.

## Preparação

Notas 1 e 2 fornecem a classe negativa; notas 4 e 5 fornecem a positiva. Nota 3 foi excluída. Isso é supervisão por aproximação: a nota pode não corresponder perfeitamente à emoção de cada frase.

Textos são normalizados, deduplicados e registros com rótulos conflitantes são removidos. Conjuntos são separados por produto antes de aprender vocabulário e IDF.

## Inferência

Cada comentário da página é processado pelo mesmo normalizador. Frequências sublineares e IDF formam um vetor normalizado L2; a regressão calcula o escore positivo.

Se faltam dois termos conhecidos ou max(p, 1-p) < 0,65, a resposta fica inconclusiva. Não se força classificação em textos desconhecidos. A API agrega quantos comentários ficaram positivos, negativos ou inconclusivos.

## Resumo e tópicos

O resumo acrescenta as contagens do modelo. Os tópicos (entrega, embalagem, defeito, originalidade etc.) continuam extraídos por dicionários e regras, com bloqueio simples de negação de frases positivas. Portanto, o resumo não é um texto escrito por ChatGPT/Gemini.

Nota média e total de avaliações são fatos reportados pela página. `samples` indica somente os comentários efetivamente capturados. Não são a totalidade das avaliações da loja.

## Limites

Não detecta avaliações compradas/falsas, identidade dos autores ou se o comentário veio do mesmo produto quando o HTML está errado. Ironia, negações complexas e avaliações mistas podem gerar erro. A base é retrospectiva e possui restrição não comercial — consulte [[15 - Referências e licenças]].

Relacionadas: [[07 - Treinamento e reprodução]], [[08 - Métricas e evidências]].
