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

    function performSearch(page = 1) {
        const query = searchInput.value.trim();
        if (!query) return;

        showLoading();

        const searchParams = new URLSearchParams({
            q: query,
            page: page
        });

        if (startDate.value) searchParams.append('start_date', startDate.value);
        if (endDate.value) searchParams.append('end_date', endDate.value);

        fetch(`/search?${searchParams.toString()}`)
            .then(response => response.json())
            .then(data => {
                displayResults(data);
                currentPage = page;
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
            paginationHtml += `
                <button class="page-button ${i === currentPage ? 'active' : ''}" 
                        onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        }
        
        paginationContainer.innerHTML = paginationHtml;
    }

    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch(1);
        }
    });

    searchButton.addEventListener('click', function() {
        performSearch(1);
    });

    window.changePage = function(page) {
        performSearch(page);
    };
});