# Fontes e atribuições dos modelos

## Modelo de domínio

Base **PhiUSIIL Phishing URL (Website)**, Arvind Prasad e Shalini Chandra, UCI Machine Learning Repository, dataset 967, 2024.

- Fonte: https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset
- Licença: https://creativecommons.org/licenses/by/4.0/
- Alterações: normalização e deduplicação de hosts, remoção de conflitos, extração de características e treinamento de regressão logística. Os pesos não são o modelo original do artigo.

## Modelo de sentimento

Base **B2W-Reviews01: An Open Product Reviews Corpus**, Livy Real, Marcio Oshiro e Alexandre Mafra, B2W Digital, 2019.

- Fonte: https://github.com/americanas-tech/b2w-reviews01
- Licença: https://creativecommons.org/licenses/by-nc-sa/4.0/
- Alterações: seleção de texto/nota/produto, normalização, deduplicação, supervisão por notas 1–2 e 4–5, TF-IDF e treinamento de regressão logística.
- O artefato de sentimento derivado e seus relatórios são disponibilizados para fins acadêmicos/não comerciais sob **CC BY-NC-SA 4.0**, respeitando atribuição e compartilhamento pela mesma licença. Não há autorização adicional de uso comercial nesta publicação.

Os dados brutos não são redistribuídos aqui. O treinamento obtém os arquivos nas fontes oficiais. Consulte `MODEL_CARD.md` e os relatórios para escopo, limitações e hashes.
