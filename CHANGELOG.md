# Robot Catty — История разработки (Changelog)

## [2026-06-28] — Рефакторинг: 3 серво + Web UI

### Изменения механики
- **Uno (Голова)**: 6 → 3 сервопривода
  - `eyeLR` (D4) — оба глаза влево-право
  - `eyeUD` (D7) — оба глаза вверх-вниз
  - `jaw` (D8) — челюсть
- RGB LED остался на D3/D5/D6 без изменений
- **Mega (Тело)**: 4 серво (shoulderL/R, elbowL/R) — без изменений

### Веб-интерфейс
- Новый UI: тёмная тема, слайдеры серво, RGB-контролы, 10 пресетов
- Node.js сервер: Express + WebSocket + Serial + REST API
- Реальное время через WebSocket

### Документация
- ASCII-схема подключения в README
- Баннер + shields.io badges
- Галерея фото (8 изображений)
- Раздел «Ручное управление» (Serial / Web / Telegram)

### Скрипты
- `scripts/linux/flash_all.sh` — авто-прошивка Uno + Mega
- `scripts/linux/build_release.sh` — сборка релиз-пакета

---

## [2026-06-20] — Начальная архитектура

### Создано
- Много-платная архитектура: Uno (голова) + Mega (тело)
- RGB LED на Uno (D3/D5/D6) с протоколом `R,G,B`, `FADE`, `PRESETS`, `BLINK`
- Демо-режим: мигание + цикл по 10 цветам
- Telegram бот для управления RGB
- Веб-сервер на Node.js + Angular UI
- Serial протокол 9600 baud: `SERVO`, `RGB`, `STATUS`, `HOME`, `CENTER`

### Компоненты
- Raspberry Pi 3B — контроллер + веб-сервер
- Arduino Uno CH340 — `/dev/ttyUSB0`
- Arduino Mega 2560 R3 — `/dev/ttyACM0`

---

## Протокол управления

### Uno (Голова)
| Команда | Описание | Пример |
|---------|----------|--------|
| `SERVO:<name>:<angle>` | Установить угол (0-180) | `SERVO:eyeLR:45` |
| `RGB:<r>,<g>,<b>` | Установить цвет | `RGB:255,128,0` |
| `OFF` | Выключить RGB | `OFF` |
| `FADE:<r>,<g>,<b>` | Плавный переход | `FADE:0,0,255` |
| `BLINK` | Мигание | `BLINK` |
| `PRESET:<name>` | Пресет цвета | `PRESET:red` |
| `HOME` | Центр (90°) | `HOME` |
| `STATUS` | Текущее состояние | `STATUS` |

### Mega (Тело)
| Команда | Описание | Пример |
|---------|----------|--------|
| `SERVO:<name>:<angle>` | Установить угол | `SERVO:shoulderL:120` |
| `CENTER` | Центрировать все | `CENTER` |
| `STATUS` | Текущее состояние | `STATUS` |

---

## Питание

⚠️ Сервоприводы НЕ питать от Arduino 5V!

- Arduino: USB Raspberry Pi
- Серво: отдельный БП 5-6V, 2A min на серво
- GND: общий между всеми источниками

---

## Лицензия

MIT
