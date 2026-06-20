# Robot Catty — Wiring Documentation

## Схема подключения

### Arduino Uno (Голова)

| Пин | Компонент | Описание |
|-----|-----------|----------|
| D3  | RGB R     | Красный светодиод (через 220Ω) |
| D5  | RGB G     | Зелёный светодиод (через 220Ω) |
| D6  | RGB B     | Синий светодиод (через 220Ω) |
| D4  | Servo     | Левый глаз |
| D7  | Servo     | Правый глаз |
| D8  | Servo     | Челюсть |
| D9  | Servo     | Поворот головы |
| D10 | Servo     | Шея ↕ |
| D11 | Servo     | Шея ↔ |
| GND | RGB GND   | Общий провод |

### Arduino Mega 2560 (Тело)

| Пин | Компонент | Описание |
|-----|-----------|----------|
| D2  | Servo     | Левое плечо |
| D3  | Servo     | Правое плечо |
| D4  | Servo     | Левый локоть |
| D5  | Servo     | Правый локоть |
| D6  | Servo     | Левое плечо 2 (future) |
| D7  | Servo     | Правое плечо 2 (future) |
| D8  | Servo     | Левый локоть 2 (future) |
| D9  | Servo     | Правый локоть 2 (future) |

### Raspberry Pi

| USB | Устройство |
|-----|------------|
| USB0 | Arduino Mega 2560 (/dev/ttyACM0) |
| USB1 | Arduino Uno CH340 (/dev/ttyUSB0) |

## Питание

⚠️ **ВАЖНО**: Сервоприводы НЕ питать от Arduino 5V!

- Arduino Uno: питание от USB Raspberry Pi
- Arduino Mega: питание от USB Raspberry Pi
- Сервоприводы: отдельный блок питания 5-6V, минимум 2А на каждый серво
- GND всех источников питания соединить вместе

## Serial протокол

### Uno (Голова)

```
SERVO:<name>:<angle>  — Установить угол серво (0-180)
RGB:<r>,<g>,<b>       — Установить цвет RGB (0-255)
OFF                   — Выключить RGB
FADE:<r>,<g>,<b>      — Плавный переход к цвету
BLINK                 — Режим мигания
PRESET:<name>         — Пресет цвета (red, green, blue, white, yellow, cyan, magenta, orange, pink, purple)
STATUS                — Получить текущее состояние
```

### Mega (Тело)

```
SERVO:<name>:<angle>  — Установить угол серво (0-180)
CENTER                — Центрировать все серво
STATUS                — Получить текущее состояние
```

## Веб-интерфейс

После запуска сервера на Pi:
```
http://<pi-ip>:3000
```

## Запуск

```bash
# На Raspberry Pi
cd ~/robot-katty/server
npm install
npm start

# Автозапуск через crontab
@reboot cd /home/ruslan/robot-katty/server && npm start
```
