---
tags: [deploy, instalacao]
---

# Instalação e publicação

## Backend local

```powershell
cd backand/backend-api
npm ci
npm run build
npm run start:prod
```

Porta padrão 3000, substituída por `PORT` no ambiente. Os modelos treinados já ficam no código-fonte em JSON. O build Nest copia-os para `dist/analysis/ml/models`; o servidor não precisa de Python ou treinamento ao iniciar.

Não publicar a pasta `.venv-ml` nem os dados brutos. Não enviar `.env` para o GitHub.

## Extensão

```powershell
cd frontend
npm ci
npm test
npm run build
```

Carregar **a pasta `frontend/dist`** em `chrome://extensions`, modo de desenvolvedor, **Carregar sem compactação**. Para uma instalação existente, recarregar a extensão e atualizar a página do produto. Versão desta implementação: **1.2.1**.

Para testes locais: `npm run build:local` gera `frontend/dist-local`, chamada **Shop Safe (Local)**, com endpoint `http://localhost:3000/analysis`. Carregar essa pasta e desativar a outra cópia durante os testes para evitar dois painéis. O build local não altera o pacote externo. O backend precisa estar rodando; CORS deve permitir as origens das lojas testadas.

O endpoint padrão do bundle é o Render externo; o computador do desenvolvedor pode estar desligado. `VITE_API_BASE_URL` permite sobrescrever a base durante o build; mudar somente o arquivo fonte sem refazer o build não altera uma extensão já carregada.

## Configuração do Render

- Diretório do backend: `backand/backend-api`.
- Build: `npm ci && npm run build`.
- Inicialização: `npm run start:prod`.
- `SERP_API_KEY`: segredo somente no backend.
- `NODE_ENV=production`.
- `CORS_ORIGINS`: origens efetivas das páginas onde o content script faz a chamada, separadas por vírgula; configurar conforme os sites suportados.
- `EXTENSION_ID`: quando aplicável à origem da extensão; sozinho pode não cobrir chamadas originadas nas páginas.
- `ANALYSIS_RATE_LIMIT`: limite por janela de um minuto (padrão 20).
- `SERP_DIRECT_LINK_LIMIT`: consultas detalhadas (padrão 5, máximo 10).
- `SERP_ORGANIC_LINK_LIMIT`: fallback orgânico (padrão 5, máximo 10; 0 desativa).

## Confirmar publicação

1. Publicar o commit que contém código, artefatos e configuração de cópia dos modelos.
2. Conferir os logs do build e da inicialização no Render.
3. Consultar `/analysis/models`: os dois modelos precisam ter status `ready` e versões esperadas.
4. Fazer POST real e verificar `machineLearning` e `priceAnalysis`.
5. Testar na extensão instalada e fora da rede do desenvolvedor.

O cofre e os testes locais não afirmam que esse deploy já ocorreu. Publicar ou fazer push é uma operação separada do desenvolvimento local.

Relacionadas: [[09 - Contrato da API]], [[11 - Segurança e privacidade]], [[12 - Testes e diagnóstico]].
