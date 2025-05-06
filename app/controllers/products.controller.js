import connectiondb from "../database/database.js";

// Obtener todas las categorías
function getAllCategories(req, res) {
  connectiondb.query("SELECT * FROM categories", (error, results) => {
    if (error) {
      console.error("Error fetching categories:", error);
      return res.status(500).json({ error: "Error fetching categories" });
    }
    res.json(results);
  });
}

// Obtener todos los productos con datos de categoría
function getAllProducts(req, res) {
  const query = `
    SELECT p.*, c.category_name 
    FROM products p 
    JOIN categories c ON p.category_id = c.category_id
    WHERE p.is_active = 1
    ORDER BY p.product_id DESC
  `;
  
  connectiondb.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching products:", error);
      return res.status(500).json({ error: "Error fetching products" });
    }
    res.json(results);
  });
}

// Obtener productos por categoría
function getProductsByCategory(req, res) {
  const categoryId = req.params.categoryId;
  
  const query = `
    SELECT p.*, c.category_name 
    FROM products p 
    JOIN categories c ON p.category_id = c.category_id
    WHERE p.is_active = 1 AND p.category_id = ?
  `;
  
  connectiondb.query(query, [categoryId], (error, results) => {
    if (error) {
      console.error("Error fetching products by category:", error);
      return res.status(500).json({ error: "Error fetching products" });
    }
    res.json(results);
  });
}

// Obtener productos destacados
function getFeaturedProducts(req, res) {
  // Suponiendo que tienes alguna manera de marcar productos como destacados
  // Por ahora, simplemente devolvemos los 3 productos más recientes
  const query = `
    SELECT p.*, c.category_name 
    FROM products p 
    JOIN categories c ON p.category_id = c.category_id
    WHERE p.is_active = 1
    ORDER BY p.product_id DESC
    LIMIT 3
  `;
  
  connectiondb.query(query, (error, results) => {
    if (error) {
      console.error("Error fetching featured products:", error);
      return res.status(500).json({ error: "Error fetching products" });
    }
    res.json(results);
  });
}

// Buscar productos
function searchProducts(req, res) {
  const searchTerm = `%${req.query.term}%`;
  
  const query = `
    SELECT p.*, c.category_name 
    FROM products p 
    JOIN categories c ON p.category_id = c.category_id
    WHERE p.is_active = 1 
      AND (p.product_name LIKE ? OR p.description LIKE ?)
  `;
  
  connectiondb.query(query, [searchTerm, searchTerm], (error, results) => {
    if (error) {
      console.error("Error searching products:", error);
      return res.status(500).json({ error: "Error searching products" });
    }
    res.json(results);
  });
}

export const methods = {
  getAllCategories,
  getAllProducts,
  getProductsByCategory,
  getFeaturedProducts,
  searchProducts
};