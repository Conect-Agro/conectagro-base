import connectiondb from "../database/database.js";

// Obtener o crear carrito para el usuario
async function getOrCreateCart(userId) {
  return new Promise((resolve, reject) => {
    connectiondb.query(
      "SELECT cart_id FROM carts WHERE user_id = ?",
      [userId],
      (error, results) => {
        if (error) return reject(error);
        
        if (results.length > 0) {
          resolve(results[0].cart_id);
        } else {
          // Crear nuevo carrito
          connectiondb.query(
            "INSERT INTO carts (user_id) VALUES (?)",
            [userId],
            (error, result) => {
              if (error) return reject(error);
              resolve(result.insertId);
            }
          );
        }
      }
    );
  });
}

// Obtener el contenido del carrito
async function getCartItems(req, res) {
  try {
    const userId = req.user.id_user;
    const cartId = await getOrCreateCart(userId);
    
    const query = `
      SELECT 
        ci.quantity, 
        p.product_id, 
        p.product_name, 
        CAST(p.price AS DECIMAL(10,2)) as price,
        p.image_url,
        CAST((ci.quantity * p.price) AS DECIMAL(10,2)) as subtotal
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.product_id
      WHERE ci.cart_id = ?
    `;
    
    connectiondb.query(query, [cartId], (error, results) => {
      if (error) {
        console.error("Error getting cart items:", error);
        return res.status(500).json({ error: "Error getting cart items" });
      }
      
      // Asegurarse que los valores numéricos sean tratados como números
      const items = results.map(item => ({
        ...item,
        price: parseFloat(item.price),
        subtotal: parseFloat(item.subtotal)
      }));
      
      // Calcular el total
      const total = items.reduce((sum, item) => sum + item.subtotal, 0);
      
      res.json({
        items: items,
        total: total,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0)
      });
    });
  } catch (error) {
    console.error("Error in getCartItems:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Añadir un producto al carrito
async function addToCart(req, res) {
  try {
    const userId = req.user.id_user;
    const { productId, quantity } = req.body;
    
    if (!productId || !quantity) {
      return res.status(400).json({ error: "Product ID and quantity are required" });
    }
    
    // Verificar stock
    const stockCheck = await checkProductStock(productId, quantity);
    if (!stockCheck.success) {
      return res.status(400).json({ error: stockCheck.message });
    }
    
    const cartId = await getOrCreateCart(userId);
    
    // Verificar si el producto ya está en el carrito
    connectiondb.query(
      "SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ?",
      [cartId, productId],
      (error, results) => {
        if (error) {
          console.error("Error checking cart item:", error);
          return res.status(500).json({ error: "Server error" });
        }
        
        if (results.length > 0) {
          // Actualizar cantidad
          const newQuantity = results[0].quantity + parseInt(quantity);
          connectiondb.query(
            "UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?",
            [newQuantity, cartId, productId],
            (error) => {
              if (error) {
                console.error("Error updating cart item:", error);
                return res.status(500).json({ error: "Server error" });
              }
              res.json({ success: true, message: "Product quantity updated in cart" });
            }
          );
        } else {
          // Insertar nuevo item
          connectiondb.query(
            "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)",
            [cartId, productId, quantity],
            (error) => {
              if (error) {
                console.error("Error adding item to cart:", error);
                return res.status(500).json({ error: "Server error" });
              }
              res.json({ success: true, message: "Product added to cart" });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error("Error in addToCart:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Verificar stock disponible
function checkProductStock(productId, requestedQuantity) {
  return new Promise((resolve, reject) => {
    connectiondb.query(
      "SELECT stock FROM products WHERE product_id = ?",
      [productId],
      (error, results) => {
        if (error) return reject(error);
        
        if (results.length === 0) {
          resolve({ success: false, message: "Product not found" });
        } else if (results[0].stock < requestedQuantity) {
          resolve({ 
            success: false, 
            message: `Only ${results[0].stock} items available` 
          });
        } else {
          resolve({ success: true });
        }
      }
    );
  });
}

// Actualizar cantidad de un producto en el carrito
async function updateCartItem(req, res) {
  try {
    const userId = req.user.id_user;
    const { productId, quantity } = req.body;
    
    if (!productId || !quantity) {
      return res.status(400).json({ error: "Product ID and quantity are required" });
    }
    
    // Si la cantidad es 0, eliminar el producto
    if (parseInt(quantity) === 0) {
      return removeFromCart(req, res);
    }
    
    // Verificar stock
    const stockCheck = await checkProductStock(productId, quantity);
    if (!stockCheck.success) {
      return res.status(400).json({ error: stockCheck.message });
    }
    
    const cartId = await getOrCreateCart(userId);
    
    connectiondb.query(
      "UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?",
      [quantity, cartId, productId],
      (error, result) => {
        if (error) {
          console.error("Error updating cart item:", error);
          return res.status(500).json({ error: "Server error" });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Item not found in cart" });
        }
        
        res.json({ success: true, message: "Cart updated" });
      }
    );
  } catch (error) {
    console.error("Error in updateCartItem:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Eliminar producto del carrito
async function removeFromCart(req, res) {
  try {
    const userId = req.user.id_user;
    const productId = req.body.productId || req.params.productId;
    
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }
    
    const cartId = await getOrCreateCart(userId);
    
    connectiondb.query(
      "DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?",
      [cartId, productId],
      (error, result) => {
        if (error) {
          console.error("Error removing cart item:", error);
          return res.status(500).json({ error: "Server error" });
        }
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Item not found in cart" });
        }
        
        res.json({ success: true, message: "Item removed from cart" });
      }
    );
  } catch (error) {
    console.error("Error in removeFromCart:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Vaciar carrito
async function clearCart(req, res) {
  try {
    const userId = req.user.id_user;
    const cartId = await getOrCreateCart(userId);
    
    connectiondb.query(
      "DELETE FROM cart_items WHERE cart_id = ?",
      [cartId],
      (error) => {
        if (error) {
          console.error("Error clearing cart:", error);
          return res.status(500).json({ error: "Server error" });
        }
        
        res.json({ success: true, message: "Cart cleared" });
      }
    );
  } catch (error) {
    console.error("Error in clearCart:", error);
    res.status(500).json({ error: "Server error" });
  }
}

export const methods = {
  getCartItems,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};