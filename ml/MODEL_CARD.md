# Shop Safe — modelos e reprodutibilidade

Implementação de 11/11/2026. Este arquivo descreve código local e artefatos treinados, não certifica publicação no Render.

## O que é machine learning aqui

1. `security.json`: regressão logística supervisionada de domínio (v2), coeficientes ajustados pelo scikit-learn a dados rotulados. Caminho e prefixo opcional `www.` não alteram a previsão. Saída: escore de classe phishing. A API só aplica penalidade adicional quando há indício independente na URL, limitada a 20 pontos. Divergência em domínio HTTPS reconhecido é inconclusiva. Uma previsão negativa de phishing não eleva a confiabilidade de uma loja.
2. `sentiment.json`: TF-IDF de palavras e bigramas + regressão logística supervisionada, treinada em avaliações reais em português. Saída: positivo/negativo/inconclusivo. Não autentica comentários e não detecta avaliações falsas.
3. `PriceModelService`: estimador não supervisionado de densidade gaussiana (KDE) em log-preços. Ajusta a distribuição por consulta usando ofertas equivalentes de pelo menos cinco lojas independentes. Não existe um previsor global de preços futuros treinado offline.

O sistema permanece híbrido. Regras determinísticas continuam validando URLs, campos, equivalência de produtos, modalidade da oferta e mensagens de explicação. Os textos não são produzidos por LLM.

## Bases e licenças

- Segurança: [PhiUSIIL, UCI dataset 967](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset). Prasad e Chandra, 2024. Licença CC BY 4.0. Rótulos originais: 1 legítima, 0 phishing; no modelo exportado, 1 é phishing.
- Sentimento: [B2W-Reviews01, B2W Digital](https://github.com/americanas-tech/b2w-reviews01). Real, Oshiro e Mafra, 2019. Licença **CC BY-NC-SA 4.0**: modelo e derivados destinados ao uso acadêmico/não comercial, com atribuição e compartilhamento compatível. Para uso comercial, substituir a base ou obter autorização apropriada.
- Apenas `URL`/`label` são lidos da base de segurança. Apenas `product_id`, `overall_rating` e `review_text` são lidos da B2W. Campos pessoais dos autores não são usados para treinar.
- Nenhuma URL de phishing é visitada. O treinamento baixa somente os arquivos oficiais; não navega nos endereços que eles contêm.

## Preparação e separação

- Amostra reprodutível de até 100.000 linhas válidas por tarefa, semente 42. `--limit 0` permite a base inteira.
- Segurança v2: deduplicação por hostname normalizado e remoção de hosts com classes conflitantes. Sentimento: deduplicação dos textos normalizados e remoção dos conflitos.
- Divisão em treino/validação/teste de aproximadamente 64/16/20 por grupos, antes de ajustar vocabulário/IDF ou coeficientes.
- URLs agrupadas por sufixo conservador de hostname (dois últimos componentes): evita cruzamento de domínio entre conjuntos; domínios como `co.uk` ficam agrupados de maneira mais conservadora que um resolvedor de sufixos públicos.
- Avaliações agrupadas por `product_id`; notas 1–2 são negativas e 4–5 positivas. Nota 3 excluída. Nota é uma aproximação ruidosa de sentimento.
- Relatórios em `ml/reports/`: hash SHA-256 dos dados e artefatos, versões, amostras, matriz de confusão, precisão, recall, F1, ROC-AUC e Brier score.
- Escore logístico não calibrado como probabilidade de fraude de uma compra. Limiar operacional de segurança 0,8; relatório também registra os resultados nesse limiar. Classificação de sentimento se abstém quando max(p, 1-p) < 0,65 ou faltam termos reconhecidos.

## Executar novamente

Na raiz do repositório, com Python 3.11:

```powershell
python -m venv .venv-ml
.\.venv-ml\Scripts\python.exe -m pip install -r ml/requirements.txt
.\.venv-ml\Scripts\python.exe ml/train.py --model all --limit 100000
.\.venv-ml\Scripts\python.exe ml/verify_price.py
```

Dados brutos ficam em `ml/data/` e o ambiente em `.venv-ml/`, ambos ignorados pelo Git. Artefatos JSON são gerados em `backand/backend-api/src/analysis/ml/models/`. O runtime da API não usa Python e não carrega pickle. O Nest copia os artefatos para `dist/analysis/ml/models/` durante o build.

## Conferir a integração

```powershell
cd backand/backend-api
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
npm run start:prod
```

`GET /analysis/models` informa status, versão, algoritmo, licença e métricas; não expõe os coeficientes. `POST /analysis` devolve `machineLearning.security`, `machineLearning.pricing` e `machineLearning.reviews`. Ausência de artefato é identificada como `unavailable`; falta de observações, como `insufficient_data`. A interface não deve exibir previsão de ML nesses casos.

Na raiz: `node ml/smoke-built.cjs` verifica SHA-256 dos artefatos compilados e a integração dos serviços em um cenário explicitamente controlado; não faz uma busca real na internet.

## Limites e próximos experimentos

- Métricas retrospectivas são resultados nas bases, não validação de fraude de e-commerce atual. HTTPS, caminhos e seleção de domínios podem introduzir viés e atalhos no classificador de URL. Fazer validação temporal e externa antes de alegar generalização.
- Não são verificados identidade do vendedor, entrega, autenticidade do produto, WHOIS, certificado TLS real ou banco de reclamações.
- O KDE depende da extração e da equivalência de produto. Remove referências isoladas por dispersão robusta, não usa o preço atual para selecionar seu próprio mercado e não contabiliza frete/cupom/parcelamento como preço final de checkout.
- Paridade numérica de KDE usa preços sintéticos explicitamente identificados apenas como fixture de teste; não é avaliação de acurácia de mercado.
- Não há retreinamento automático com histórico do usuário, feedback rotulado ou PostgreSQL implementado. Evita-se ensinar ao modelo que suas próprias previsões são verdadeiras.
- Relatórios são evidência de experimentos reproduzíveis; não se promete acurácia de produção igual à de teste.
- O v1 foi retirado após falsos positivos em caminhos longos legítimos de produtos, apesar de alta métrica retrospectiva. O v2 exclui o caminho das características, tem métricas próprias e testes de regressão. O relatório anterior está em `ml/reports/security-v1-retired.json`; não é o modelo ativo.

## Referências de implementação

- [Regressão logística — scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html)
- [GroupShuffleSplit — scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.GroupShuffleSplit.html)
- [KernelDensity — scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.neighbors.KernelDensity.html)
- Cofre de documentação: `docs/obsidian-shop-safe/00 - Início.md`.
