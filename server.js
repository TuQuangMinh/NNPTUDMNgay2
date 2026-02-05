const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.static("public"));
app.use(express.json());

const dbPath = path.join(__dirname, "db.json");

// Helper function to read db.json
function readDb() {
  return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

// Helper function to write db.json
function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Helper function to get maxId from products
function getMaxId(products) {
  return products.reduce((max, p) => {
    const id = typeof p.id === "string" ? parseInt(p.id) : p.id;
    return Math.max(max, isNaN(id) ? 0 : id);
  }, 0);
}

// GET all products (excluding soft-deleted)
app.get("/api/products", (req, res) => {
  try {
    const db = readDb();
    const products = db.filter(p => !p.isDeleted);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all products including soft-deleted (for admin view)
app.get("/api/products/all", (req, res) => {
  try {
    const db = readDb();
    res.json(db);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET product by ID
app.get("/api/products/:id", (req, res) => {
  try {
    const db = readDb();
    const product = db.find(p => String(p.id) === String(req.params.id));
    if (!product) {
      return res.status(404).json({ error: "Sản phẩm không tìm thấy" });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE product
app.post("/api/products", (req, res) => {
  try {
    const db = readDb();
    const { title, price, description, category, images, content } = req.body;
    
    // Validate required fields
    if (!title || !price) {
      return res.status(400).json({ error: "Tên sản phẩm và giá là bắt buộc" });
    }
    
    const maxId = getMaxId(db);
    const newProduct = {
      id: String(maxId + 1),
      title,
      price,
      description: description || "",
      category: category || null,
      images: images || [],
      content: content || "",
      isDeleted: false,
      creationAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: []
    };
    
    db.push(newProduct);
    writeDb(db);
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE product
app.put("/api/products/:id", (req, res) => {
  try {
    const db = readDb();
    const index = db.findIndex(p => String(p.id) === String(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: "Sản phẩm không tìm thấy" });
    }
    
    const { title, price, description, category, images, content } = req.body;
    const product = db[index];
    
    if (title !== undefined) product.title = title;
    if (price !== undefined) product.price = price;
    if (description !== undefined) product.description = description;
    if (category !== undefined) product.category = category;
    if (images !== undefined) product.images = images;
    if (content !== undefined) product.content = content;
    product.updatedAt = new Date().toISOString();
    
    db[index] = product;
    writeDb(db);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SOFT DELETE product
app.delete("/api/products/:id", (req, res) => {
  try {
    const db = readDb();
    const index = db.findIndex(p => String(p.id) === String(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: "Sản phẩm không tìm thấy" });
    }
    
    db[index].isDeleted = true;
    db[index].updatedAt = new Date().toISOString();
    writeDb(db);
    res.json({ message: "Sản phẩm đã được xóa" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RESTORE soft-deleted product
app.put("/api/products/:id/restore", (req, res) => {
  try {
    const db = readDb();
    const index = db.findIndex(p => String(p.id) === String(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: "Sản phẩm không tìm thấy" });
    }
    
    db[index].isDeleted = false;
    db[index].updatedAt = new Date().toISOString();
    writeDb(db);
    res.json(db[index]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET comments for a product
app.get("/api/products/:id/comments", (req, res) => {
  try {
    const db = readDb();
    const product = db.find(p => String(p.id) === String(req.params.id));
    if (!product) {
      return res.status(404).json({ error: "Sản phẩm không tìm thấy" });
    }
    res.json(product.comments || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE comment for a product
app.post("/api/products/:id/comments", (req, res) => {
  try {
    const db = readDb();
    const index = db.findIndex(p => String(p.id) === String(req.params.id));
    
    if (index === -1) {
      return res.status(404).json({ error: "Sản phẩm không tìm thấy" });
    }
    
    const { content, author } = req.body;
    if (!content || !author) {
      return res.status(400).json({ error: "Nội dung và tác giả là bắt buộc" });
    }
    
    if (!db[index].comments) {
      db[index].comments = [];
    }
    
    const maxCommentId = db[index].comments.reduce((max, c) => {
      const id = typeof c.id === "string" ? parseInt(c.id) : c.id;
      return Math.max(max, isNaN(id) ? 0 : id);
    }, 0);
    
    const newComment = {
      id: String(maxCommentId + 1),
      content,
      author,
      isDeleted: false,
      creationAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    db[index].comments.push(newComment);
    db[index].updatedAt = new Date().toISOString();
    writeDb(db);
    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE comment
app.put("/api/products/:id/comments/:commentId", (req, res) => {
  try {
    const db = readDb();
    const productIndex = db.findIndex(p => String(p.id) === String(req.params.id));
    
    if (productIndex === -1) {
      return res.status(404).json({ error: "Sản phẩm không tìm thấy" });
    }
    
    if (!db[productIndex].comments) {
      db[productIndex].comments = [];
    }
    
    const commentIndex = db[productIndex].comments.findIndex(
      c => String(c.id) === String(req.params.commentId)
    );
    
    if (commentIndex === -1) {
      return res.status(404).json({ error: "Bình luận không tìm thấy" });
    }
    
    const { content, author } = req.body;
    if (content !== undefined) db[productIndex].comments[commentIndex].content = content;
    if (author !== undefined) db[productIndex].comments[commentIndex].author = author;
    db[productIndex].comments[commentIndex].updatedAt = new Date().toISOString();
    db[productIndex].updatedAt = new Date().toISOString();
    
    writeDb(db);
    res.json(db[productIndex].comments[commentIndex]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE comment (soft delete)
app.delete("/api/products/:id/comments/:commentId", (req, res) => {
  try {
    const db = readDb();
    const productIndex = db.findIndex(p => String(p.id) === String(req.params.id));
    
    if (productIndex === -1) {
      return res.status(404).json({ error: "Sản phẩm không tìm thấy" });
    }
    
    if (!db[productIndex].comments) {
      db[productIndex].comments = [];
    }
    
    const commentIndex = db[productIndex].comments.findIndex(
      c => String(c.id) === String(req.params.commentId)
    );
    
    if (commentIndex === -1) {
      return res.status(404).json({ error: "Bình luận không tìm thấy" });
    }
    
    db[productIndex].comments[commentIndex].isDeleted = true;
    db[productIndex].comments[commentIndex].updatedAt = new Date().toISOString();
    db[productIndex].updatedAt = new Date().toISOString();
    
    writeDb(db);
    res.json({ message: "Bình luận đã được xóa" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
