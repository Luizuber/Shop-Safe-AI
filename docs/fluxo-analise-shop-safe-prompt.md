# Especificação da imagem — fluxo de análise do Shop Safe

Gerada com a ferramenta integrada de imagens. Referência: código local inspecionado em 11/11/2026; não certifica a versão publicada.

```text
Use case: infographic-diagram.
Create a polished, accurate educational architecture infographic in Brazilian Portuguese for the real software project "Shop Safe", wide landscape, high resolution, sharp legible sans-serif type, white background, dark navy text, simple blue accents, subtle gray borders, no gradients, no robots, no decorative neural networks. Professional university/TCC technical figure. All text must be faithfully spelled in Portuguese, generous spacing, avoid tiny text. Diagram represents inspected LOCAL code, NOT a promise about deployed version.

Title exactly: "Shop Safe — como a análise funciona hoje"
Subtitle: "Motor de regras implementado • machine learning ainda não treinado"

Main layout: a left-to-right first row of three large numbered cards connected with clear arrows:
"1. Página do produto"
"Nome, preço, vendedor e URL"
"Nota média, total de avaliações"
"Até 20 comentários disponíveis"
small tool badge "DOM • JSON-LD • seletores CSS"

"2. Extensão Chrome"
"Normaliza os dados da página"
"Observa carregamentos dinâmicos"
"Envia JSON por HTTPS"
tool badge "TypeScript • React • MutationObserver"

"3. API externa"
"POST /analysis"
"Valida campos, limites e URL"
"Coordena as etapas da análise"
tool badge "Node.js • NestJS"

From API split with separate branching arrows into three parallel cards in the middle/lower row:
"4A. Pesquisa de preços"
"SerpAPI → Google Shopping"
"Consulta vendedores e links"
"Filtra modelo, capacidade e cor"
"Exclui ofertas incompatíveis"
"Calcula média e diferença de preço"
tool badge "Axios • SerpAPI"

"4B. Sinais de segurança"
"HTTPS, domínio e vendedor"
"URL suspeita e imitação de marca"
"Desvio do preço de mercado"
"Soma pesos definidos no código"
tool badge "SecurityAiService • regras fixas"
A short connector from price card to security card labelled "Desvio de preço".

"4C. Avaliações dos clientes"
"Usa comentários capturados"
"Busca palavras-chave"
"Lista pontos positivos e negativos"
"Gera resumo por texto predefinido"
tool badge "ReviewSummaryService"

These three cards converge with arrows into output panel across bottom main area:
"5. Resultado na extensão"
"Pontuação de 0 a 100 • nível de risco • alertas • ofertas • resumo"
"Histórico local: até 50 análises no navegador"
small note "A pontuação não é uma probabilidade estatística de segurança."

Below distinct dashed gray future band, visually separate, labelled:
"PRÓXIMA ETAPA — AINDA NÃO IMPLEMENTADA"
"Base rotulada → treinamento → avaliação em dados separados → modelo versionado → inferência"
"Hoje não há aprendizado automático nem integração com ChatGPT/Gemini na análise."

Footer exactly:
"Baseado no código local inspecionado em 11/11/2026. A versão publicada no Render precisa ser confirmada."
"Dados da página e resultados de busca podem estar incompletos; comentários não têm autenticidade verificada."

Important accuracy: review ratings do NOT train or directly feed the security score; do not draw an arrow from reviews to the security score card. Data flows reviews->output only. Price deviation DOES feed security rule. No model-training feedback loop in current implementation. No database or LLM cloud service in implemented architecture. Clear boundaries around browser and external backend if space permits. Fit all content cleanly; prioritize legibility.
```
