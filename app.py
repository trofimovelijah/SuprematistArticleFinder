import os
import json
import logging
import math
from datetime import datetime, date
import requests
from flask import Flask, request, jsonify, render_template
from googletrans import Translator, LANGUAGES

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Получение API ключа из переменных окружения
TAVILY_API_KEY = os.getenv('TAVILY_API_KEY')

# Кэш для хранения результатов поиска
search_cache = {}
# Инициализация переводчика
translator = Translator()

def translate_search_query(query):
    """
    Переводит поисковый запрос и возвращает кортеж (оригинальный запрос, переведенный запрос)
    """
    try:
        # Определяем язык запроса
        detected = translator.detect(query)
        
        if detected.lang == 'ru':
            # Если запрос на русском, переводим на английский
            translation = translator.translate(query, src='ru', dest='en')
            original = f"site:arxiv.org {query}"
            translated = f"site:arxiv.org {translation.text}"
        else:
            # Если запрос не на русском, считаем что это английский и переводим на русский
            translation = translator.translate(query, src='en', dest='ru')
            original = f"site:arxiv.org {query}"
            translated = f"site:arxiv.org {translation.text}"
            
        logger.debug(f"Original query: {original}")
        logger.debug(f"Translated query: {translated}")
        
        return original, translated
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return f"site:arxiv.org {query}", None  # В случае ошибки возвращаем только оригинальный запрос

def validate_dates(start_date, end_date):
    """Валидация дат"""
    today = date.today()
    
    try:
        if start_date:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            if start > today:
                return False, 'Дата не может быть больше текущей'
                
        if end_date:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            if end > today:
                return False, 'Дата не может быть больше текущей'
                
        if start_date and end_date:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            if start > end:
                return False, 'Дата начала периода не может быть позже даты окончания периода'
                
        return True, None
    except ValueError:
        return False, 'Неверный формат даты'

def filter_results_by_date(results, start_date, end_date):
    """Фильтрация результатов по датам"""
    if not (start_date or end_date):
        return results
        
    try:
        today = date.today()
        start = datetime.strptime(start_date, '%Y-%m-%d').date() if start_date else None
        end = datetime.strptime(end_date, '%Y-%m-%d').date() if end_date else today
        
        filtered_results = []
        for result in results:
            pub_date_str = result.get('published_date', '')
            if not pub_date_str or pub_date_str == 'Дата не указана':
                continue
                
            try:
                # Преобразуем строку даты в формате MM.YYYY в объект datetime
                pub_date = datetime.strptime(pub_date_str, '%m.%Y').date().replace(day=1)
                
                # Приводим даты к началу месяца для корректного сравнения
                start_date_normalized = start.replace(day=1) if start else None
                end_date_normalized = end.replace(day=1) if end else None
                today_normalized = today.replace(day=1)
                
                # Проверяем условия в зависимости от наличия дат
                if start_date_normalized and end_date_normalized:
                    if start_date_normalized <= pub_date <= end_date_normalized:
                        filtered_results.append(result)
                elif start_date_normalized:
                    if start_date_normalized <= pub_date <= today_normalized:
                        filtered_results.append(result)
                elif end_date_normalized:
                    if pub_date <= end_date_normalized:
                        filtered_results.append(result)
            except ValueError as e:
                logger.error(f"Error parsing date: {e}")
                continue
                
        return filtered_results
    except ValueError:
        return results

@app.route('/')
def index():
    return render_template('index.html', today=datetime.now().strftime('%Y-%m-%d'))

@app.route('/search', methods=['POST'])
def search():
    try:
        # Проверка наличия API ключа
        if not TAVILY_API_KEY:
            logger.error("Missing API key")
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
                'error': 'Отсутствует поисковый запрос'
            }), 400
            
        try:
            page = max(1, int(data.get('page', 1)))
        except (ValueError, TypeError):
            page = 1

        # Получаем оригинальный и переведенный запросы
        original_query, translated_query = translate_search_query(query)
        
        # Формируем комбинированный запрос с OR
        search_query = f"{original_query}"
        if translated_query:
            search_query = f"{original_query} OR {translated_query}"
            
        logger.debug(f"Combined search query: {search_query}")

        # Выполняем поиск через Tavily API
        tavily_url = "https://api.tavily.com/search"
        params = {
            "api_key": TAVILY_API_KEY,
            "query": search_query,
            "include_domains": ["arxiv.org"],
            "search_depth": "advanced",
            "max_results": 100
        }

        try:
            # Формируем параметры запроса
            request_params = {
                "api_key": TAVILY_API_KEY,
                "query": search_query,
                "include_domains": ["arxiv.org"],
                "search_depth": "advanced",
                "max_results": 100,
                "get_content": True,
                "summarize": True,
                "search_type": "news"
            }
            
            logger.debug(f"Request params: {request_params}")
            
            response = requests.post(
                tavily_url,
                json=request_params,
                timeout=30
            )
            
            response.raise_for_status()
            search_data = response.json()
            logger.debug(f"Search response: {json.dumps(search_data, indent=2)}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Tavily API error: {str(e)}")
            return jsonify({
                'status': 'error',
                'error': 'Ошибка при выполнении поискового запроса'
            }), 500

        # Обработка результатов
        results = []
        seen_urls = set()
        for result in search_data.get('results', []):
            # Извлечение даты из URL или описания
            published_date = "Дата не указана"
            
            # Пытаемся найти дату в описании или URL
            url = result.get('url', '')
            if '/abs/' in url or '/pdf/' in url:
                try:
                    # Извлекаем идентификатор статьи
                    article_id = url.split('/')[-1].replace('.pdf', '')
                    # Получаем год и месяц из идентификатора
                    if '.' in article_id:
                        year_month = article_id.split('.')[0]
                        if len(year_month) >= 4:
                            year = year_month[:2]
                            month = year_month[2:4]
                            # Преобразуем год в полный формат
                            full_year = f"20{year}"
                            published_date = f"{month}.{full_year}"
                except Exception:
                    pass

            # Извлекаем и обрабатываем snippet
            snippet = result.get('content', '') or result.get('snippet', '')
            if not snippet and result.get('raw_content'):
                snippet = result['raw_content'][:500]  # Ограничиваем длину сниппета
                
            url = result.get('url', '')
            # Добавляем только уникальные результаты
            if url not in seen_urls:
                seen_urls.add(url)
                results.append({
                    'url': url,
                    'title': result.get('title', 'Без названия'),
                    'snippet': snippet,
                    'published_date': published_date
                })

        # Пагинация
        results_per_page = 20
        total_results = len(results)
        total_pages = math.ceil(total_results / results_per_page)
        start_idx = (page - 1) * results_per_page
        end_idx = start_idx + results_per_page
        
        logger.debug(f"Total results: {total_results}, Page: {page}, Results per page: {results_per_page}")
        
        # Сохраняем результаты в кэш с ключом только по поисковому запросу
        cache_key = search_query
        if cache_key not in search_cache:
            search_cache[cache_key] = results
            
        return jsonify({
            'status': 'success',
            'results': results[start_idx:end_idx],
            'total': total_results,
            'current_page': page,
            'total_pages': total_pages,
            'query_key': cache_key
        })

    except requests.exceptions.Timeout:
        logger.error("Request timeout")
        return jsonify({
            'status': 'error',
            'error': 'Превышено время ожидания запроса'
        }), 504

    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Произошла непредвиденная ошибка'
        }), 500

@app.route('/filter')
def filter_results():
    try:
        query_key = request.args.get('query_key')
        if not query_key or query_key not in search_cache:
            return jsonify({
                'status': 'error',
                'error': 'Недопустимый ключ запроса'
            }), 400

        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        try:
            page = max(1, int(request.args.get('page', 1)))
        except (ValueError, TypeError):
            page = 1

        # Получаем результаты из кэша
        results = search_cache[query_key]
        
        # Фильтруем по датам, если они указаны
        if start_date and end_date:
            # Валидация дат
            dates_valid, date_error = validate_dates(start_date, end_date)
            if not dates_valid:
                return jsonify({
                    'status': 'error',
                    'error': date_error
                }), 400
                
            results = filter_results_by_date(results, start_date, end_date)

        # Пагинация отфильтрованных результатов
        results_per_page = 20
        total_results = len(results)
        total_pages = math.ceil(total_results / results_per_page)
        start_idx = (page - 1) * results_per_page
        end_idx = start_idx + results_per_page

        return jsonify({
            'status': 'success',
            'results': results[start_idx:end_idx],
            'total': total_results,
            'current_page': page,
            'total_pages': total_pages
        })

    except Exception as e:
        logger.error(f"Filter error: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': 'Ошибка при фильтрации результатов'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
