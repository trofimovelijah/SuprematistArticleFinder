from flask import Flask, render_template, request, jsonify
from datetime import datetime, date
import requests
import logging
import math
import re
import os
from transformers import pipeline
import functools

app = Flask(__name__)
# Максимальный размер кэша и время жизни записей (в секундах)
MAX_CACHE_SIZE = 100
CACHE_TTL = 3600  # 1 час

# Функция очистки устаревших записей кэша
def clean_cache():
    global search_cache
    if len(search_cache) > MAX_CACHE_SIZE:
        search_cache.clear()
        logger.debug("Cache cleared due to size limit")

@functools.lru_cache(maxsize=1)
def get_translator():
    """Ленивая инициализация переводчика"""
    return pipeline("translation", model="Helsinki-NLP/opus-mt-ru-en")

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Get API key from environment
TAVILY_API_KEY = os.environ.get('TAVILY_API_KEY')

def extract_date_from_arxiv_url(url):
    try:
        if not url or 'arxiv.org' not in url:
            return 'Дата не указана'
            
        url_parts = url.split('/')
        arxiv_id = url_parts[-1]
        
        # Обработка старого формата (quant-ph/YYMM.NNN)
        if 'quant-ph' in url:
            year_part = arxiv_id[:2]
            month_part = arxiv_id[2:4]
            # Для старого формата используем 19XX для годов больше 80
            year = '19' + year_part if int(year_part) >= 80 else '20' + year_part
        else:
            # Современный формат (YYMM.NNNNN)
            year_part = arxiv_id[:2]
            month_part = arxiv_id[2:4]
            year = '20' + year_part
            
        return f"{month_part}.{year}"
    except:
        return 'Дата не указана'

def normalize_text(text):
    """Нормализация текста: удаление лишних пробелов и специальных символов"""
    text = re.sub(r'[^\w\s-]', ' ', text)
    text = ' '.join(text.split())
    return text.lower()

def translate_to_english(text):
    """
    Расширенная функция перевода с русского на английский с поддержкой составных запросов.
    """
    translations = {
        'квантовые вычисления': 'quantum computing',
        'искусственный интеллект': 'artificial intelligence',
        'машинное обучение': 'machine learning',
        'нейронные сети': 'neural networks',
        'глубокое обучение': 'deep learning',
        'обработка данных': 'data processing',
        'анализ данных': 'data analysis',
        'компьютерное зрение': 'computer vision',
        'обработка языка': 'natural language processing',
        'робототехника': 'robotics',
        'кибербезопасность': 'cybersecurity',
        'большие данные': 'big data',
        'облачные вычисления': 'cloud computing',
        'интернет вещей': 'internet of things',
        'блокчейн': 'blockchain',
        'квантовая физика': 'quantum physics',
        'теория относительности': 'relativity theory',
        'молекулярная биология': 'molecular biology',
        'генетика': 'genetics',
        'нанотехнологии': 'nanotechnology'
    }
    
    # Нормализация входного текста
    normalized_text = normalize_text(text)
    words = normalized_text.split()
    
    # Проверяем каждое слово в словаре
    translated_words = []
    for word in words:
        # Если слово есть в словаре известных терминов
        if word in translations:
            translated_words.append(translations[word])
        else:
            # Используем HuggingFace для перевода
            try:
                translator = get_translator()
                translation = translator(word)
                translated_words.append(translation[0]['translation_text'].lower())
            except Exception as e:
                logger.error(f"Translation error: {str(e)}")
                translated_words.append(word)
    
    return ' '.join(translated_words)

@app.route('/')
def index():
    today = date.today().strftime('%Y-%m-%d')
    return render_template('index.html', today=today)

def validate_dates(start_date, end_date):
    """Валидация дат"""
    if not (start_date and end_date):
        return True, None
    
    try:
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        today = date.today()
        
        if start > end:
            return False, "Дата начала не может быть позже даты окончания"
        if end > today:
            return False, "Дата окончания не может быть в будущем"
        return True, None
    except ValueError:
        return False, "Неверный формат даты"

# Кэш для хранения результатов поиска
search_cache = {}

@app.route('/search', methods=['POST'])
def search():
    try:
        # Проверка наличия API ключа
        if not TAVILY_API_KEY:
            logger.error("API key is missing")
            return jsonify({
                'status': 'error',
                'error': 'Отсутствует API ключ'
            }), 401

        # Получение и валидация данных из тела запроса
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'error': 'Отсутствует тело запроса'
            }), 400

        query = data.get('query', '').strip()
        if not query:
            return jsonify({
                'status': 'error',
                'error': 'Поисковый запрос не может быть пустым'
            }), 400

        try:
            page = max(1, int(data.get('page', 1)))
        except (ValueError, TypeError):
            return jsonify({
                'status': 'error',
                'error': 'Неверный формат номера страницы'
            }), 400

        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        # Валидация дат
        dates_valid, date_error = validate_dates(start_date, end_date)
        if not dates_valid:
            return jsonify({
                'status': 'error',
                'error': date_error
            }), 400

        # Перевод и нормализация запроса
        try:
            english_query = translate_to_english(query)
            logger.info(f"Translated query: {query} -> {english_query}")
        except Exception as e:
            logger.error(f"Translation failed: {str(e)}")
            return jsonify({
                'status': 'error',
                'error': 'Ошибка при переводе запроса'
            }), 500
            
        # Формируем поисковый запрос
        search_query = f"{english_query}"
        logger.debug(f"Base query: {search_query}")
        
        # Добавляем фильтры по датам, если указаны
        if start_date and end_date:
            # Конвертируем даты в формат YYYY-MM
            start_ym = datetime.strptime(start_date, '%Y-%m-%d').strftime('%Y-%m')
            end_ym = datetime.strptime(end_date, '%Y-%m-%d').strftime('%Y-%m')
            search_query = f"{search_query} after:{start_ym} before:{end_ym}"
            logger.debug(f"Query with dates: {search_query}")
            
        # Добавляем ограничение по домену
        search_query = f"site:arxiv.org {search_query}"

        logger.debug(f"Final search query: {search_query}")

        # Генерация уникального ключа для кэша
        cache_key = f"{search_query}"
        
        # Проверка кэша
        if cache_key not in search_cache:
            logger.debug(f"Cache miss. Sending POST request to Tavily API with query: {search_query}")
            try:
                response = requests.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": TAVILY_API_KEY,
                        "query": search_query,
                        "search_depth": "advanced",
                        "include_domains": ["arxiv.org"],
                        "max_results": 300,  # Максимальное значение для API
                        "include_answer": False,
                        "include_raw_content": False,
                        "sort_by": "relevance"
                    },
                    timeout=15  # Увеличиваем timeout для получения большего количества результатов
                )
                
                response.raise_for_status()
                data = response.json()
                
                # Обработка результатов
                results = []
                for result in data.get('results', []):
                    url = result.get('url', '')
                    pub_date = extract_date_from_arxiv_url(url)

                    results.append({
                        'title': result.get('title', 'Без названия'),
                        'url': url,
                        'snippet': result.get('content', result.get('description', 'Описание отсутствует')),
                        'published_date': pub_date
                    })
                
                # Сохранение результатов в кэш
                search_cache[cache_key] = results
                logger.debug(f"Results cached for key: {cache_key}")
            except Exception as e:
                logger.error(f"API request failed: {str(e)}")
                raise
        else:
            logger.debug(f"Cache hit for key: {cache_key}")
            results = search_cache[cache_key]

        # Реализация пагинации с кэшированными результатами
        results_per_page = 20
        total_results = len(results)
        total_pages = math.ceil(total_results / results_per_page)
        start_idx = (page - 1) * results_per_page
        end_idx = start_idx + results_per_page
        
        logger.debug(f"Total results: {total_results}, Page: {page}, Results per page: {results_per_page}")
        
        return jsonify({
            'status': 'success',
            'results': results[start_idx:end_idx],
            'total': total_results,
            'current_page': page,
            'total_pages': total_pages
        })

    except requests.exceptions.Timeout:
        logger.error("API request timed out")
        return jsonify({
            'status': 'error',
            'error': 'Превышено время ожидания ответа от сервера'
        }), 504
        
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Ошибка сетевого подключения'
        }), 502
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Внутренняя ошибка сервера'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
