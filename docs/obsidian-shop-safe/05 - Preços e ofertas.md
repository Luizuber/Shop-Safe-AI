---
tags: [ml, precificacao]
---

# Preços e ofertas

## Pesquisa e equivalência

O backend consulta `google_shopping` na SerpAPI, preserva atributos na consulta e filtra títulos. Categoria, modelo, geração, capacidade, cor e modalidade da oferta são conferidos. Matching textual é uma regra de proteção, não um modelo treinado de identidade de produto.

Ofertas de aluguel/assinatura, parcelas isoladas, acessórios e condições incompatíveis não devem compor a comparação. A identificação por palavras-chave e nomes de serviços é conservadora e precisa de manutenção.

## Links

1. Prioriza link do comerciante fornecido no resultado.
2. Extrai destino embutido em redirecionamento Google `/url`.
3. Consulta `google_immersive_product` quando há token, inclusive token na URL detalhada da SerpAPI.
4. Busca página pelo produto e loja nos resultados orgânicos.
5. Se não houver destino direto confiável, mantém Google Shopping com identificação explícita.

As consultas adicionais usam limites configuráveis. URLs executáveis são rejeitadas. Uma URL de Google Shopping não pode ser tratada como confirmação de estoque/preço na loja.

## Modelo não supervisionado de preços

`PriceModelService` ajusta KDE gaussiano em log-preços. A distribuição é aprendida das ofertas da consulta, não de pesos fixos de preço por produto.

- Cada loja contribui uma vez.
- A loja/endereço atual é excluído das referências.
- Preços inválidos e URLs malformadas não entram.
- Referências isoladas são retiradas com dispersão robusta (mediana e MAD), sem usar o preço do anúncio atual para selecioná-las.
- São necessárias pelo menos cinco lojas independentes após a filtragem.
- Bandwidth usa a regra de Silverman com dispersão robusta e piso técnico de 0,03 no log-preço.
- Retorna referência mediana, percentil do preço atual e faixa central de 95% da distribuição estimada.
- Preço abaixo/acima é desvio de 15% da referência. Anomalia é estar fora dos percentis 2,5%–97,5%.

O piso e os limiares são escolhas de implementação, não parâmetros treinados em base rotulada de fraudes. A faixa de densidade também não é uma garantia de preço correto.

## Falta de dados

Com poucas lojas ou preço atual ausente, o resultado é `insufficient_data`, `comparison: UNKNOWN`. Não se deve chamar isso de preço justo/dentro da média.

Não há previsão de preço futuro, ajuste por frete, cupom, prazo ou série histórica. Os preços podem mudar na loja. A paridade numérica é testada contra SciPy/scikit-learn; não existe ainda métrica de acurácia em mercado rotulado.

Relacionadas: [[03 - Captação e qualidade dos dados]], [[08 - Métricas e evidências]], [[14 - Pendências e roteiro]].
