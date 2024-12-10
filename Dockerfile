# Используем официальный образ Python
FROM python:3.11-slim

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем зависимости Python
RUN pip install --no-cache-dir \
    flask==3.0.0 \
    requests==2.31.0 \
    python-dotenv==1.0.0 \
    googletrans==3.1.0a0

# Копируем только необходимые файлы
COPY app.py main.py ./
COPY static/ ./static/
COPY templates/ ./templates/

# Устанавливаем переменные окружения
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Открываем порт
EXPOSE 5000

# Запускаем приложение
CMD ["python", "app.py"]
