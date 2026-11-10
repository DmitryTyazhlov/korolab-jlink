# korolab-jlink

Настольное приложение для прошивки устройств Korolab (микроконтроллеры GigaDevice GD32) через SEGGER J-Link. Это графическая обёртка над `JLinkExe` / `JLink.exe`: выбираете прошивку из папки с `.hex`-файлами, способ подключения, и нажимаете **Program** или **Erase**.

Стек: [Tauri 2](https://tauri.app/) (Rust) + React 19 + TypeScript + Vite + Material UI.

## Возможности

- Выбор папки с прошивками. Путь запоминается и открывается автоматически при следующем запуске.
- Каскадный выбор прошивки: **Device → Board Version → MCU → Firmware Version → DFU Version**. Доступные значения фильтруются по предыдущим выборам, самые свежие версии прошивки и DFU подставляются автоматически.
- Поддержка прошивок без DFU (например `leak_sensor-3-1_1-gd32f330k8u6.hex`): в списке DFU они отображаются как «No DFU».
- Три способа подключения J-Link:
  - **USB** — локально подключённый J-Link;
  - **Local** — J-Link по сети, IP вида `192.168.X.Y` (вводятся последние два октета);
  - **Remote** — удалённый J-Link через сервер SEGGER (`tunnel:<ID>::jlink-europe.segger.com`).
- Кнопки **Erase** (стирание, сброс и запуск) и **Program** (загрузка `.hex`, сброс и запуск).
- Консоль с живым выводом J-Link, ошибки и успешные результаты подсвечиваются.

Интерфейс J-Link: SWD, скорость 4000 kHz. Тип MCU берётся из имени выбранного файла прошивки.

## Формат имён прошивок

```
<device>-<board>-<firmware>-<dfu>-<mcu>.hex
```

Пример: `di4la-3-1_12-1_x-gd32f330k8u6.hex`

| Часть | Пример | Значение |
|---|---|---|
| device | `di4la` | название устройства |
| board | `3` | версия платы |
| firmware | `1_12` | версия прошивки (отображается как 1.12) |
| dfu | `1_x` | версия DFU (отображается как 1.x) |
| mcu | `gd32f330k8u6` | микроконтроллер, передаётся в J-Link как `-device` |

Если DFU нет, часть пропускается: `leak_sensor-3-1_1-gd32f330k8u6.hex`. Файлы, не подходящие под формат, в списке не показываются.

## Требования

- [Node.js](https://nodejs.org/) 18+ и npm
- [Rust](https://www.rust-lang.org/tools/install) (stable) через `rustup`
- Системные зависимости Tauri для вашей ОС: <https://tauri.app/start/prerequisites/>
  - macOS: Xcode Command Line Tools (`xcode-select --install`)
  - Windows: Microsoft C++ Build Tools и WebView2
- [SEGGER J-Link Software](https://www.segger.com/downloads/jlink/) — нужен для работы приложения. Приложение ищет `JLinkExe` / `JLink.exe` автоматически:
  - macOS: `/Applications/SEGGER/JLink/JLinkExe`, `/usr/local/bin/JLinkExe`, `/opt/SEGGER/JLink/JLinkExe`;
  - Windows: папки `JLink*` в `Program Files`;
  - иначе — через `PATH`.

## Установка зависимостей

```bash
npm install
```

## Запуск в режиме разработки

```bash
npm run tauri dev
```

Поднимает Vite на `http://localhost:1420` и собирает Rust-часть в debug-профиле. DevTools: правый клик в окне → *Inspect Element*. Логи Rust выводятся в терминал.

Подробный лог:

```bash
RUST_BACKTRACE=1 npm run tauri dev
```

## Сборка релиза

```bash
npm run tauri build
```

Готовые пакеты появятся в `src-tauri/target/release/bundle/`:

- macOS: `.app` и `.dmg`
- Windows: `.msi` и `.exe` (NSIS)

Собирать нужно на той ОС, под которую нужен пакет (кросс-компиляция не настроена).

Только фронтенд (проверка типов и сборка в `dist/`):

```bash
npm run build
```

## Как пользоваться

1. Нажмите на шестерёнку в правом верхнем углу и выберите папку с `.hex`-файлами.
2. Выберите Device, Board Version, MCU, Firmware Version и DFU Version (часть полей заполнится сама).
3. Выберите способ подключения: USB, Local (введите IP) или Remote (введите ID).
4. Нажмите **Program** для прошивки или **Erase** для стирания. Ход выполнения показывается в консоли внизу.

## Структура проекта

```
src/
  App.tsx                       главный экран, выбор папки и подключения
  components/FirmwareSelector.tsx   парсинг имён и каскадный выбор прошивки
  components/JLinkActions.tsx       кнопки Erase/Program и консоль вывода
  main.tsx                      тема MUI
src-tauri/
  src/lib.rs                    Tauri-команды (erase, program, выбор папки, список .hex)
  src/jlink.rs                  поиск и запуск JLink, потоковый вывод
  tauri.conf.json               настройки окна и сборки
```

## Рекомендуемая IDE

[VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
