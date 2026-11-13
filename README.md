# Shop Safe AI

Extensão Chrome desenvolvida como Trabalho de Conclusão de Curso em Engenharia de Software no Centro Universitário Católica de Santa Catarina. Reúne informações de uma oferta, compara preços e apresenta sinais de risco e análise de sentimento dos comentários disponíveis.

O sistema combina **regras de validação e modelos próprios de machine learning**. A pontuação é apoio à decisão, não uma certificação da loja ou garantia de compra.

## Demonstração e documentação

- [Apresentação do projeto no YouTube](https://youtu.be/6_Q1_ZcjQ3w) — material acadêmico; pode representar uma versão anterior.
- [Slides da apresentação](slides/Shop-Safe-AI.pdf).
- [Cofre Obsidian: início](docs/obsidian-shop-safe/00%20-%20In%C3%ADcio.md).
- [Arquitetura e fluxo de dados](docs/obsidian-shop-safe/02%20-%20Arquitetura.md).
- [Model card e reprodução dos experimentos](ml/MODEL_CARD.md).
- [Métricas, limitações e evidências](docs/obsidian-shop-safe/08%20-%20M%C3%A9tricas%20e%20evid%C3%AAncias.md).
- [README original do repositório acadêmico](docs/historico/README-original-do-repositorio.md).

## Estado da implementação

| Componente | Implementado |
| --- | --- |
| Extensão | React, TypeScript, Vite, Manifest V3; captura DOM/JSON-LD, painel e histórico local |
| API | NestJS, validação de entrada, CORS configurável, rate limiting e consultas SerpAPI |
| Segurança | Regressão logística de domínio treinada em PhiUSIIL, combinada com regras |
| Avaliações | TF-IDF + regressão logística treinada em português com B2W-Reviews01 |
| Preços | KDE ajustado por consulta com pelo menos 5 lojas independentes |
| Persistência | Até 50 análises no navegador; PostgreSQL ainda planejado |
| Publicação | Código e modelos versionados; confirmar a versão efetivamente implantada no servidor |

Não há integração com ChatGPT/Gemini na análise e não ocorre retreinamento automático a cada acesso. O modelo de domínio não autentica vendedor/produto, e o sentimento não verifica comentários falsos.

## Estrutura

```text
backand/backend-api/    API, inferência e modelos JSON
frontend/              Extensão e builds local/externo
ml/                    Treinamento Python, relatórios e model card
docs/                  Documentação, diagramas e cofre Obsidian
slides/                Apresentação acadêmica já existente
scripts/               Verificação de arquivos privados e credenciais
.github/               Integração contínua e templates de colaboração
```

O nome histórico `backand` foi mantido para compatibilidade com os caminhos existentes.

## Requisitos

- Node.js 24 e npm.
- Python 3.11 apenas para treinamento e verificações científicas; o backend usa os modelos JSON já versionados.
- Chrome/Chromium para carregar a extensão sem compactação.
- Chave SerpAPI no ambiente do backend para pesquisar ofertas. Sem ela, o servidor retorna ausência de ofertas, sem inventar preços.

## Executar a API

```text
cd backand/backend-api
npm ci
npm run build
npm run start:prod
```

Endereço local: `http://localhost:3000`. Rotas:

- `POST /analysis`: dados do produto, sinais de risco, modelos e comparação.
- `GET /analysis/models`: status, versões, fontes e métricas dos modelos.
- `GET /`: resposta básica; não comprova funcionamento das consultas externas.

Configure as variáveis no sistema ou em arquivo local **não versionado**:

| Variável | Uso |
| --- | --- |
| `SERP_API_KEY` | Credencial privada do serviço de busca |
| `PORT` | Porta da API; padrão 3000 |
| `NODE_ENV` | Ambiente de execução |
| `CORS_ORIGINS` | Origens das páginas permitidas, separadas por vírgula |
| `EXTENSION_ID` | Origem específica da extensão quando aplicável |
| `SERP_DIRECT_LINK_LIMIT` | Limite de consultas detalhadas; padrão 5, máximo 10 |
| `SERP_ORGANIC_LINK_LIMIT` | Fallback orgânico; padrão 5, máximo 10; zero desativa |
| `ANALYSIS_RATE_LIMIT` | Limite por minuto; padrão 20 |

Para testar a partir de uma loja, sua origem precisa ser autorizada em `CORS_ORIGINS`. Não enviar credenciais para o frontend. Consulte as [instruções de publicação](docs/obsidian-shop-safe/10%20-%20Instala%C3%A7%C3%A3o%20e%20publica%C3%A7%C3%A3o.md).

## Executar a extensão

```text
cd frontend
npm ci
npm run build:local
```

Em `chrome://extensions`, ativar o modo de desenvolvedor e carregar a pasta `frontend/dist-local`. Esse pacote aparece como **Shop Safe (Local)** e acessa `http://localhost:3000/analysis`. Desative outra cópia da extensão durante o teste.

`npm run build` gera `frontend/dist` para a API externa configurada. A URL padrão é `https://tcc-shop-safe.onrender.com`; `VITE_API_BASE_URL` pode alterá-la durante o build. Os pacotes local e externo ficam separados. A versão atual é 1.2.1.

## Treinar os modelos

Na raiz, em PowerShell:

```powershell
python -m venv .venv-ml
.\.venv-ml\Scripts\python.exe -m pip install -r ml/requirements.txt
.\.venv-ml\Scripts\python.exe ml/train.py --model all --limit 100000
.\.venv-ml\Scripts\python.exe ml/verify_price.py
```

Linux/macOS: usar `.venv-ml/bin/python` no lugar de `.venv-ml\Scripts\python.exe`. Dados brutos são baixados para `ml/data` e ficam fora do Git. Treino/validação/teste são separados por grupos. Os relatórios registram fontes, hashes e métricas. Não é necessário retreinar para executar os modelos já incluídos.

No teste retrospectivo, o classificador de domínio v2 teve acurácia de **95,82% no limiar operacional 0,8**, em 18.294 casos; sentimento teve **94,59% no limiar binário 0,5**, em 20.311 casos. Esses números não representam acurácia de todas as fraudes de compra. O modelo anterior foi retirado por falsos positivos e permanece documentado como histórico.

## Verificações

```text
# Dentro de backand/backend-api
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build

# Dentro de frontend
npm test
npm run build

# Na raiz, após o build do backend
node ml/smoke-built.cjs
node docs/validate-vault.mjs
node scripts/check-secrets.mjs --history
```

A CI executa verificações de API, extensão, modelos e documentação. Não baixa bases brutas nem treina automaticamente. Os arquivos `.env`, segredos, ambientes virtuais e builds são excluídos. Veja [CONTRIBUTING.md](CONTRIBUTING.md) e [SECURITY.md](SECURITY.md).

## Dados, licenças e limites

- PhiUSIIL: CC BY 4.0, com atribuição registrada.
- B2W-Reviews01: **CC BY-NC-SA 4.0**. O modelo de sentimento derivado é destinado a uso acadêmico/não comercial, conforme registrado no model card. Uso comercial exige outra base ou autorização adequada.
- Esta publicação não concede uma licença geral de uso do código que não tenha sido definida pelo autor; as condições das fontes de terceiros permanecem aplicáveis.
- PostgreSQL, feedback rotulado, avaliação temporal/externa de fraude e autenticação de comentários permanecem pendentes. Consulte o [roteiro](docs/obsidian-shop-safe/14%20-%20Pend%C3%AAncias%20e%20roteiro.md).

## Autor

**Luiz Eduardo Uber** — Engenharia de Software, Centro Universitário Católica de Santa Catarina.
