# Migração para novo repositório do App Municipal

## Novo repositório local criado
- Caminho: `/workspace/cidade-atende-app`
- Status: repositório Git inicializado com commit inicial.

## Nome sugerido para o app
**CidadeAtende** (recomendado)

### Outras opções
- Prefeitura na Mão
- Meu Protocolo Municipal
- Atende Cidade

## Conteúdo inicial do novo repositório
- `README.md` com visão resumida do produto.
- `docs/APLICATIVO_MUNICIPAL_SERVICOS.md` com a especificação técnica completa.

## Próximos passos para publicar remotamente (GitHub/GitLab)
1. Criar um novo repositório remoto (ex.: `cidade-atende-app`).
2. No diretório `/workspace/cidade-atende-app`, configurar remote:
   - `git remote add origin <URL_DO_REPOSITORIO>`
3. Publicar:
   - `git push -u origin master` (ou renomear para `main` antes do push).
