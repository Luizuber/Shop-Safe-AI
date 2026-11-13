---
tags: [seguranca, privacidade]
---

# Segurança e privacidade

## Proteções no código

- Validação de entrada por pipe: tipos, limites, valores finitos e protocolo de URL.
- Corpo JSON limitado a 32 KB, cabeçalhos de segurança e rate limiting no backend.
- CORS configurável. Não confundir autorização do navegador com autenticação de usuário.
- URL do produto sem credenciais, query ou fragmento no contrato validado.
- Links externos sanitizados e `noopener noreferrer` na interface.
- Chave da SerpAPI somente no servidor; parâmetros sensíveis removidos de links e erros sanitizados.
- Nenhuma visita aos sites de phishing da base durante treinamento.
- Modelos em JSON com verificação de esquema/dimensões/valores, sem desserialização de pickle em produção.
- Não há rota pública para treinar ou substituir modelos.

## Dados capturados e enviados

São enviados nome, preço, vendedor, URL sanitizada, configuração de desconto e até 20 comentários disponíveis. Comentários podem conter dados pessoais inseridos pelos próprios autores; antes de disponibilizar amplamente, é necessário avaliar minimização/redação desses textos e política de privacidade adequada.

O histórico de até 50 análises fica no armazenamento da extensão. Não existe envio automático desse histórico para treinamento ou banco central.

Na base B2W, o script lê somente produto, nota e texto. Não utiliza idade, gênero, estado ou identificador do autor.

## O que não foi comprovado

Esta implementação não é pentest completo e não certifica segurança da infraestrutura. Não verifica identidade do vendedor, existência de estoque ou entrega. Não calcula fraude a partir de relatos de compra confirmados.

A chave SerpAPI e os arquivos `.env` não devem estar neste cofre. A documentação usa nomes de variáveis, sem valores secretos.

Relacionadas: [[04 - Segurança e phishing]], [[15 - Referências e licenças]].
