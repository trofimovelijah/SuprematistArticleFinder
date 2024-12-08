document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const resultsContainer = document.getElementById('searchResults');
    const totalResults = document.getElementById('totalResults');
    const paginationContainer = document.getElementById('pagination');

    let currentPage = 1;

    function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        const searchParams = new URLSearchParams({
            q: query
        });

        if (startDate.value) searchParams.append('start_date', startDate.value);
        if (endDate.value) searchParams.append('end_date', endDate.value);

        fetch(`/search?${searchParams.toString()}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    resultsContainer.innerHTML = `<div class="error">${data.error}</div>`;
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

                // Обновить пагинацию
                createPagination(data.total_pages);
            })
            .catch(error => {
                console.error('Error:', error);
                resultsContainer.innerHTML = '<div class="error">Произошла ошибка при поиске</div>';
            });
    }

    // Обновить функцию создания пагинации
    function createPagination(totalPages) {
        let paginationHtml = '';
        
        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `
                <button class="page-button ${i === currentPage ? 'active' : ''}" 
                        onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        }
        
        paginationContainer.innerHTML = paginationHtml;
    }

    // Обработчик нажатия Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            currentPage = 1;
            performSearch();
        }
    });

    // Обработчик кнопки поиска
    searchButton.addEventListener('click', function() {
        currentPage = 1;
        performSearch();
    });

    // Функция смены страницы
    function changePage(page) {
        const query = searchInput.value.trim();
        if (!query) return;

        const searchParams = new URLSearchParams({
            q: query,
            page: page
        });

        if (startDate.value) searchParams.append('start_date', startDate.value);
        if (endDate.value) searchParams.append('end_date', endDate.value);

        fetch(`/search?${searchParams.toString()}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    resultsContainer.innerHTML = `<div class="error">${data.error}</div>`;
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

                currentPage = page;
                createPagination(data.total_pages);
                window.scrollTo(0, 0);
            })
            .catch(error => {
                console.error('Error:', error);
                resultsContainer.innerHTML = '<div class="error">Произошла ошибка при поиске</div>';
            });
    }

    window.changePage = changePage;
});
