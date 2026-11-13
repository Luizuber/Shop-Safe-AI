---
tags: [ml, seguranca]
---

# Segurança e phishing

## Modelo supervisionado

O `security.json` contém coeficientes de regressão logística treinados pelo scikit-learn com URLs da base PhiUSIIL. O algoritmo aprende a separar URLs rotuladas como legítimas ou phishing. Não consulta o conteúdo das páginas dessas URLs.

Entrada: domínio e esquema da URL sanitizada. Na versão 2, o prefixo opcional `www.` é normalizado e o caminho inteiro é excluído das características. São usados HTTPS, comprimento do hostname, proporção de dígitos, hífens/pontos, IP, punycode, entropia e n-gramas de caracteres (3 e 4) em 2.048 buckets FNV-1a. Query, fragmento e credenciais não integram o modelo. Isso impede que descrições longas de produtos mudem o risco do mesmo domínio.

A transformação em `ml/train.py` é reproduzida em `ml/features.ts`; testes com amostras de teste verificam probabilidades e vetores iguais entre Python e TypeScript.

## Integração

- Limiar de alerta: escore logístico de phishing >= 0,8.
- Sinal alto só reduz a pontuação quando acompanhado de indício independente na URL, como imitação de marca ou conexão insegura. O impacto adicional é limitado a 20 pontos; não se converte `1 - escore` em pontuação geral.
- Sinal alto em domínio HTTPS reconhecido é declarado `conflicting_evidence`, não altera a nota e não garante segurança. Essa é uma política explícita de composição, separada dos pesos aprendidos.
- Sinal baixo não aumenta a reputação de uma loja e não garante entrega.
- Sem artefato válido, a resposta declara `unavailable` e mantém regras identificadas como tal.
- Entrada incompatível produz `insufficient_data`.

## Regras que continuam

HTTPS, domínio conhecido, vendedor informado, termos suspeitos, subdomínios, dígitos, extensão de URL, possível imitação de marca e desvio de preço continuam no motor. A correspondência de domínio usa limite de subdomínio: `evilamazon.com` não é Amazon.

A pontuação híbrida não é uma probabilidade de a compra ser legítima. `aiConfidence`, campo antigo preservado por compatibilidade, continua sendo cobertura de sinais, não acurácia.

## Limites

Um classificador lexical não comprova validade de certificado TLS, idade de domínio, reputação de vendedor ou autenticidade de produto. A base retrospectiva pode ter atalhos de HTTPS e padrões de coleta. Falta avaliação externa e temporal no cenário real de compras brasileiro.

Relacionadas: [[08 - Métricas e evidências]], [[11 - Segurança e privacidade]], [[15 - Referências e licenças]].
