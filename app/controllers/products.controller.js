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
  const { sort, category } = req.query;

  let orderBy = "p.product_id DESC"; // Default ordering

  // Handle sorting
  if (sort) {
    switch (sort) {
      case "price_asc":
        orderBy = "p.price ASC";
        break;
      case "price_desc":
        orderBy = "p.price DESC";
        break;
      case "popular":
        orderBy = "p.product_id DESC"; // Could be based on sales or views
        break;
      case "newest":
        orderBy = "p.created_at DESC, p.product_id DESC";
        break;
      case "rating":
        orderBy = "p.product_id DESC"; // Could be based on ratings
        break;
      default:
        orderBy = "p.product_id DESC";
    }
  }

  let whereClause = "WHERE p.is_active = 1";
  let queryParams = [];

  // Handle category filtering
  if (category && category !== "0") {
    whereClause += " AND p.category_id = ?";
    queryParams.push(category);
  }

  const query = `
  SELECT 
    p.product_id,
    p.product_name,
    p.description,
    CAST(p.price AS UNSIGNED) AS price,
    p.stock,
    p.unit,
    p.image_url,
    p.category_id,
    c.category_name,
    p.origin,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM products p
  JOIN categories c ON p.category_id = c.category_id
  ${whereClause}
  ORDER BY ${orderBy}
`;

  connectiondb.query(query, queryParams, (error, results) => {
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
    LIMIT 9
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
  const searchQuery = req.query.q || req.query.term; // Accept both 'q' and 'term'

  if (!searchQuery) {
    return res.status(400).json({ error: "Search query is required" });
  }

  const searchTerm = `%${searchQuery}%`;

  const query = `
    SELECT p.*, c.category_name 
    FROM products p 
    JOIN categories c ON p.category_id = c.category_id
    WHERE p.is_active = 1 
      AND (p.product_name LIKE ? OR p.description LIKE ? OR c.category_name LIKE ?)
    ORDER BY p.product_name ASC
  `;

  connectiondb.query(
    query,
    [searchTerm, searchTerm, searchTerm],
    (error, results) => {
      if (error) {
        console.error("Error searching products:", error);
        return res.status(500).json({ error: "Error searching products" });
      }
      res.json(results);
    }
  );
}

export const methods = {
  getAllCategories,
  getAllProducts,
  getProductsByCategory,
  getFeaturedProducts,
  searchProducts,
};
