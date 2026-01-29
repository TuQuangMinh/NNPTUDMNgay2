const express = require("express");
const cors = require("cors");
const products = require("./db.json");

const app = express();
app.use(cors());
app.use(express.static("public"));

app.get("/api/products", (req, res) => {
  res.json(products);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
