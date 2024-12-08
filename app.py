import os
import requests
from flask import Flask, render_template, jsonify, request
from datetime import datetime

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

TAVILY_API_KEY = os.getenv('TAVILY_API_KEY', 'your-api-key-here')

def translate_to_english(text):
    """
    Простая функция перевода с русского на английский.
    В реальном приложении здесь должен быть API перевода.
    """
    translations = {
        'квантовые вычисления': 'quantum computing',
        'искусственный интеллект': 'artificial intelligence',
        # Добавьте другие переводы по необходимости
    }
    return translations.get(text.lower(), text)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search')
def search():
    query = request.args.get('q', '')
    page = int(request.args.get('page', 1))
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Перевод запроса если он на русском
    english_query = translate_to_english(query)
    
    # Формируем поисковый запрос для Tavily
    search_query = f"site:arxiv.org {english_query}"
    
    # Добавляем фильтрацию по датам если указаны
    if start_date and end_date:
        search_query += f" after:{start_date} before:{end_date}"

    try:
        response = requests.get(
            "https://api.tavily.com/search",
            params={
                "api_key": TAVILY_API_KEY,
                "query": search_query,
                "include_domains": ["arxiv.org"],
                "page": page,
                "max_results": 20
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            results = []
            
            for result in data.get('results', []):
                # Извлекаем дату из URL или метаданных
                pub_date = result.get('published_date', 'Дата не указана')
                
                results.append({
                    'title': result.get('title'),
                    'url': result.get('url'),
                    'snippet': result.get('snippet'),
                    'published_date': pub_date
                })
                
            return jsonify({
                'results': results,
                'total': data.get('total_results', 0)
            })
        else:
            return jsonify({'error': 'Ошибка при получении данных'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
