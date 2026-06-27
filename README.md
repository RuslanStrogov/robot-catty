# 🤖 Robot Catty

Raspberry Pi + Arduino робот с веб-интерфейсом управления.

| Схема подключения | Веб-интерфейс |
|:---:|:---:|
| ![Схема](docs/wiring-diagram.png) | ![UI](docs/ui-screenshot.png) |

> 📸 Замените `docs/wiring-diagram.png` и `docs/ui-screenshot.png` на реальные фото.

## Архитектура

```
┌─────────────┐     USB      ┌──────────────┐
│             │──────────────│ Arduino Uno  │ Голова: 6 серво + RGB LED
│  Raspberry  │              │ (CH340)      │
│  Pi 3B      │              └──────────────┘
│             │     USB      ┌──────────────┐
│  Node.js    │──────────────│ Arduino Mega │ Тело: 4 серво (+4 future)
│  Server     │              │ 2560 R3      │
│  :3000      │              └──────────────┘
│             │
│  Angular UI │◄── WebSocket ── Браузер
└─────────────┘
```

## Компоненты

| Компонент | Роль | Подключение |
|-----------|------|-------------|
| Raspberry Pi 3B | Контроллер, веб-сервер | Ethernet/WiFi |
| Arduino Uno (CH340) | Голова: 6 серво + RGB LED | USB → /dev/ttyUSB0 |
| Arduino Mega 2560 R3 | Тело: 4 серво | USB → /dev/ttyACM0 |
| RGB LED (4-pin) | Индикация глаз | Uno D3/D5/D6 |
| Сервоприводы (×10) | Движение | Uno D4,D7-D11 / Mega D2-D5 |

## Подключённые модули

### Веб-интерфейс — панель «Модули»

В UI есть отдельная панель «Подключённые модули», которая отображает все обнаруженные устройства на обеих Arduino платах:

| Плата | Модуль | Пин | Тип | Отображаемое значение |
|-------|--------|-----|-----|----------------------|
| Arduino Uno | RGB LED | 9/10/11 | rgb | HEX цвет или OFF |
| Arduino Uno | eyeL | D4 | servo | Угол (°) |
| Arduino Uno | eyeR | D7 | servo | Угол (°) |
| Arduino Uno | jaw | D8 | servo | Угол (°) |
| Arduino Uno | headRot | D9 | servo | Угол (°) |
| Arduino Uno | neckUD | D10 | servo | Угол (°) |
| Arduino Uno | neckLR | D11 | servo | Угол (°) |
| Arduino Mega | shoulderL | D2 | servo | Угол (°) |
| Arduino Mega | shoulderR | D3 | servo | Угол (°) |
| Arduino Mega | elbowL | D4 | servo | Угол (°) |
| Arduino Mega | elbowR | D5 | servo | Угол (°) |

Статус каждой платы индицируется точкой: 🟢 Online / 🔴 Offline.

## Структура проекта

```
robot-catty/
├── firmware/
│   ├── servo_head/servo_head.ino    # Uno — голова (6 серво + RGB)
│   └── servo_body/servo_body.ino    # Mega — тело (4 серво)
├── server/
│   ├── package.json                 # Node.js зависимости
│   ├── server.js                    # Express + WebSocket сервер
│   ├── services/
│   │   ├── arduino.js               # Serial связь с Arduino
│   │   └── robot.js                 # Логика робота + анимации
│   └── public/
│       └── index.html               # Angular веб-интерфейс
├── config/
│   ├── arduino_config.md            # Настройки плат
│   └── servo_config.json            # Конфигурация серво (пины, лимиты)
├── docs/
│   └── wiring.md                    # Схема подключения
├── scripts/
│   ├── rgb_bot.py                   # Telegram бот управления RGB
│   └── demo.py                      # Демо-режим (автозапуск)
├── remote/
│   └── rgb_led_remote.py            # Удалённое управление с Windows
├── ISSUES.md                        # Известные задачи и проблемы
├── CREATE_ISSUES.md                 # Шаблоны для GitHub Issues
└── README.md                        # Этот файл
```

## Сервоприводы

### Голова (Arduino Uno)

| Серво | Пин | Описание |
|-------|-----|----------|
| eyeL | D4 | Левый глаз |
| eyeR | D7 | Правый глаз |
| jaw | D8 | Челюсть |
| headRot | D9 | Поворот головы |
| neckUD | D10 | Шея вверх-вниз |
| neckLR | D11 | Шея влево-вправо |

### Тело (Arduino Mega 2560)

| Серво | Пин | Описание |
|-------|-----|----------|
| shoulderL | D2 | Левое плечо |
| shoulderR | D3 | Правое плечо |
| elbowL | D4 | Левый локоть |
| elbowR | D5 | Правый локоть |

### Будущее расширение (Mega)

| Серво | Пин | Описание |
|-------|-----|----------|
| shoulderL2 | D6 | Левое плечо 2 |
| shoulderR2 | D7 | Правое плечо 2 |
| elbowL2 | D8 | Левый локоть 2 |
| elbowR2 | D9 | Правый локоть 2 |

## RGB LED

4-pin RGB LED (общий катод):

| Цвет | Пин | Резистор |
|------|-----|----------|
| Red | D3 (PWM) | 220Ω |
| Green | D5 (PWM) | 220Ω |
| Blue | D6 (PWM) | 220Ω |
| GND | GND | — |

## Serial протокол (9600 baud)

### Arduino Uno (Голова)

| Команда | Описание | Пример |
|---------|----------|--------|
| `SERVO:<name>:<angle>` | Установить угол серво (0-180) | `SERVO:headRot:120` |
| `RGB:<r>,<g>,<b>` | Установить цвет (0-255) | `RGB:255,128,0` |
| `OFF` | Выключить RGB | `OFF` |
| `FADE:<r>,<g>,<b>` | Плавный переход к цвету | `FADE:0,0,255` |
| `BLINK` | Режим мигания | `BLINK` |
| `PRESET:<name>` | Готовый цвет | `PRESET:red` |
| `STATUS` | Текущее состояние | `STATUS` |

### Arduino Mega (Тело)

| Команда | Описание | Пример |
|---------|----------|--------|
| `SERVO:<name>:<angle>` | Установить угол серво (0-180) | `SERVO:shoulderL:120` |
| `CENTER` | Центрировать все серво | `CENTER` |
| `STATUS` | Текущее состояние | `STATUS` |

### Пресеты цветов

`red`, `green`, `blue`, `white`, `yellow`, `cyan`, `magenta`, `orange`, `pink`, `purple`

## Веб-интерфейс

Запуск сервера на Pi:
```bash
cd ~/robot-katty/server
npm install
npm start
```

Открыть в браузере: `http://<pi-ip>:3000`

### Возможности UI

- 🎛️ **Управление серво** — слайдеры для всех 10 серво (голова + тело)
- 💡 **RGB LED** — слайдеры R/G/B + 10 пресетов + кнопка выключения
- 🎬 **Анимации:**
  - `wave` — махать рукой
  - `nod` — кивать головой
  - `shake` — мотать головой
  - `dance` — танцевать
  - `lookAround` — оглядываться
  - `blink` — мигание RGB
- 📊 **Статус в реальном времени** — WebSocket
- 📋 **Лог** — все команды и события

## API

### REST endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/status` | Статус подключения + состояние |
| POST | `/api/servo` | `{board, servo, angle}` |
| POST | `/api/rgb` | `{r, g, b}` |
| POST | `/api/rgb/off` | Выключить RGB |
| POST | `/api/rgb/preset` | `{name}` |
| POST | `/api/animation` | `{name, params}` |
| POST | `/api/animation/stop` | Остановить анимацию |

### WebSocket

Подключение: `ws://<pi-ip>:3000`

Отправка команд:
```json
{"type": "servo", "board": "head", "servo": "headRot", "angle": 120}
{"type": "rgb", "r": 255, "g": 0, "b": 0}
{"type": "preset", "name": "red"}
{"type": "animation", "name": "wave"}
{"type": "stop"}
```

Получение состояния:
```json
{"type": "state", "data": {"servos": {...}, "rgb": {...}, "animation": null}}
```

## Демо режим

Автоматический запуск при старте системы (crontab `@reboot`):

1. 🔴 Моргание красным — 1 минута
2. Каждый пресет — 3 минуты с плавным переходом

## Telegram бот

Управление RGB LED через Telegram.

**Команды:** `/red`, `/green`, `/blue`, `/white`, `/yellow`, `/cyan`, `/magenta`, `/orange`, `/pink`, `/purple`, `/off`, `/status`, `/blink`, `/color R G B`, `/demo`, `/stop`

> ⚠️ Токен бота нужно запросить у @BotFather и вставить в `scripts/rgb_bot.py`

## Установка на Raspberry Pi

```bash
# Клонирование
git clone https://github.com/RuslanStrogov/robot-catty.git
cd robot-katty

# Установка Node.js зависимостей
cd server
npm install

# Запуск
npm start

# Автозапуск (crontab)
crontab -e
# Добавить:
# @reboot cd /path/to/robot-catty/server && /usr/bin/node server.js
```

## Загрузка скетчей

```bash
# Arduino Uno (голова)
arduino-cli compile -b arduino:avr:uno firmware/servo_head/
arduino-cli upload -b arduino:avr:uno -p /dev/ttyUSB0 firmware/servo_head/

# Arduino Mega (тело)
arduino-cli compile -b arduino:avr:mega firmware/servo_body/
arduino-cli upload -b arduino:avr:mega -p /dev/ttyACM0 firmware/servo_body/
```

## Питание

⚠️ **ВАЖНО**: Сервоприводы НЕ питать от Arduino 5V!

- **Arduino Uno/Mega**: питание от USB Raspberry Pi
- **Сервоприводы**: отдельный блок питания 5-6V, минимум 2А на каждый серво
- **RGB LED**: питание от Arduino через резисторы 220Ω
- **GND**: соединить GND всех источников питания вместе

## Известные проблемы

- Arduino Uno CH340: все фюзы = 0x00 (125kHz клок), но serial работает на 9600 baud
- Для компиляции на Pi нужен Arduino IDE или PlatformIO (версия atmelavr ≤5.3.0 для корректной работы с Mega 2560)
- AVR core хранится в `/tmp/` или `~/.platformio/` — теряется после перезагрузки при использовании Snap
- Mega 2560: Servo library конфликтует с Timer1 — используйте прямую ШИМ или `Servo.h` с `lib_deps`

Подробнее в [ISSUES.md](ISSUES.md)

## Лицензия

MIT
