let products = [];
let filteredProducts = [];
let currentPage = 1;
const pageSize = 5;

function formatPrice(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, function (c) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

function renderTable(list) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  if (!list || list.length === 0) {
    document.getElementById('pagination').innerHTML = '';
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Không có sản phẩm</td></tr>';
    return;
  }

  const totalPages = Math.ceil(list.length / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);

  pageItems.forEach((p, idx) => {
    const tr = document.createElement('tr');
    const imgSrc = p.images && p.images.length ? p.images[0] : '';
    tr.innerHTML = `
      <th scope="row">${start + idx + 1}</th>
      <td>${escapeHtml(p.title)}</td>
      <td>${formatPrice(p.price)}</td>
      <td><img src="${imgSrc}" alt="${escapeHtml(p.title)}" class="img-fluid" style="max-height:60px; object-fit:cover;"></td>
      <td>
        <button class="btn btn-sm btn-primary">Xem</button>
        <button class="btn btn-sm btn-outline-danger ms-1">Xóa</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const container = document.getElementById('pagination');
  container.innerHTML = '';

  if (totalPages <= 1) return;

  const ul = document.createElement('ul');
  ul.className = 'pagination mb-0';

  const addPageItem = (label, page, disabled = false, active = false) => {
    const li = document.createElement('li');
    li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
    const btn = document.createElement('button');
    btn.className = 'page-link';
    btn.type = 'button';
    btn.dataset.page = page;
    btn.textContent = label;
    li.appendChild(btn);
    ul.appendChild(li);
  };

  addPageItem('‹ Prev', Math.max(1, currentPage - 1), currentPage === 1);

  const maxButtons = 7; // show up to 7 page buttons
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);

  for (let p = startPage; p <= endPage; p++) {
    addPageItem(p, p, false, p === currentPage);
  }

  addPageItem('Next ›', Math.min(totalPages, currentPage + 1), currentPage === totalPages);

  container.appendChild(ul);

  // delegation
  container.querySelectorAll('button.page-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const page = Number(e.currentTarget.dataset.page);
      if (!Number.isNaN(page)) {
        currentPage = page;
        renderTable(filteredProducts);
      }
    });
  });
}

function applySearchAndRender() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  filteredProducts = products.filter(p => p.title && p.title.toLowerCase().includes(q));
  currentPage = 1;
  renderTable(filteredProducts);
}

function sortBy(field, asc = true) {
  const isSearching = document.getElementById('search').value.trim() !== '';
  const target = isSearching ? filteredProducts : products;
  target.sort((a, b) => {
    let va = a[field];
    let vb = b[field];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return asc ? -1 : 1;
    if (va > vb) return asc ? 1 : -1;
    return 0;
  });
  // if not searching, keep filteredProducts in sync
  if (!isSearching) filteredProducts = products.slice();
  currentPage = 1;
  renderTable(filteredProducts);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search').addEventListener('input', () => applySearchAndRender());
  document.getElementById('sortNameAsc').addEventListener('click', () => sortBy('title', true));
  document.getElementById('sortNameDesc').addEventListener('click', () => sortBy('title', false));
  document.getElementById('sortPriceAsc').addEventListener('click', () => sortBy('price', true));
  document.getElementById('sortPriceDesc').addEventListener('click', () => sortBy('price', false));
});

fetch('http://localhost:3000/api/products')
  .then(res => res.json())
  .then(data => {
    products = Array.isArray(data) ? data : [];
    filteredProducts = products.slice();
    renderTable(filteredProducts);
  })
  .catch(err => {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '<tr><td colspan="5"><div class="alert alert-danger mb-0">Lỗi tải dữ liệu: ' + escapeHtml(err.message) + '</div></td></tr>';
  });
