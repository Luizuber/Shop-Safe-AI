---
tags: [ml, treinamento, reproducibilidade]
---

# Treinamento e reprodução

## Ambiente isolado

Python 3.11 e dependências em `ml/requirements.txt`. O ambiente fica na pasta ignorada `.venv-ml`; não altera a instalação global de Python.

Execute na raiz do projeto:

```powershell
python -m venv .venv-ml
.\.venv-ml\Scripts\python.exe -m pip install -r ml/requirements.txt
.\.venv-ml\Scripts\python.exe ml/train.py --model all --limit 100000
.\.venv-ml\Scripts\python.exe ml/verify_price.py
```

Alternativas: `--model security`, `--model sentiment`; `--limit 0` usa todas as linhas válidas. Usar todas as linhas cria outro experimento e exige nova avaliação.

## Pipeline

1. Baixa os arquivos oficiais, uma vez, para `ml/data`.
2. Lê somente as colunas usadas.
3. Normaliza, deduplica e remove conflitos de rótulo. Na segurança v2, deduplica por hostname e remove hosts com classes conflitantes; no sentimento, por texto normalizado.
4. Seleciona amostra com semente 42.
5. Separa treino/validação/teste por grupos.
6. Ajusta transformações e modelos somente em treino.
7. Mede desempenho em validação e teste sem retreinar nesses conjuntos.
8. Exporta JSON de modelo, relatório e amostras de paridade.

Na segurança, os grupos são sufixos conservadores de domínio. No sentimento, são identificadores de produto. Essa divisão é mais exigente que sortear linhas de um mesmo domínio/produto entre os conjuntos.

## Artefatos

| Arquivo | Conteúdo |
| --- | --- |
| `src/analysis/ml/models/security.json` | Pesos do classificador de URL |
| `src/analysis/ml/models/sentiment.json` | Vocabulário, IDF e pesos de sentimento |
| `*.parity.json` | Exemplos para comparar inferência Python e TypeScript |
| `ml/reports/security.json` | Métricas, hashes, versão, divisões e limitações |
| `ml/reports/sentiment.json` | Métricas, hashes e supervisão por nota |

O identificador do modelo contém hash dos pesos. O relatório guarda hash SHA-256 do arquivo fonte e do artefato completo. A inferência não executa modelos serializados em pickle.

As amostras de paridade são fixtures de teste e não devem ser usadas para ajustar os modelos. A fixture de preço é sintética e apenas comprova equivalência numérica com scikit-learn/SciPy.

## Reprodutibilidade e manutenção

As URLs de download podem mudar no futuro. Comparar SHA-256 ao relatório anterior antes de afirmar que a base é idêntica. Para um novo modelo, manter o relatório anterior e registrar a troca em [[13 - Decisões e evolução]].

Não há retreinamento automático com cliques ou resultados do usuário. Isso exige coleta consentida, rótulos independentes, defesa contra contaminação e governança da base.

Fonte técnica: [model card anexado](Anexos/MODEL_CARD.md). Relacionadas: [[08 - Métricas e evidências]], [[15 - Referências e licenças]].
