document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('searchResults');
    const totalResults = document.getElementById('totalResults');
    const paginationContainer = document.getElementById('pagination');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');

    let currentPage = 1;
    let searchState = {
        results: [],
        total: 0,
        currentPage: 1,
        total_pages: 0,
        query: ''
    };

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

    function displayResults(results) {
        resultsContainer.innerHTML = results
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

    function performSearch(page = 1) {
        const query = searchInput.value.trim();
        if (!query) return;

        showLoading();
        currentPage = page;

        const requestBody = {
            query: query,
            page: page
        };

        if (startDate.value) {
            requestBody.start_date = startDate.value;
        }
        if (endDate.value) {
            requestBody.end_date = endDate.value;
        }

        fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            searchState = {
                results: data.results,
                total: data.total,
                currentPage: data.current_page,
                total_pages: data.total_pages,
                query: query
            };

            displayResults(data.results);
            totalResults.textContent = `Найдено результатов: ${data.total}`;
            createPagination(data.total_pages);
            window.scrollTo(0, 0);
            hideLoading();
        })
        .catch(error => {
            console.error('Error:', error);
            displayError('Произошла ошибка при поиске');
        });
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
});
