import connectiondb from "../database/database.js";
import { publishLowStock } from "./product-checker.js";

// Función para enviar el resumen del pedido al microservicio de email
async function sendOrderSummary(userId, orderId) {
  try {
    console.log(`🔄 Iniciando envío de resumen de pedido - ID: ${orderId} para usuario ID: ${userId}`);
    
    // 1. Obtener datos del usuario
    const userQuery = "SELECT username, email, document_number FROM users WHERE user_id = ?";
    console.log(`📝 Ejecutando consulta de usuario: ${userQuery} con ID: ${userId}`);
    const userData = await queryAsync(userQuery, [userId]);
    
    if (!userData || userData.length === 0) {
      console.error("❌ Usuario no encontrado para enviar el resumen del pedido");
      return;
    }
    const user = userData[0];
    console.log(`✅ Usuario encontrado: ${user.name}, Email: ${user.email}`);
    
    // 2. Obtener datos del pedido
    const orderQuery = "SELECT order_id, order_date, status FROM orders WHERE order_id = ?";
    console.log(`📝 Ejecutando consulta de pedido: ${orderQuery} con ID: ${orderId}`);
    const orderData = await queryAsync(orderQuery, [orderId]);
    
    if (!orderData || orderData.length === 0) {
      console.error("❌ Pedido no encontrado para enviar resumen");
      return;
    }
    const order = orderData[0];
    console.log(`✅ Pedido encontrado: #${order.order_id}, Fecha: ${order.order_date}`);
    
    // 3. Obtener productos del pedido
    const productsQuery = `
      SELECT p.product_name as nombre, oi.quantity as cantidad, oi.price as precio
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id = ?
    `;
    console.log(`📝 Ejecutando consulta de productos del pedido con ID: ${orderId}`);
    const products = await queryAsync(productsQuery, [orderId]);
    // Convertir los precios a números
    products.forEach(product => {
      product.precio = parseFloat(product.precio);
    });
    console.log(`✅ Productos encontrados: ${products.length} items`);
    
    // 4. Crear el objeto de datos para la solicitud
    const orderSummaryData = {
      usuario: {
        nombre: user.username,
        email: user.email,
        telefono: user.phone || "3212827709"
      },
      pedido: {
        id: `ORD-${order.order_id}`,
        fecha: order.order_date,
        estado: getStatusInSpanish(order.status),
        productos: products
      }
    };
    
    console.log(`📧 Preparando envío de email a: ${user.email} para el pedido: ORD-${order.order_id}`);
    console.log(`🔍 Datos a enviar al microservicio:`, JSON.stringify(orderSummaryData, null, 2));
    
    // 5. Enviar la solicitud al microservicio
    console.log(`🌐 Enviando solicitud a: ${process.env.EMAIL_MICROSERVICE_URL}${process.env.EMAIL_MICROSERVICE_ENDPOINT}`);
    const response = await fetch(`${process.env.EMAIL_MICROSERVICE_URL}${process.env.EMAIL_MICROSERVICE_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(orderSummaryData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`❌ Error al enviar el resumen de pedido (${response.status}):`, errorData);
      console.error(`⚠️ Verifica que el microservicio de email esté ejecutándose en ${process.env.EMAIL_MICROSERVICE_URL}${process.env.EMAIL_MICROSERVICE_ENDPOINT}`);
      return;
    }
    
    const result = await response.json();
    console.log(`✅ Resumen de pedido enviado exitosamente:`);
    console.log(`   📨 Email enviado a: ${user.email}`);
    console.log(`   📃 Pedido: ORD-${order.order_id}`);
    console.log(`   🆔 ID del mensaje: ${result.messageId || 'No disponible'}`);
    
  } catch (error) {
    console.error("❌ Error en sendOrderSummary:", error);
    console.error("⚠️ Verifica la conexión con el microservicio y los datos enviados");
  }
}

// Función auxiliar para convertir el estado del pedido al español
function getStatusInSpanish(status) {
  const statusMap = {
    'pending': 'Pendiente',
    'processing': 'En proceso',
    'completed': 'Completado',
    'cancelled': 'Cancelado'
  };
  
  return statusMap[status] || status;
}

// Función auxiliar para hacer consultas asíncronas
function queryAsync(query, params) {
  return new Promise((resolve, reject) => {
    connectiondb.query(query, params, (error, results) => {
      if (error) return reject(error);
      resolve(results);
    });
  });
}

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
        
        // 8. Enviar el resumen del pedido al microservicio de email (asíncrono)
        sendOrderSummary(userId, orderId).catch(error => {
          console.error("Error al enviar el resumen del pedido por email:", error);
        });
        
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