---
tags: [roadmap, pendencias]
---

# Pendências e roteiro

## Implementado localmente

- [x] Treinamento supervisionado real de URLs e sentimento.
- [x] Separação de treino/validação/teste por grupos.
- [x] Relatórios de métricas, versões e hashes.
- [x] Inferência na API e testes de paridade.
- [x] Modelo não supervisionado de faixa de preço por lojas independentes.
- [x] Estados explícitos para falta de modelo ou de dados.
- [x] Exibição de ML na análise detalhada da extensão.
- [x] Documentação navegável para Obsidian.

## Publicação e validação de uso

- [ ] Revisar e publicar o commit no repositório/Render.
- [ ] Conferir modelos `ready` na API pública.
- [ ] Conferir CORS nas páginas suportadas em produção.
- [ ] Testar a extensão 1.2.1 no Chrome com produto real e fora da rede local.
- [ ] Fazer avaliação de usabilidade com tarefas e critérios definidos.
- [ ] Resolver definitivamente o erro de navegador se voltar a ocorrer; testes HTTP isolados não o encerram.

## Evolução científica

- [ ] Testar phishing com base temporal/externa e domínios atuais de lojas brasileiras.
- [ ] Avaliar vieses de HTTPS, estrutura de caminho e origem da coleta.
- [ ] Calibrar probabilidades e comparar modelos usando somente validação.
- [ ] Construir base rotulada de **fraude de compra/vendedor**, distinta de phishing.
- [ ] Avaliar sentimento com amostra anotada manualmente e avaliações mistas.
- [ ] Anotar pares equivalentes/não equivalentes para um futuro modelo de matching de produtos.
- [ ] Coletar preços com datas, condição, frete e modalidade para avaliação de mercado e previsão futura.
- [ ] Estimar impacto de referências contaminadas no KDE.

## Persistência e governança

- [ ] PostgreSQL e migrações para análise/feedback, conforme requisito planejado.
- [ ] Política de privacidade, retenção e minimização de comentários.
- [ ] Fluxo de feedback com rótulos independentes e consentimento.
- [ ] Monitoramento de mudança dos dados e revisão de versões.
- [ ] Obter autorização/substituir B2W antes de uso comercial do modelo derivado.
- [ ] Confrontar a implementação com o DOCX integral do TCC quando disponível.

Nenhum checkbox pendente representa uma funcionalidade já entregue. Relacionadas: [[08 - Métricas e evidências]], [[10 - Instalação e publicação]].
