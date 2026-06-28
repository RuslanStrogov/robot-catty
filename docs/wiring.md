# Robot Catty — Wiring Documentation

Полное описание подключения Robot Catty. Также актуальная информация продублирована в [README.md](../README.md).

## Схема подключения

### Arduino Uno (Голова)

| Пин | Компонент | Описание |
|-----|-----------|----------|
| D3 | RGB R | Красный светодиод (через 220Ω) |
| D5 | RGB G | Зелёный светодиод (через 220Ω) |
| D6 | RGB B | Синий светодиод (через 220Ω) |
| D4 | Servo | Левый глаз ↔ |
| D7 | Servo | Правый глаз ↔ |
| D8 | Servo | Челюсть (открыть/закрыть) |
| D9 | Servo | Поворот головы ↔ |
| D10 | Servo | Шея ↕ (наклон) |
| D11 | Servo | Шея ↔ (поворот) |
| GND | RGB GND | Общий провод |

### Arduino Mega 2560 (Тело)

| Пин | Компонент | Описание |
|-----|-----------|----------|
| D2 | Servo | Левое плечо |
| D3 | Servo | Правое плечо |
| D4 | Servo | Левый локоть |
| D5 | Servo | Правый локоть |
| D6-D9 | Servo | Резерв (future expansion) |

### Raspberry Pi

| USB | Устройство |
|-----|------------|
| USB0 | Arduino Mega 2560 (/dev/ttyACM0) |
| USB1 | Arduino Uno CH340 (/dev/ttyUSB0) |

## Питание

⚠️ **ВАЖНО**: Сервоприводы НЕ питать от Arduino 5V!

- **Arduino Uno/Mega**: питание от USB Raspberry Pi
- **Сервоприводы (7шт)**: отдельный блок питания 5-6V, минимум 2А на каждый серво
- **RGB LED**: питание от Arduino через резисторы 220Ω
- **GND всех источников питания соединить вместе**

## Serial протокол (9600 baud)

### Uno (Голова)

| Команда | Описание | Пример |
|---------|----------|--------|
| `SERVO:<name>:<angle>` | Установить угол серво (0-180) | `SERVO:eyeL:120` |
| `RGB:<r>,<g>,<b>` | Установить цвет (0-255) | `RGB:255,128,0` |
| `OFF` | Выключить RGB | `OFF` |
| `FADE:<r>,<g>,<b>` | Плавный переход | `FADE:0,0,255` |
| `BLINK` | Режим мигания | `BLINK` |
| `PRESET:<name>` | Готовый цвет | `PRESET:red` |
| `STATUS` | Текущее состояние | `STATUS` |

Пресеты: `red`, `green`, `blue`, `white`, `yellow`, `cyan`, `magenta`, `orange`, `pink`, `purple`

### Mega (Тело)

| Команда | Описание | Пример |
|---------|----------|--------|
| `SERVO:<name>:<angle>` | Установить угол серво (0-180) | `SERVO:shoulderL:120` |
| `CENTER` | Центрировать все серво | `CENTER` |
| `STATUS` | Текущее состояние | `STATUS` |

## Запуск

```bash
# На Raspberry Pi
cd ~/robot-catty/server
npm install
npm start

# Автозапуск через crontab
@reboot cd /path/to/robot-catty/server && npm start
```
