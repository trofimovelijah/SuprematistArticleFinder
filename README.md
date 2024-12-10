# Suprematist Article Finder

Многоязычная платформа поиска научных статей с дизайном в стиле супрематизма, использующая Tavily API для комплексного поиска академических исследований на разных языках.

## Технологический стек

### Backend
- Python 3.11
- Flask (веб-фреймворк)
- Tavily API (поисковый движок)
- Googletrans (перевод запросов)

### Frontend
- HTML5 / CSS3
- JavaScript (vanilla)
- Suprematist-inspired дизайн
- Адаптивная верстка

## Основные функции

1. **Многоязычный поиск**
   - Автоматическое определение языка запроса
   - Двуязычный поиск (русский/английский)
   - Объединение результатов поиска

2. **Фильтрация результатов**
   - Фильтрация по дате публикации
   - Удаление дубликатов
   - Пагинация результатов

3. **Экспорт данных**
   - Выгрузка результатов в CSV формат
   - Сохранение метаданных статей

4. **Удобный интерфейс**
   - Супрематический дизайн
   - Адаптивная верстка
   - Индикатор загрузки
   - Предпросмотр результатов

## Локальное развертывание

### Запуск с помощью Python

1. **Требования**
   ```bash
   Python 3.11
   ```

2. **Установка зависимостей**
   ```bash
   pip install flask googletrans requests
   ```

3. **Настройка переменных окружения**
   - Создайте файл `.env` в корневой директории проекта (там же, где находится app.py)
   - Добавьте ваш API ключ Tavily в следующем формате (без кавычек):
     ```
     TAVILY_API_KEY=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
     ```
   
   Важные замечания:
   - API ключ указывается БЕЗ кавычек
   - Файл должен находиться в корневой директории проекта
   - В начале файла app.py есть строка `load_dotenv()`, которая автоматически загружает все переменные из файла .env
   - Python-dotenv ищет файл .env в текущей директории и всех родительских директориях

4. **Запуск приложения**
   ```bash
   python main.py
   ```
   Приложение будет доступно по адресу: http://localhost:5000

### Запуск с помощью Docker

1. **Требования**
   - Docker
   - Действующий API ключ Tavily
   - Python 3.11 (установится автоматически в контейнере)

2. **Подготовка к сборке**
   - Убедитесь, что у вас есть все необходимые файлы проекта:
     - app.py (основной файл приложения)
     - main.py (точка входа)
     - папка static с CSS, JS и изображениями
     - папка templates с HTML шаблонами
   - Все зависимости автоматически установятся при сборке образа

3. **Сборка образа**
   ```bash
   # Убедитесь, что вы находитесь в корневой директории проекта
   docker build -t suprematist-article-finder .
   
   # Проверьте, что образ успешно создан
   docker images | grep suprematist-article-finder
   ```

4. **Запуск контейнера**
   ```bash
   docker run -p 5000:5000 -e TAVILY_API_KEY=your_api_key_here suprematist-article-finder
   ```
   
   Важные замечания по запуску:
   - API ключ передается через переменную окружения (-e)
   - Ключ указывается БЕЗ кавычек
   - При использовании Docker файл .env не используется
   - Порт 5000 будет доступен на хост-машине
   
   После успешного запуска приложение будет доступно по адресу: http://localhost:5000

Примечание: Не забудьте заменить API ключ в команде запуска на ваш собственный.

## API Endpoints

- `GET /` - Главная страница
- `POST /search` - Поиск статей
- `GET /filter` - Фильтрация результатов
- `GET /export` - Экспорт результатов в CSV

## Примечания
- Для работы приложения требуется действующий API ключ Tavily
- Поиск осуществляется только по статьям на arxiv.org
- Результаты кэшируются для оптимизации повторных запросов
