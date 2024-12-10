/**
 * Главный JavaScript файл для управления поиском статей
 * Обеспечивает функциональность поиска, фильтрации и отображения результатов
 */

document.addEventListener('DOMContentLoaded', function() {
    // Получение ссылок на DOM элементы
    const searchInput = document.getElementById('searchInput');        // Поле ввода поискового запроса
    const searchButton = document.getElementById('searchButton');      // Кнопка поиска
    const resultsContainer = document.getElementById('searchResults'); // Контейнер результатов
    const totalResults = document.getElementById('totalResults');      // Счетчик результатов
    const paginationContainer = document.getElementById('pagination'); // Пагинация
    const loadingIndicator = document.getElementById('loadingIndicator'); // Индикатор загрузки
    const startDate = document.getElementById('startDate');           // Начальная дата фильтра
    const endDate = document.getElementById('endDate');               // Конечная дата фильтра

    let currentPage = 1;
    // Состояние поиска для хранения результатов и метаданных
    let searchState = {
        results: [],          // Массив результатов поиска
        total: 0,            // Общее количество результатов
        currentPage: 1,      // Текущая страница
        total_pages: 0,      // Общее количество страниц
        query_key: '',       // Ключ запроса для кэширования
        query: ''            // Текст поискового запроса
    };

    /**
     * Показывает индикатор загрузки и очищает контейнеры результатов
     */
    function showLoading() {
        loadingIndicator.style.display = 'flex';
        resultsContainer.innerHTML = '';
        totalResults.textContent = '';
        paginationContainer.innerHTML = '';
        exportButton.style.display = 'none';
        document.querySelector('.export-hint').style.display = 'none';
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    function displayError(message) {
        hideLoading();
        resultsContainer.innerHTML = '';
        totalResults.textContent = message;
    }

    function displayResults(results) {
        resultsContainer.innerHTML = results
            .map((result, index) => {
                const date = result.published_date || 'Дата не указана';
                const snippet = result.snippet || 'Описание отсутствует';
                const icons = [
                    '/static/images/malevich/square.jpg',
                    '/static/images/malevich/cross.jpg',
                    '/static/images/malevich/circle.jpg'
                ];
                const iconIndex = index % 3;
                return `
                    <div class="result-item">
                        <img src="${icons[iconIndex]}" alt="Malevich Icon" class="malevich-icon" width="36" height="36">
                        <div class="content">
                            <h3>
                                <a href="${result.url}" target="_blank">${result.title}</a>
                            </h3>
                            <div class="result-date">Дата публикации: ${date}</div>
                            <p class="result-snippet">${snippet}</p>
                        </div>
                    </div>
                `;
            })
            .join('');
        
        // Обновляем видимость кнопки экспорта
        updateExportButtonVisibility(results.length);
    }

    function createPagination(totalPages) {
        let paginationHtml = '';
        
        for (let i = 1; i <= totalPages; i++) {
            const isCurrentPage = i === currentPage;
            if (isCurrentPage) {
                paginationHtml += `
                    <button class="page-button active" disabled>
                        ${i}
                    </button>
                `;
            } else {
                paginationHtml += `
                    <button class="page-button" onclick="changePage(${i})">
                        ${i}
                    </button>
                `;
            }
        }
        
        paginationContainer.innerHTML = paginationHtml;
    }

    function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        showLoading();
        currentPage = 1;

        fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            searchState = {
                results: data.results,
                total: data.total,
                currentPage: 1,
                total_pages: data.total_pages,
                query_key: data.query_key,
                query: query
            };

            applyFilters();
            window.scrollTo(0, 0);
        })
        .catch(error => {
            console.error('Error:', error);
            displayError('Произошла ошибка при поиске');
        });
    }

    function applyFilters() {
        // Если нет ключа запроса (поиск не выполнялся), не делаем запрос
        if (!searchState.query_key) {
            return;
        }

        const start = startDate.value;
        const end = endDate.value;
        const page = currentPage;

        showLoading();

        const params = new URLSearchParams({
            query_key: searchState.query_key,
            page: page
        });

        // Если указана только начальная дата, то конечная = текущая
        if (start && !end) {
            const today = new Date().toISOString().split('T')[0];
            params.append('start_date', start);
            params.append('end_date', today);
        }
        // Если указана только конечная дата, то начальная = 1980-01-01
        else if (!start && end) {
            params.append('start_date', '1980-01-01');
            params.append('end_date', end);
        }
        // Если указаны обе даты
        else if (start && end) {
            params.append('start_date', start);
            params.append('end_date', end);
        }

        fetch(`/filter?${params.toString()}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }

                displayResults(data.results);
                totalResults.textContent = `Найдено результатов: ${data.total}`;
                createPagination(data.total_pages);
                hideLoading();
            })
            .catch(error => {
                console.error('Error:', error);
                // Проверяем, есть ли сообщение об ошибке в ответе
                if (error.message) {
                    displayError(error.message);
                } else {
                    displayError('Произошла ошибка при фильтрации результатов');
                }
            });
    }

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    searchButton.addEventListener('click', performSearch);

    startDate.addEventListener('change', function() {
        if (searchState.query_key) {
            applyFilters();
        }
    });
    
    endDate.addEventListener('change', function() {
        if (searchState.query_key) {
            applyFilters();
        }
    });

    // Получаем кнопку экспорта
    const exportButton = document.getElementById('exportButton');

    // Функция для экспорта результатов
    function exportResults() {
        if (!searchState.query_key) return;
        
        const params = new URLSearchParams({
            query_key: searchState.query_key,
            start_date: startDate.value,
            end_date: endDate.value
        });
        
        window.location.href = `/export?${params.toString()}`;
    }

    // Добавляем обработчик события для кнопки экспорта
    exportButton.addEventListener('click', exportResults);

    // Функция для управления видимостью кнопки экспорта
    function updateExportButtonVisibility(total) {
        const displayStyle = total > 0 ? 'block' : 'none';
        exportButton.style.display = displayStyle;
        document.querySelector('.export-hint').style.display = displayStyle;
    }

    window.changePage = function(page) {
        if (page !== currentPage) {
            currentPage = page;
            applyFilters();
        }
    };
});
