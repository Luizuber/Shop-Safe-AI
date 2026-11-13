# Segurança

Não publicar chaves, tokens, senhas, arquivos `.env` ou dados pessoais em issues e pull requests. A chave da SerpAPI deve existir apenas no ambiente do backend.

Para informar uma vulnerabilidade, utilize **Security → Report a vulnerability** do GitHub quando esse recurso estiver habilitado pelo mantenedor. Se não estiver disponível, combine um canal privado com o mantenedor; não publique credenciais ou uma exploração com dados de terceiros.

Antes de um push, execute `node scripts/check-secrets.mjs --history`. O verificador busca formatos conhecidos de credenciais e arquivos privados. Ele não substitui uma revisão de segurança e não garante a detecção de todo segredo possível. Para comparar também as chaves locais sem exibi-las, use `--local-env=backand/backend-api/.env`.

Se uma credencial já tiver sido exposta, revogue-a/rotacione-a. Apagar o arquivo de um commit novo não remove a exposição do histórico.

## Escopo do produto

Pontuação, sinal de phishing e análise de preço são apoio à decisão. Não são auditoria de loja, autenticação de produto ou garantia de entrega. A classificação de sentimento não verifica a autenticidade de uma avaliação. Consulte `ml/MODEL_CARD.md` para os limites dos modelos e das bases.
