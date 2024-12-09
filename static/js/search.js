document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const resultsContainer = document.getElementById('searchResults');
    const totalResults = document.getElementById('totalResults');
    const paginationContainer = document.getElementById('pagination');
    const loadingIndicator = document.getElementById('loadingIndicator');

    let currentPage = 1;

    function showLoading() {
        loadingIndicator.style.display = 'flex';
        resultsContainer.innerHTML = '';
        totalResults.textContent = '';
        paginationContainer.innerHTML = '';
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    function displayError(message) {
        hideLoading();
        resultsContainer.innerHTML = `<div class="error">${message}</div>`;
    }

    function sortResults(results, sortOrder) {
        if (!sortOrder) return results;

        return [...results].sort((a, b) => {
            const dateA = a.published_date;
            const dateB = b.published_date;

            // Обработка случаев с отсутствующими датами
            if (!dateA || dateA === 'Дата не указана') {
                return sortOrder === 'desc' ? 1 : -1;  // В конец или начало списка
            }
            if (!dateB || dateB === 'Дата не указана') {
                return sortOrder === 'desc' ? -1 : 1;  // В конец или начало списка
            }

            // Преобразуем даты в формате MM.YYYY в объекты Date
            const [monthA, yearA] = dateA.split('.');
            const [monthB, yearB] = dateB.split('.');
            const dateObjA = new Date(yearA, monthA - 1);
            const dateObjB = new Date(yearB, monthB - 1);

            return sortOrder === 'desc' 
                ? dateObjB - dateObjA  // Сначала новые
                : dateObjA - dateObjB; // Сначала старые
        });
    }

    function displayResults(data) {
        hideLoading();
        
        if (data.error) {
            displayError(data.error);
            return;
        }

        totalResults.textContent = `Найдено результатов: ${data.total}`;
        
        resultsContainer.innerHTML = data.results
            .map(result => {
                const date = result.published_date || 'Дата не указана';
                const snippet = result.snippet || 'Описание отсутствует';
                return `
                    <div class="result-item">
                        <h3><a href="${result.url}" target="_blank">${result.title}</a></h3>
                        <div class="result-date">Дата публикации: ${date}</div>
                        <p class="result-snippet">${snippet}</p>
                    </div>
                `;
            })
            .join('');

        createPagination(data.total_pages);
    }

    // Функция для проверки валидности даты
    function isValidDate(dateString) {
        if (!dateString) return true;
        const selectedDate = new Date(dateString);
        const today = new Date();
        
        // Устанавливаем время в полночь для корректного сравнения
        selectedDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        // Проверяем, что выбранная дата не превышает текущую
        return selectedDate <= today;
    }

    // Храним все результаты поиска
    let searchState = {
        results: null,
        total: 0,
        currentPage: 1,
        totalPages: 0
    };

    // Функция для получения подмножества результатов для текущей страницы
    function getPageResults(results, page, resultsPerPage = 20) {
        const startIdx = (page - 1) * resultsPerPage;
        const endIdx = startIdx + resultsPerPage;
        return results.slice(startIdx, endIdx);
    }

    function performSearch(page = 1) {
        const query = searchInput.value.trim();
        if (!query) return;

        // Проверка дат
        if (!isValidDate(startDate.value) || !isValidDate(endDate.value)) {
            displayError('Дата не может быть больше текущей');
            return;
        }

        showLoading();
        currentPage = page;

        // Выполняем поиск
        fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                query: query,
                page: page
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }

            // Сохраняем все результаты
            searchState = {
                results: data.results,
                total: data.total,
                currentPage: page,
                totalPages: data.total_pages
            };

            // Сортируем результаты если нужно
            const sortOrder = document.getElementById('sortOrder').value;
            if (sortOrder) {
                searchState.results = sortResults(searchState.results, sortOrder);
            }

            // Отображаем только результаты текущей страницы
            const pageResults = getPageResults(searchState.results, page);
            displayResults({
                status: 'success',
                results: pageResults,
                total: searchState.total,
                current_page: page,
                total_pages: searchState.totalPages
            });

            window.scrollTo(0, 0);
        })
        .catch(error => {
            console.error('Error:', error);
            displayError('Произошла ошибка при поиске');
        });
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

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            currentPage = 1;
            performSearch(1);
        }
    });

    searchButton.addEventListener('click', function() {
        currentPage = 1;
        performSearch(1);
    });

    window.changePage = function(page) {
        if (page !== currentPage && searchState.results) {
            currentPage = page;
            const pageResults = getPageResults(searchState.results, page);
            displayResults({
                status: 'success',
                results: pageResults,
                total: searchState.total,
                current_page: page,
                total_pages: searchState.totalPages
            });
        }
    };

    // Обработчики изменения дат
    [startDate, endDate].forEach(dateInput => {
        dateInput.addEventListener('change', function() {
            if (!isValidDate(this.value)) {
                this.value = ''; // Сбрасываем невалидное значение
                displayError('Дата не может быть больше текущей');
            }
        });
    });

    // Обработчик изменения сортировки
    document.getElementById('sortOrder').addEventListener('change', function() {
        if (searchState.results) {
            const sortOrder = this.value;
            searchState.results = sortResults(searchState.results, sortOrder);
            
            // Отображаем текущую страницу с новой сортировкой
            const pageResults = getPageResults(searchState.results, currentPage);
            displayResults({
                status: 'success',
                results: pageResults,
                total: searchState.total,
                current_page: currentPage,
                total_pages: searchState.totalPages
            });
        }
    });
});
