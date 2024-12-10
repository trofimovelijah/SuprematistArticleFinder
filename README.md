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

1. **Требования**
   ```bash
   Python 3.11
   ```

2. **Установка зависимостей**
   ```bash
   pip install flask googletrans requests
   ```

3. **Настройка переменных окружения**
   - Создайте файл `.env` в корневой директории
   - Добавьте ваш API ключ Tavily:
     ```
     TAVILY_API_KEY=your_api_key_here
     ```

4. **Запуск приложения**
   ```bash
   python main.py
   ```
   Приложение будет доступно по адресу: http://localhost:5000

## API Endpoints

- `GET /` - Главная страница
- `POST /search` - Поиск статей
- `GET /filter` - Фильтрация результатов
- `GET /export` - Экспорт результатов в CSV

## Примечания
- Для работы приложения требуется действующий API ключ Tavily
- Поиск осуществляется только по статьям на arxiv.org
- Результаты кэшируются для оптимизации повторных запросов