# Robot Catty — Android APK Build Guide

## Текущий статус: PWA ✅

На данный момент проект обёрнут в **Progressive Web App (PWA)**. Это означает:

- ✅ Устанавливается на Android через Chrome → "Add to Home Screen"
- ✅ Работает в полноэкранном режиме (standalone mode)
- ✅ Иконки приложения (192px, 512px)
- ✅ Service Worker для кэширования статических ресурсов
- ✅ Манифест с метаданными приложения
- ⚠️ WebSocket не работает offline (нужен живой сервер Raspberry Pi)

## Установка PWA на Android

1. Откройте Chrome на Android
2. Перейдите по адресу: `http://<IP_RASPBERRY_PI>:3000`
3. Нажмите ⋮ (меню) → "Add to Home screen" / "Установить приложение"
4. Появится иконка "Catty" на домашнем экране
5. Приложение запускается в полноэкранном режиме без адресной строки

## Сборка нативного APK (требуется Android SDK)

### Предварительные требования

- **Node.js** ≥ 18 (установлен ✅)
- **Java JDK** ≥ 17 (установлена 11 — нужно обновить!)
- **Android SDK** + **Build Tools**
- **Gradle**

### Шаги

#### 1. Установка Android SDK (Windows)

```powershell
# Скачайте Android Studio или Command Line Tools:
# https://developer.android.com/studio#command-tools

# Распакуйте в:
# C:\Users\Ruslan\AppData\Local\Android\cmdline-tools\latest\

# Переменные окружения:
# ANDROID_HOME = C:\Users\Ruslan\AppData\Local\Android
# ANDROID_SDK_ROOT = C:\Users\Ruslan\AppData\Local\Android
# PATH += %ANDROID_HOME%\platform-tools
# PATH += %ANDROID_HOME%\cmdline-tools\latest\bin

# Примите лицензии:
sdkmanager --licenses

# Установите компоненты:
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

#### 2. Обновление JDK до 17+

```powershell
# Скачайте JDK 17 с https://adoptium.net/
# Установите JAVA_HOME на новый JDK
```

#### 3. Инициализация Capacitor и Android проекта

```bash
cd C:\Users\Ruslan\robot-catty

# Установка зависимостей
npm install

# Инициализация Capacitor (уже настроен в capacitor.config.ts)
npx cap init "Robot Catty" com.robotcatty.app

# Добавление Android платформы
npx cap add android

# Синхронизация web → android
npx cap sync android
```

#### 4. Сборка Debug APK

```bash
cd android
./gradlew assembleDebug
```

**Результат:** `android/app/build/outputs/apk/debug/app-debug.apk`

#### 5. Установка на устройство

```bash
# Через ADB (устройство подключено по USB с включенной отладкой)
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Или через Gradle
cd android
./gradlew installDebug
```

#### 6. Сборка Release APK (для публикации)

```bash
cd android
./gradlew assembleRelease
```

**Результат:** `android/app/build/outputs/apk/release/app-release-unsigned.apk`

Для подписи используйте `jarsigner` или Android Studio.

## Альтернатива: TWA (Trusted Web Activity) через Bubblewrap

Если не хотите устанавливать полный Android SDK:

```bash
# Установка Bubblewrap CLI
npm install -g @bubblewrap/cli

# Инициализация TWA-проекта
bubblewrap init --manifest="http://<IP>:3000/manifest.json"

# Сборка APK
bubblewrap build
```

Bubblewrap сам скачает JDK и Android SDK. APK будет меньше (~3-5 MB vs ~10-15 MB для Capacitor).

## Структура проекта

```
robot-catty/
├── server/
│   ├── public/
│   │   ├── index.html          # Веб-интерфейс (PWA)
│   │   ├── manifest.json       # PWA манифест
│   │   ├── sw.js               # Service Worker
│   │   └── icons/              # Иконки приложения
│   ├── server.js               # Express + WebSocket сервер
│   └── package.json
├── android/                    # Capacitor Android проект (после npx cap add android)
├── capacitor.config.ts         # Конфигурация Capacitor
├── package.json                # Корневой package.json
└── scripts/
    └── gen_icons.py            # Генератор иконок
```

## Важные замечания

- WebSocket подключение к Raspberry Pi работает только в локальной сети
- Для удалённого доступа потребуется VPN или проброс портов
- `cleartext: true` в capacitor.config.ts разрешает HTTP-трафик (не HTTPS)
- Для production рекомендуется использовать HTTPS + WSS
