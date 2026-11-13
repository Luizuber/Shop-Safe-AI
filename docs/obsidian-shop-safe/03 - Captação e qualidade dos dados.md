---
tags: [dados, extracao]
---

# Captação e qualidade dos dados

O `frontend/src/content/extractor.ts` procura os dados no HTML e nos blocos `application/ld+json`. Há seletores específicos para Amazon e seletores de fallback. Não existe acesso irrestrito a todas as avaliações da loja.

| Campo | Origem | Limitação |
| --- | --- | --- |
| Nome | `#productTitle`, metadados, h1 ou título | Pode conter informação de marketing |
| Preço | JSON-LD e regiões de preço da página | Pode confundir parcela, preço com Pix ou opção selecionada |
| Vendedor | Elemento de vendedor/site/hostname | Texto da página não comprova identidade |
| URL | Endereço atual sem query/fragmento privado | Não preserva todos os parâmetros de variante |
| Nota e quantidade | `aggregateRating` e seletores da loja | Nota é informada pela loja, sem auditoria |
| Comentários | Textos disponíveis no DOM/JSON-LD | Até 20 comentários, não uma amostra aleatória de todos os compradores |

## Atualização dinâmica

A extensão relê a página em 700 ms, 2 s, 5 s e 9 s. Um `MutationObserver` agenda releitura após 1,2 s de alterações. A impressão dos campos evita republicar dados idênticos. O painel identifica mudanças de preço, título, vendedor, nota, quantidade e amostras.

Respostas antigas de requisições concorrentes não podem sobrescrever a análise mais recente. O limite de 30 segundos da extensão precisa ser considerado junto aos tempos das consultas externas.

## Normalização

- Preço brasileiro reconhece milhares e casas decimais.
- A quantidade `(42.817)` é interpretada como 42.817 avaliações, não como nota.
- Comentários duplicados são eliminados; textos muito curtos ou longos são descartados.
- Cores e variantes após hífen no título são preservadas, por exemplo `iPhone Air (256 GB) - Azul céu`.
- O nome é limitado a 200 caracteres para cumprir o contrato de entrada.

## Qualidade e confiança

O sistema não verifica se os comentários foram realmente escritos por compradores. O modelo de sentimento estima a polaridade do texto recebido; não resolve amostragem enviesada ou adulteração da página. Se a coleta falhar, deve apresentar ausência de dados, não inventar avaliações.

Relacionadas: [[06 - Avaliações e sentimento]], [[11 - Segurança e privacidade]].
