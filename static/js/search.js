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

        // Шаг 1: Выполняем поиск
        fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: query })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }

            // Шаг 2: Если есть хотя бы одна дата, применяем фильтрацию
            if (startDate.value || endDate.value) {
                const filterParams = new URLSearchParams({
                    query_key: data.query_key,
                    page: page.toString()
                });

                if (startDate.value) filterParams.append('start_date', startDate.value);
                if (endDate.value) filterParams.append('end_date', endDate.value);

                return fetch(`/filter?${filterParams.toString()}`);
            }
            return Promise.resolve({ ok: true, json: () => data });
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            displayResults(data);
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
        if (page !== currentPage) {
            performSearch(page);
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
});