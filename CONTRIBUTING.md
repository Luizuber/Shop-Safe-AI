# Contribuindo com o Shop Safe AI

## Organização

O código é organizado em `frontend/`, `backand/backend-api/`, `ml/` e `docs/`. O nome histórico `backand` é mantido para preservar os caminhos de instalação e implantação.

Criar branches de trabalho a partir de `main`, por exemplo `feat/avaliacao-modelo`, `fix/captura-preco` ou `docs/metodologia`. Evitar force-push em branches compartilhadas. Antes de alterar a estrutura de um modelo, atualizar também transformação de características, metadados, testes e documentação.

## Commits

Usar Conventional Commits: `feat(api): ...`, `fix(ml): ...`, `test(extension): ...`, `docs(tcc): ...`, `ci: ...`. Cada commit deve ter um objetivo identificável; evitar misturar alterações de interface, segredos de ambiente e treinamento em um único commit.

Não versionar `.env`, credenciais, `node_modules`, builds, dados brutos, ambientes virtuais ou o estado pessoal do Obsidian. Documentar nomes das variáveis e usar valores fictícios nos exemplos. Nenhuma chave precisa ser compartilhada para revisar o código.

## Validação

Backend, dentro de `backand/backend-api`:

```text
npm ci
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build
```

Frontend, dentro de `frontend`:

```text
npm ci
npm test
npm run build
```

Na raiz:

```text
node scripts/check-secrets.mjs --history
node docs/validate-vault.mjs
node ml/smoke-built.cjs
```

Treinamento e bases: consulte `ml/MODEL_CARD.md`. Não atribuir ao ML capacidades não avaliadas. Relatar falsos positivos e falsos negativos, preservar os relatórios anteriores e separar métrica retrospectiva de desempenho em produção.

## Pull requests

Descrever problema, alteração de comportamento e evidência de validação. Incluir impacto em API/modelos/dados e uma nota sobre eventual necessidade de novo build ou deploy. Capturas devem representar a interface real; diagramas devem estar identificados como ilustrações.
