# 🤖 robot-catty

Raspberry Pi + Arduino проект для управления RGB LED через serial протокол.

![Схема подключения](https://br-design.ru/sites/default/files/images/4set-br-site.jpg)

![Демо](https://disk.yandex.ru/i/GBaX-wcvGaYKmA)

## Компоненты

| Компонент | Роль |
|-----------|------|
| Raspberry Pi 3B | Контроллер, SSH доступ |
| Arduino Mega 2560 | Основной контроллер |
| Arduino Uno | RGB LED + датчики |
| RGB LED (4-pin) | Индикация |

## Подключение

```
Arduino Uno:
  D3 (PWM) ---[220Ω]--- RED LED
  D5 (PWM) ---[220Ω]--- GREEN LED
  D6 (PWM) ---[220Ω]--- BLUE LED
  GND      ----------- CATHODE
```

## Serial протокол (9600 baud)

| Команда | Описание | Пример |
|---------|----------|--------|
| `R,G,B` | Установить цвет (0-255) | `255,128,0` |
| `OFF` | Выключить | `OFF` |
| `STATUS` | Текущий цвет | `STATUS` |
| `FADE:r,g,b,steps` | Плавная смена | `FADE:0,0,255,100` |
| `BLINK:seconds` | Моргание красным | `BLINK:60` |
| `PRESET:name` | Готовый цвет | `PRESET:RED` |

### Пресеты

`RED`, `GREEN`, `BLUE`, `WHITE`, `YELLOW`, `CYAN`, `MAGENTA`, `ORANGE`, `PINK`, `PURPLE`

## Демо режим

Автоматическая очередь:
1. 🔴 Моргание красным — 1 минута
2. Каждый пресет — 3 минуты с плавным переходом

## Структура проекта

```
robot-catty/
├── firmware/rgb_led/     # Скетчи для Arduino
├── scripts/              # Python скрипты управления
├── remote/               # Удалённое управление через SSH
└── config/               # Конфигурация плат
```
