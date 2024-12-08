from flask import Flask, render_template, request, jsonify
from datetime import datetime, date
import requests
import logging
import math
import re
import os

app = Flask(__name__)

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
    
    # Поиск и перевод составных терминов
    translated_text = normalized_text
    for ru_term, en_term in sorted(translations.items(), key=lambda x: len(x[0]), reverse=True):
        translated_text = translated_text.replace(normalize_text(ru_term), en_term)
    
    return translated_text

@app.route('/')
def index():
    return render_template('index.html')

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

@app.route('/search')
def search():
    try:
        # Проверка наличия API ключа
        if not TAVILY_API_KEY or TAVILY_API_KEY == 'your-api-key-here':
            logger.error("API key is missing or invalid")
            return jsonify({
                'status': 'error',
                'error': 'Отсутствует или неверный API ключ'
            }), 401

        # Получение и валидация параметров
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({
                'status': 'error',
                'error': 'Поисковый запрос не может быть пустым'
            }), 400

        try:
            page = max(1, int(request.args.get('page', 1)))
        except ValueError:
            return jsonify({
                'status': 'error',
                'error': 'Неверный формат номера страницы'
            }), 400

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Валидация дат
        dates_valid, date_error = validate_dates(start_date, end_date)
        if not dates_valid:
            return jsonify({
                'status': 'error',
                'error': date_error
            }), 400

        # Перевод и нормализация запроса
        english_query = translate_to_english(query)
        search_query = f"site:arxiv.org {english_query}"
        
        if start_date and end_date:
            search_query += f" after:{start_date} before:{end_date}"

        logger.debug(f"Processed search query: {search_query}")

        # Выполнение запроса к API
        try:
            logger.debug(f"Sending POST request to Tavily API with query: {search_query}")
            response = requests.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": TAVILY_API_KEY,
                    "query": search_query,
                    "search_depth": "advanced",
                    "include_domains": ["arxiv.org"],
                    "max_results": 100
                },
                timeout=10
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
            
            # Реализация пагинации на стороне сервера
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
            logger.error(f"API response processing error: {str(e)}")
            return jsonify({
                'status': 'error',
                'error': 'Ошибка при обработке ответа от сервера'
            }), 500

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Внутренняя ошибка сервера'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
