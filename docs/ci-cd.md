# 🔄 CI/CD и Git Flow

## Ветки

| Ветка | Назначение |
|-------|-----------|
| `master` | Стабильный релиз. Только через PR из `dev` |
| `dev` | Активная разработка. Сюда идут все коммиты |

## Процесс разработки

```
1. Разработка в dev → git push origin dev
2. GitHub Actions запускает: lint + compile + test
3. Если всё зелёно → открываем PR dev → master
4. При merge в master: GitHub Actions строит релиз и деплоит на Pi
```

## GitHub Actions Pipeline

### Jobs:
1. **lint** — проверка синтаксиса Node.js, валидация HTML
2. **firmware** — компиляция servo_head.hex (Uno) + servo_body.hex (Mega)
3. **test** — smoke test сервера (запуск + curl endpoints)
4. **release** — сборка релиз-пакета → GitHub Release (только master)
5. **deploy** — pull на Pi, pm2 restart, health check (только master)

### Триггеры:
- `push` в `master` или `dev`
- `pull_request` в `master`

## Релиз

Каждый push в master создаёт GitHub Release:
- Тег: `v{run_number}`
- Артефакт: `robot-catty-{run_number}.tar.gz`
- Содержимое: firmware HEX + web app + скрипты прошивки

## Деплой на Pi

На Raspberry Pi настроен self-hosted GitHub Runner:
1. `git pull origin master`
2. `npm install --production`
3. `pm2 restart robot-catty`
4. Health check: `curl http://localhost:3000/api/status`
