# Implementação da Opção 1 — Publicar no GitHub

Interpretação adotada para "Opção 1": **publicar o projeto no repositório GitHub**.

## Script implementado
- `scripts/opcao1-publicar-github.sh`

## O que o script faz
1. Valida se o `git` está instalado.
2. Valida parâmetros de entrada (`repo-url` e branch opcional).
3. Garante execução dentro de repositório Git.
4. Bloqueia publicação se houver alterações não commitadas.
5. Configura/atualiza o remote `origin`.
6. Faz `push` da branch atual para a branch de destino.

## Uso
```bash
./scripts/opcao1-publicar-github.sh https://github.com/AriRoberto/app-ams.git main
```
