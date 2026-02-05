let products = [];
let filteredProducts = [];
let currentPage = 1;
const pageSize = 5;
let showDeleted = false; // Toggle to show/hide deleted products
let currentProductId = null; // Track current product for editing/comments

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

  // Filter to show only non-deleted or all products based on showDeleted toggle
  let displayList = showDeleted ? list : list.filter(p => !p.isDeleted);

  if (!displayList || displayList.length === 0) {
    document.getElementById('pagination').innerHTML = '';
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Không có sản phẩm</td></tr>';
    return;
  }

  const totalPages = Math.ceil(displayList.length / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * pageSize;
  const pageItems = displayList.slice(start, start + pageSize);

  pageItems.forEach((p, idx) => {
    const tr = document.createElement('tr');
    const imgSrc = p.images && p.images.length ? p.images[0] : '';
    
    // Apply strikethrough style if product is deleted
    const titleClass = p.isDeleted ? 'text-decoration-line-through text-muted' : '';
    const priceClass = p.isDeleted ? 'text-decoration-line-through text-muted' : '';
    const rowClass = p.isDeleted ? 'table-light' : '';
    
    tr.className = rowClass;
    tr.innerHTML = `
      <th scope="row">${start + idx + 1}</th>
      <td class="${titleClass}">${escapeHtml(p.title)}</td>
      <td class="${priceClass}">${formatPrice(p.price)}</td>
      <td><img src="${imgSrc}" alt="${escapeHtml(p.title)}" class="img-fluid" style="max-height:60px; object-fit:cover; ${p.isDeleted ? 'opacity:0.5;' : ''}"></td>
      <td>
        <button class="btn btn-sm btn-primary view-btn" data-id="${p.id}">Xem</button>
        ${p.isDeleted 
          ? `<button class="btn btn-sm btn-success ms-1 restore-btn" data-id="${p.id}">Khôi phục</button>` 
          : `<button class="btn btn-sm btn-outline-danger ms-1 delete-btn" data-id="${p.id}">Xóa</button>`
        }
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

// Delete product (soft delete)
function deleteProduct(id) {
  if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
    fetch(`http://localhost:3000/api/products/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(() => {
        // Find and update product in local array
        const product = products.find(p => String(p.id) === String(id));
        if (product) {
          product.isDeleted = true;
        }
        renderTable(filteredProducts);
      })
      .catch(err => alert('Lỗi: ' + err.message));
  }
}

// Restore product
function restoreProduct(id) {
  if (confirm('Bạn có chắc chắn muốn khôi phục sản phẩm này?')) {
    fetch(`http://localhost:3000/api/products/${id}/restore`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(() => {
        // Find and update product in local array
        const product = products.find(p => String(p.id) === String(id));
        if (product) {
          product.isDeleted = false;
        }
        renderTable(filteredProducts);
      })
      .catch(err => alert('Lỗi: ' + err.message));
  }
}

// Show product detail and comments
function showProductDetail(id) {
  const product = products.find(p => String(p.id) === String(id));
  if (!product) return;
  
  currentProductId = id;
  const detailDiv = document.getElementById('productDetail');
  detailDiv.innerHTML = `
    <h5>${escapeHtml(product.title)}</h5>
    <p><strong>Giá:</strong> ${formatPrice(product.price)}</p>
    <p><strong>Mô tả:</strong> ${escapeHtml(product.description)}</p>
    ${product.images && product.images.length ? `<img src="${product.images[0]}" style="max-height:200px; margin-top: 10px;">` : ''}
  `;
  
  loadComments(id);
  const modal = new bootstrap.Modal(document.getElementById('detailModal'));
  modal.show();
}

// Load and display comments
function loadComments(productId) {
  fetch(`http://localhost:3000/api/products/${productId}/comments`)
    .then(res => res.json())
    .then(comments => {
      const commentsList = document.getElementById('commentsList');
      if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<p class="text-muted">Chưa có bình luận</p>';
        return;
      }
      
      commentsList.innerHTML = comments.map(c => `
        <div class="comment-item ${c.isDeleted ? 'comment-deleted' : ''}" data-comment-id="${c.id}">
          <strong>${escapeHtml(c.author)}</strong>
          <div class="text-muted small">${new Date(c.creationAt).toLocaleString('vi-VN')}</div>
          <div class="comment-content">${escapeHtml(c.content)}</div>
          ${!c.isDeleted ? `
            <div class="mt-2">
              <button class="btn btn-sm btn-outline-secondary me-1 edit-comment-btn" data-id="${c.id}">Sửa</button>
              <button class="btn btn-sm btn-danger delete-comment-btn" data-id="${c.id}">Xóa</button>
            </div>
          ` : ''}
        </div>
      `).join('');
    })
    .catch(err => console.error('Lỗi tải bình luận:', err));
}

// Edit comment (open prompt and send PUT)
function editComment(commentId) {
  const productId = currentProductId;
  const product = products.find(p => String(p.id) === String(productId));
  if (!product) return;

  // find comment from product.comments (fallback if not in memory)
  const comment = (product.comments || []).find(c => String(c.id) === String(commentId));
  const currentContent = comment ? comment.content : '';
  const currentAuthor = comment ? comment.author : '';

  const newAuthor = prompt('Sửa tác giả:', currentAuthor);
  if (newAuthor === null) return; // cancelled
  const newContent = prompt('Sửa nội dung:', currentContent);
  if (newContent === null) return;

  fetch(`http://localhost:3000/api/products/${productId}/comments/${commentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: newAuthor, content: newContent })
  })
    .then(res => res.json())
    .then(() => loadComments(productId))
    .catch(err => alert('Lỗi: ' + err.message));
}

// Add comment
function addComment() {
  const author = document.getElementById('commentAuthor').value.trim();
  const content = document.getElementById('commentContent').value.trim();
  
  if (!author || !content) {
    alert('Vui lòng nhập tác giả và nội dung bình luận');
    return;
  }
  
  fetch(`http://localhost:3000/api/products/${currentProductId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author, content })
  })
    .then(res => res.json())
    .then(() => {
      document.getElementById('commentAuthor').value = '';
      document.getElementById('commentContent').value = '';
      loadComments(currentProductId);
    })
    .catch(err => alert('Lỗi: ' + err.message));
}

// Delete comment
function deleteComment(commentId) {
  if (confirm('Bạn có chắc chắn muốn xóa bình luận này?')) {
    fetch(`http://localhost:3000/api/products/${currentProductId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(() => loadComments(currentProductId))
      .catch(err => alert('Lỗi: ' + err.message));
  }
}

// Create/Update product
function saveProduct() {
  const title = document.getElementById('productTitle').value.trim();
  const price = parseFloat(document.getElementById('productPrice').value);
  const description = document.getElementById('productDescription').value.trim();
  const images = document.getElementById('productImages').value.trim();
  
  if (!title || !price || isNaN(price)) {
    alert('Vui lòng nhập tên sản phẩm và giá');
    return;
  }
  
  const payload = {
    title,
    price,
    description,
    images: images ? [images] : []
  };
  
  const isUpdate = currentProductId !== null;
  const url = isUpdate 
    ? `http://localhost:3000/api/products/${currentProductId}` 
    : 'http://localhost:3000/api/products';
  const method = isUpdate ? 'PUT' : 'POST';
  
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(newProduct => {
      if (isUpdate) {
        const idx = products.findIndex(p => String(p.id) === String(currentProductId));
        if (idx !== -1) products[idx] = newProduct;
      } else {
        products.push(newProduct);
      }
      
      filteredProducts = products.slice();
      currentPage = 1;
      renderTable(filteredProducts);
      
      // Reset form and close modal
      document.getElementById('productForm').reset();
      currentProductId = null;
      bootstrap.Modal.getInstance(document.getElementById('createModal')).hide();
    })
    .catch(err => alert('Lỗi: ' + err.message));
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('search').addEventListener('input', () => applySearchAndRender());
  document.getElementById('sortNameAsc').addEventListener('click', () => sortBy('title', true));
  document.getElementById('sortNameDesc').addEventListener('click', () => sortBy('title', false));
  document.getElementById('sortPriceAsc').addEventListener('click', () => sortBy('price', true));
  document.getElementById('sortPriceDesc').addEventListener('click', () => sortBy('price', false));
  
  // Toggle show deleted checkbox
  const showDeletedCheckbox = document.getElementById('showDeleted');
  if (showDeletedCheckbox) {
    showDeletedCheckbox.addEventListener('change', (e) => {
      showDeleted = e.target.checked;
      currentPage = 1;
      renderTable(filteredProducts);
    });
  }
  
  // Create Product Modal handlers
  document.getElementById('createModal').addEventListener('show.bs.modal', () => {
    currentProductId = null;
    document.getElementById('createModalLabel').textContent = 'Thêm sản phẩm';
    document.getElementById('productForm').reset();
  });
  
  document.getElementById('saveProdBtn').addEventListener('click', saveProduct);
  document.getElementById('editProdBtn').addEventListener('click', () => {
    const product = products.find(p => String(p.id) === String(currentProductId));
    if (product) {
      document.getElementById('productTitle').value = product.title;
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productDescription').value = product.description;
      document.getElementById('productImages').value = product.images && product.images.length ? product.images[0] : '';
      
      bootstrap.Modal.getInstance(document.getElementById('detailModal')).hide();
      const createModal = new bootstrap.Modal(document.getElementById('createModal'));
      createModal.show();
      
      document.getElementById('createModalLabel').textContent = 'Sửa sản phẩm';
    }
  });
  
  document.getElementById('addCommentBtn').addEventListener('click', addComment);
  
  // Event delegation for delete and restore buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.dataset.id;
      deleteProduct(id);
    }
    if (e.target.classList.contains('restore-btn')) {
      const id = e.target.dataset.id;
      restoreProduct(id);
    }
    if (e.target.classList.contains('view-btn')) {
      const id = e.target.dataset.id;
      showProductDetail(id);
    }
    if (e.target.classList.contains('delete-comment-btn')) {
      const id = e.target.dataset.id;
      deleteComment(id);
    }
    if (e.target.classList.contains('edit-comment-btn')) {
      const id = e.target.dataset.id;
      editComment(id);
    }
  });
});

fetch('http://localhost:3000/api/products/all')
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
