import connectiondb from "../database/database.js";
import { publishLowStock } from "./product-checker.js";

// Crear un nuevo pedido a partir del carrito
async function createOrder(req, res) {
  const userId = req.user.id_user;
  const { addressId } = req.body;
  
  if (!addressId) {
    return res.status(400).json({ error: "Address ID is required" });
  }
  
  // Iniciar transacción
  connectiondb.beginTransaction(async (err) => {
    if (err) {
      console.error("Error starting transaction:", err);
      return res.status(500).json({ error: "Server error" });
    }
    
    try {
      // 1. Obtener el carrito del usuario
      const cartId = await getCartId(userId);
      if (!cartId) {
        connectiondb.rollback();
        return res.status(400).json({ error: "Cart is empty" });
      }
      
      // 2. Obtener los items del carrito
      const cartItems = await getCartItems(cartId);
      if (cartItems.length === 0) {
        connectiondb.rollback();
        return res.status(400).json({ error: "Cart is empty" });
      }
      
      // 3. Calcular el total
      let total = 0;
      for (const item of cartItems) {
        const productInfo = await getProductInfo(item.product_id);
        if (!productInfo) {
          connectiondb.rollback();
          return res.status(400).json({ error: `Product ${item.product_id} not found` });
        }
        
        // Verificar stock
        if (productInfo.stock < item.quantity) {
          connectiondb.rollback();
          return res.status(400).json({ 
            error: `Only ${productInfo.stock} items available for ${productInfo.product_name}` 
          });
        }
        
        total += productInfo.price * item.quantity;
      }
      
      // 4. Crear el pedido
      const orderId = await createNewOrder(userId, addressId, total);
      
      // 5. Insertar los productos del pedido
      for (const item of cartItems) {
        const productInfo = await getProductInfo(item.product_id);
        await addOrderItem(orderId, item.product_id, item.quantity, productInfo.price);
        
        // 6. Actualizar el stock
        await updateProductStock(item.product_id, productInfo.stock - item.quantity);
      }
      
      // 7. Vaciar el carrito
      await clearCart(cartId);
      
      // Confirmar la transacción
      connectiondb.commit((err) => {
        if (err) {
          console.error("Error committing transaction:", err);
          connectiondb.rollback();
          return res.status(500).json({ error: "Server error" });
        }
        
        res.status(201).json({ 
          success: true, 
          message: "Order created successfully",
          orderId: orderId
        });
      });
      
    } catch (error) {
      connectiondb.rollback();
      console.error("Error in createOrder:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
}

// Obtener el ID del carrito
function getCartId(userId) {
  return new Promise((resolve, reject) => {
    connectiondb.query(
      "SELECT cart_id FROM carts WHERE user_id = ?",
      [userId],
      (error, results) => {
        if (error) return reject(error);
        resolve(results.length > 0 ? results[0].cart_id : null);
      }
    );
  });
}

// Obtener los items del carrito
function getCartItems(cartId) {
  return new Promise((resolve, reject) => {
    connectiondb.query(
      "SELECT product_id, quantity FROM cart_items WHERE cart_id = ?",
      [cartId],
      (error, results) => {
        if (error) return reject(error);
        resolve(results);
      }
    );
  });
}

// Obtener información de un producto
function getProductInfo(productId) {
  return new Promise((resolve, reject) => {
    connectiondb.query(
      "SELECT product_id, product_name, price, stock FROM products WHERE product_id = ?",
      [productId],
      (error, results) => {
        if (error) return reject(error);
        resolve(results.length > 0 ? results[0] : null);
      }
    );
  });
}

// Crear un nuevo pedido
function createNewOrder(userId, addressId, total) {
  return new Promise((resolve, reject) => {
    connectiondb.query(
      "INSERT INTO orders (user_id, address_id, total, status) VALUES (?, ?, ?, 'pending')",
      [userId, addressId, total],
      (error, result) => {
        if (error) return reject(error);
        resolve(result.insertId);
      }
    );
  });
}

// Añadir un item al pedido
function addOrderItem(orderId, productId, quantity, price) {
  return new Promise((resolve, reject) => {
    connectiondb.query(
      "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
      [orderId, productId, quantity, price],
      (error) => {
        if (error) return reject(error);
        resolve();
      }
    );
  });
}

// Actualizar el stock de un producto
function updateProductStock(productId, newStock) {
  return new Promise((resolve, reject) => {
    connectiondb.query(
      "UPDATE products SET stock = ? WHERE product_id = ?",
      [newStock, productId],
      (error, result) => {
        if (error) return reject(error);
        
        // Después de actualizar, verificar si el stock está bajo
        connectiondb.query(
          "SELECT product_id, product_name, stock FROM products WHERE product_id = ?",
          [productId],
          async (err, products) => {
            if (!err && products.length > 0) {
              const product = products[0];
              // Si el stock está por debajo del umbral, publicar alerta
              if (product.stock <= 40) {
                await publishLowStock({
                  id: product.product_id,
                  name: product.product_name,
                  stock: product.stock
                });
              }
            }
            resolve(result);
          }
        );
      }
    );
  });
}

// Vaciar el carrito
function clearCart(cartId) {
  return new Promise((resolve, reject) => {
    connectiondb.query(
      "DELETE FROM cart_items WHERE cart_id = ?",
      [cartId],
      (error) => {
        if (error) return reject(error);
        resolve();
      }
    );
  });
}

// Obtener pedidos del usuario
function getUserOrders(req, res) {
  const userId = req.user.id_user;
  
  const query = `
    SELECT o.order_id, o.order_date, o.total, o.status,
           d.address, d.city, d.postal_code, d.country
    FROM orders o
    JOIN directions d ON o.address_id = d.id_direction
    WHERE o.user_id = ?
    ORDER BY o.order_date DESC
  `;
  
  connectiondb.query(query, [userId], (error, results) => {
    if (error) {
      console.error("Error fetching orders:", error);
      return res.status(500).json({ error: "Server error" });
    }
    
    res.json(results);
  });
}

// Obtener detalles de un pedido
function getOrderDetails(req, res) {
  const userId = req.user.id_user;
  const orderId = req.params.orderId;
  
  // Verificar que el pedido pertenece al usuario
  connectiondb.query(
    "SELECT * FROM orders WHERE order_id = ? AND user_id = ?",
    [orderId, userId],
    (error, orderResults) => {
      if (error) {
        console.error("Error fetching order:", error);
        return res.status(500).json({ error: "Server error" });
      }
      
      if (orderResults.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const order = orderResults[0];
      
      // Obtener dirección
      connectiondb.query(
        "SELECT * FROM directions WHERE id_direction = ?",
        [order.address_id],
        (error, addressResults) => {
          if (error) {
            console.error("Error fetching address:", error);
            return res.status(500).json({ error: "Server error" });
          }
          
          // Obtener items del pedido
          const query = `
            SELECT oi.quantity, oi.price, 
                   (oi.quantity * oi.price) as subtotal,
                   p.product_id, p.product_name, p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id = ?
          `;
          
          connectiondb.query(query, [orderId], (error, itemResults) => {
            if (error) {
              console.error("Error fetching order items:", error);
              return res.status(500).json({ error: "Server error" });
            }
            
            res.json({
              order: order,
              address: addressResults[0],
              items: itemResults
            });
          });
        }
      );
    }
  );
}

export const methods = {
  createOrder,
  getUserOrders,
  getOrderDetails
};