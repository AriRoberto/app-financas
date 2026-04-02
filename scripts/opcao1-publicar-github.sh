#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "Erro: git não encontrado no PATH." >&2
  exit 1
fi

if [ $# -lt 1 ] || [ $# -gt 2 ]; then
  echo "Uso: $0 <repo-url> [branch-destino]"
  echo "Exemplo: $0 https://github.com/AriRoberto/app-ams.git main"
  exit 1
fi

REPO_URL="$1"
TARGET_BRANCH="${2:-main}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Erro: execute este script dentro de um repositório Git." >&2
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [ -z "$(git status --porcelain)" ]; then
  echo "OK: working tree limpo."
else
  echo "Erro: existem alterações não commitadas. Faça commit antes de publicar." >&2
  git status --short
  exit 1
fi

if [ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]; then
  echo "INFO: branch atual '$CURRENT_BRANCH' será enviada para '$TARGET_BRANCH'."
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

echo "INFO: remoto origin configurado para: $REPO_URL"

if [ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]; then
  git push -u origin "$CURRENT_BRANCH:$TARGET_BRANCH"
else
  git push -u origin "$TARGET_BRANCH"
fi

echo "Sucesso: publicação concluída em '$REPO_URL' (branch '$TARGET_BRANCH')."
