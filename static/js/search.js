document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const resultsContainer = document.getElementById('searchResults');
    const totalResults = document.getElementById('totalResults');
    const paginationContainer = document.getElementById('pagination');

    let currentPage = 1;
    const resultsPerPage = 20;

    function createResultItem(result) {
        return `
            <div class="result-item">
                <h3><a href="${result.url}" target="_blank">${result.title}</a></h3>
                <div class="result-date">${result.published_date}</div>
                <p>${result.snippet}</p>
            </div>
        `;
    }

    function createPagination(total) {
        const totalPages = Math.ceil(total / resultsPerPage);
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

    function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        const searchParams = new URLSearchParams({
            q: query,
            page: currentPage
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
                    .map(createResultItem)
                    .join('');

                createPagination(data.total);
            })
            .catch(error => {
                console.error('Error:', error);
                resultsContainer.innerHTML = '<div class="error">Произошла ошибка при поиске</div>';
            });
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
    window.changePage = function(page) {
        currentPage = page;
        performSearch();
        window.scrollTo(0, 0);
    };
});
