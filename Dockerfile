# Используем официальный образ Python
FROM python:3.11-slim
# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    locales \
    postgresql \
    libpq-dev \
    openssl && \
    rm -rf /var/lib/apt/lists/*
# Устанавливаем рабочую директорию
WORKDIR /app
# Копируем файлы зависимостей
COPY requirements.txt .
# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt
# Копируем код приложения
COPY . .
# Устанавливаем переменные окружения
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
# Открываем порт
EXPOSE 5000
# Запускаем приложение
CMD ["python", "main.py"]
