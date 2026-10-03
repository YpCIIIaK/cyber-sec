#!/bin/bash
# CyberPath — SessionStart hook.
# Проект статический (HTML/CSS/vanilla JS), зависимостей ставить не нужно.
# Прогоняем проверку целостности контента, чтобы регрессии всплывали сразу.
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

if command -v node >/dev/null 2>&1 && [ -f tests/validate.cjs ]; then
  echo "— CyberPath: проверка целостности контента —"
  if node tests/validate.cjs; then
    echo "✅ validate.cjs: контент согласован."
  else
    echo "‼️ validate.cjs: обнаружены проблемы целостности (см. вывод выше)."
  fi
fi

# Хук информационный — не блокируем старт сессии.
exit 0
