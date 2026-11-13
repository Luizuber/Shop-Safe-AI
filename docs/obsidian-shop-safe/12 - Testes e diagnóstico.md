---
tags: [testes, diagnostico]
---

# Testes e diagnóstico

Validação local após a correção do modelo de domínio v2: **45 testes unitários do backend, 5 testes de API e 18 testes do frontend aprovados**. Builds Nest e Vite executados. Essas contagens não são amostras de ML e não representam acurácia.

## Comandos

Backend:

```powershell
cd backand/backend-api
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

Frontend:

```powershell
cd frontend
npm test
npm run build
```

Vitest não aceita a opção `--runInBand` do Jest. No Windows, restrições de criação de processos podem causar `spawn EPERM` no Vite; isso é diferente de falha de TypeScript ou de teste.

## Cobertura relevante

- Vetor e probabilidade do classificador de URL reproduzem Python.
- TF-IDF e probabilidade de sentimento reproduzem Python.
- Modelos reais carregados e status explícito.
- A raiz, alias `www.` e caminhos longos do mesmo domínio têm a mesma previsão de domínio; um falso positivo isolado não zera a pontuação geral.
- Abstenção para texto desconhecido e URL inválida.
- KDE reproduz quantis/CDF calculados por SciPy/scikit-learn.
- Lojas repetidas, preço inválido e a loja atual não viram referências independentes.
- Referência isolada atípica é excluída antes do ajuste.
- Poucos dados resultam em `UNKNOWN`.
- API devolve `machineLearning`, métricas e campos de avaliações.
- Filtros de modelo, geração, capacidade, cor e modalidade.
- Extração preserva cor após hífen e reconhece preço/nota/quantidade da Amazon.

Na raiz, `node ml/smoke-built.cjs` verifica os hashes dos modelos copiados no build e executa uma análise controlada com os serviços compilados. O cenário usa ofertas de teste; não é uma busca real nem evidência de publicação no Render.

## Diagnóstico em produção

| Sintoma | Verificação |
| --- | --- |
| `Hello World!` abre, análise falha | Testar POST `/analysis`; a raiz não executa pesquisa |
| Falha só na página da loja | Verificar console, requisição e preflight CORS |
| Mensagem de timeout | Verificar tempo de despertar do Render e consultas SerpAPI |
| “Modo de compatibilidade” | Servidor devolvendo contrato antigo |
| Modelos `unavailable` | Artefatos ausentes/incompatíveis ou build sem cópia de assets |
| Preço `UNKNOWN` | Menos de 5 lojas independentes ou preço atual ausente |
| Cor/modelo errado | Conferir título capturado, query e resultado antes/depois dos filtros |
| Histórico parece antigo | Refazer análise atual; histórico não é recalculado automaticamente |

Não alegar que erro de tela foi reproduzido apenas porque a API respondeu em teste direto. A confirmação final exige teste no navegador com a extensão carregada.

Relacionadas: [[08 - Métricas e evidências]], [[10 - Instalação e publicação]].
