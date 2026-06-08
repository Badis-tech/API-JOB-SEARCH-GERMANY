// Block 1 Core Orchestrator Configuration
const CONFIG = {
  // Replace with your actual live Supabase Reference URL
  SUPABASE_EDGE_ENDPOINT: 'https://slaoxauldqnlavyyezkr.supabase.co/functions/v1/ba-search-proxy'
};

let searchState = {
  currentPage: 1,
  pageSize: 10
};

async function executeSearch(page = 1) {
  searchState.currentPage = page;
  
  const was = document.getElementById('q-was').value.trim();
  const wo = document.getElementById('q-wo').value.trim();
  const umkreis = document.getElementById('q-umkreis').value;

  const statusBox = document.getElementById('engine-status');
  const countBox = document.getElementById('results-count');
  const resultsBox = document.getElementById('search-results');
  const paginationBox = document.getElementById('search-pagination');

  statusBox.style.display = 'block';
  statusBox.innerHTML = '<span class="spinner"></span>Querying pipeline edge execution layer...';
  resultsBox.innerHTML = '';
  paginationBox.innerHTML = '';
  countBox.textContent = '';

  const queryParams = new URLSearchParams({
    was,
    wo,
    umkreis,
    page: page.toString(),
    size: searchState.pageSize.toString()
  });

  try {
    const targetUrl = `${CONFIG.SUPABASE_EDGE_ENDPOINT}?${queryParams.toString()}`;
    const response = await fetch(targetUrl, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Edge Function responded with failure code: ${response.status}`);
    }

    const data = await response.json();
    statusBox.style.display = 'none';

    if (data.error) throw new Error(data.error);

    const totalResults = data.totalResults;
    const jobs = data.jobs;

    countBox.textContent = `Total Matches Found Across Registry: ${totalResults}`;

    if (!jobs || jobs.length === 0) {
      resultsBox.innerHTML = '<div class="empty">No targeted matches found returned from origin dataset.</div>';
      return;
    }

    // Build the clean UI data list
    resultsBox.innerHTML = jobs.map(job => {
      const city = job.arbeitsort?.ort || 'Germany';
      return `
        <div class="job-card">
          <div class="job-title">${job.titel || 'Ausbildung Position'}</div>
          <div class="job-meta">
            <span><strong>Company:</strong> ${job.arbeitgeber || 'Confidential Registry'}</span>
            <span><strong>Location:</strong> ${city}</span>
            <span><strong>ID:</strong> ${job.refnr}</span>
          </div>
        </div>`;
    }).join('');

    renderPaginationControls(page, Math.ceil(totalResults / searchState.pageSize));

  } catch (error) {
    statusBox.className = "notice";
    statusBox.innerHTML = `⚠️ <strong>Engine Pipeline Fault:</strong> ${error.message}`;
  }
}

function renderPaginationControls(current, totalPages) {
  if (totalPages <= 1) return;
  const container = document.getElementById('search-pagination');
  
  let html = '';
  if (current > 1) {
    html += `<button onclick="executeSearch(${current - 1})" class="btn-secondary">← Previous Batch</button>`;
  }
  html += `<span style="font-size: 13px; align-self: center; color: #666;">Page ${current} of ${totalPages}</span>`;
  if (current < totalPages) {
    html += `<button onclick="executeSearch(${current + 1})" class="btn-secondary">Next Batch →</button>`;
  }
  container.innerHTML = html;
}