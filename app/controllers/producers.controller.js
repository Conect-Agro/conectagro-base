import connectiondb from "../database/database.js";

// ===== PERFIL DEL PRODUCTOR =====

// Obtener información del productor y sus métricas
function getProducerProfile(req, res) {
  const userId = req.user.id_user;
  
  const query = `
    SELECT 
      p.*,
      u.first_name,
      u.last_name,
      u.email,
      pt.name as production_type_name,
      pt.category as production_type_category
    FROM producers p
    JOIN users u ON p.user_id = u.user_id
    LEFT JOIN production_types pt ON p.production_type_id = pt.id
    WHERE p.user_id = ?
  `;
  
  connectiondb.query(query, [userId], (error, results) => {
    if (error) {
      console.error("Error fetching producer profile:", error);
      return res.status(500).json({ error: "Error al obtener perfil del productor" });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: "Productor no encontrado" });
    }
    
    res.json(results[0]);
  });
}

// Obtener métricas del dashboard
function getDashboardMetrics(req, res) {
  const userId = req.user.id_user;
  
  // Primero obtener el producer_id
  const getProducerIdQuery = "SELECT producer_id FROM producers WHERE user_id = ?";
  
  connectiondb.query(getProducerIdQuery, [userId], (error, producerResults) => {
    if (error || producerResults.length === 0) {
      return res.status(500).json({ error: "Error al obtener información del productor" });
    }
    
    const producerId = producerResults[0].producer_id;
    
    // Consultas para métricas
    const metricsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM products WHERE producer_id = ? AND is_active = 1) as active_products,
        (SELECT COALESCE(SUM(oi.quantity * oi.price), 0) 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.product_id 
         WHERE p.producer_id = ?) as total_sales,
        (SELECT COUNT(DISTINCT o.order_id) 
         FROM orders o
         JOIN order_items oi ON o.order_id = oi.order_id
         JOIN products p ON oi.product_id = p.product_id
         WHERE p.producer_id = ? AND o.status = 'pending') as pending_orders
    `;
    
    connectiondb.query(metricsQuery, [producerId, producerId, producerId], (error, metrics) => {
      if (error) {
        console.error("Error fetching metrics:", error);
        return res.status(500).json({ error: "Error al obtener métricas" });
      }
      
      // Por ahora, calificación promedio será estática (4.8)
      // Podrías agregar una tabla de reviews más adelante
      const result = {
        ...metrics[0],
        avg_rating: 4.7
      };
      
      res.json(result);
    });
  });
}

// Actualizar perfil del productor
function updateProducerProfile(req, res) {
  const userId = req.user.id_user;
  const updateFields = req.body;
  
  // Construir la query dinámicamente basado en los campos recibidos
  const allowedFields = ['farm_name', 'nit', 'location', 'farm_size', 'production_type_id', 'contact_phone', 'contact_email'];
  const fieldsToUpdate = [];
  const values = [];
  
  allowedFields.forEach(field => {
    if (updateFields.hasOwnProperty(field)) {
      fieldsToUpdate.push(`${field} = ?`);
      values.push(updateFields[field]);
    }
  });
  
  if (fieldsToUpdate.length === 0) {
    return res.status(400).json({ error: "No hay campos para actualizar" });
  }
  
  values.push(userId); // Add userId for WHERE clause
  
  const query = `UPDATE producers SET ${fieldsToUpdate.join(', ')} WHERE user_id = ?`;
  
  connectiondb.query(query, values, (error, results) => {
    if (error) {
      console.error("Error updating producer profile:", error);
      return res.status(500).json({ error: "Error al actualizar perfil" });
    }
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: "Productor no encontrado" });
    }
    
    res.json({ message: "Perfil actualizado exitosamente" });
  });
}

// ===== GESTIÓN DE PRODUCTOS =====

// Obtener todos los productos del productor
function getProducerProducts(req, res) {
  const userId = req.user.id_user;
  
  // Primero obtener el producer_id
  const getProducerIdQuery = "SELECT producer_id FROM producers WHERE user_id = ?";
  
  connectiondb.query(getProducerIdQuery, [userId], (error, producerResults) => {
    if (error || producerResults.length === 0) {
      return res.status(500).json({ error: "Error al obtener información del productor" });
    }
    
    const producerId = producerResults[0].producer_id;
    
    const query = `
      SELECT p.*, c.category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
      WHERE p.producer_id = ?
      ORDER BY p.created_at DESC
    `;
    
    connectiondb.query(query, [producerId], (error, results) => {
      if (error) {
        console.error("Error fetching producer products:", error);
        return res.status(500).json({ error: "Error al obtener productos" });
      }
      
      res.json(results);
    });
  });
}

// Crear un nuevo producto
function createProduct(req, res) {
  const userId = req.user.id_user;
  const { product_name, description, price, stock, unit, category_id, origin, image_url } = req.body;
  
  // Validaciones
  if (!product_name || !price || stock === undefined || !category_id) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  
  // Obtener producer_id
  const getProducerIdQuery = "SELECT producer_id FROM producers WHERE user_id = ?";
  
  connectiondb.query(getProducerIdQuery, [userId], (error, producerResults) => {
    if (error || producerResults.length === 0) {
      return res.status(500).json({ error: "Error al obtener información del productor" });
    }
    
    const producerId = producerResults[0].producer_id;
    
    const insertQuery = `
      INSERT INTO products (producer_id, product_name, description, price, stock, unit, category_id, origin, image_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    
    const imageUrlFinal = image_url || '/img/ConectAgro.png';
    
    connectiondb.query(
      insertQuery,
      [producerId, product_name, description, price, stock, unit, category_id, origin, imageUrlFinal],
      (error, results) => {
        if (error) {
          console.error("Error creating product:", error);
          return res.status(500).json({ error: "Error al crear producto" });
        }
        
        res.status(201).json({ 
          message: "Producto creado exitosamente",
          product_id: results.insertId 
        });
      }
    );
  });
}

// Actualizar un producto existente
function updateProduct(req, res) {
  const userId = req.user.id_user;
  const productId = req.params.productId;
  const { product_name, description, price, stock, unit, category_id, origin, image_url, is_active } = req.body;
  
  // Verificar que el producto pertenece al productor
  const verifyQuery = `
    SELECT p.product_id 
    FROM products p
    JOIN producers pr ON p.producer_id = pr.producer_id
    WHERE p.product_id = ? AND pr.user_id = ?
  `;
  
  connectiondb.query(verifyQuery, [productId, userId], (error, results) => {
    if (error) {
      return res.status(500).json({ error: "Error al verificar producto" });
    }
    
    if (results.length === 0) {
      return res.status(403).json({ error: "No tienes permiso para editar este producto" });
    }
    
    const updateQuery = `
      UPDATE products 
      SET product_name = ?, description = ?, price = ?, stock = ?, 
          unit = ?, category_id = ?, origin = ?, image_url = ?, is_active = ?
      WHERE product_id = ?
    `;
    
    connectiondb.query(
      updateQuery,
      [product_name, description, price, stock, unit, category_id, origin, image_url, is_active, productId],
      (error, results) => {
        if (error) {
          console.error("Error updating product:", error);
          return res.status(500).json({ error: "Error al actualizar producto" });
        }
        
        res.json({ message: "Producto actualizado exitosamente" });
      }
    );
  });
}

// Eliminar un producto
function deleteProduct(req, res) {
  const userId = req.user.id_user;
  const productId = req.params.productId;
  
  // Verificar que el producto pertenece al productor
  const verifyQuery = `
    SELECT p.product_id 
    FROM products p
    JOIN producers pr ON p.producer_id = pr.producer_id
    WHERE p.product_id = ? AND pr.user_id = ?
  `;
  
  connectiondb.query(verifyQuery, [productId, userId], (error, results) => {
    if (error) {
      return res.status(500).json({ error: "Error al verificar producto" });
    }
    
    if (results.length === 0) {
      return res.status(403).json({ error: "No tienes permiso para eliminar este producto" });
    }
    
    // Soft delete: marcar como inactivo en lugar de eliminar
    const deleteQuery = "UPDATE products SET is_active = 0 WHERE product_id = ?";
    
    connectiondb.query(deleteQuery, [productId], (error, results) => {
      if (error) {
        console.error("Error deleting product:", error);
        return res.status(500).json({ error: "Error al eliminar producto" });
      }
      
      res.json({ message: "Producto eliminado exitosamente" });
    });
  });
}

// Obtener un producto específico
function getProductById(req, res) {
  const userId = req.user.id_user;
  const productId = req.params.productId;
  
  const query = `
    SELECT p.*, c.category_name 
    FROM products p
    JOIN categories c ON p.category_id = c.category_id
    JOIN producers pr ON p.producer_id = pr.producer_id
    WHERE p.product_id = ? AND pr.user_id = ?
  `;
  
  connectiondb.query(query, [productId, userId], (error, results) => {
    if (error) {
      console.error("Error fetching product:", error);
      return res.status(500).json({ error: "Error al obtener producto" });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    
    res.json(results[0]);
  });
}

// ===== GESTIÓN DE PEDIDOS =====

// Obtener todos los pedidos que incluyen productos del productor
function getProducerOrders(req, res) {
  const userId = req.user.id_user;
  
  // Obtener producer_id
  const getProducerIdQuery = "SELECT producer_id FROM producers WHERE user_id = ?";
  
  connectiondb.query(getProducerIdQuery, [userId], (error, producerResults) => {
    if (error || producerResults.length === 0) {
      return res.status(500).json({ error: "Error al obtener información del productor" });
    }
    
    const producerId = producerResults[0].producer_id;
    
    const query = `
      SELECT DISTINCT
        o.order_id,
        o.order_date,
        o.status,
        o.total,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.email as customer_email,
        GROUP_CONCAT(CONCAT(p.product_name, ' (', oi.quantity, ' ', p.unit, ')') SEPARATOR ', ') as products
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN products p ON oi.product_id = p.product_id
      WHERE p.producer_id = ?
      GROUP BY o.order_id
      ORDER BY o.order_date DESC
    `;
    
    connectiondb.query(query, [producerId], (error, results) => {
      if (error) {
        console.error("Error fetching producer orders:", error);
        return res.status(500).json({ error: "Error al obtener pedidos" });
      }
      
      res.json(results);
    });
  });
}

// Obtener detalles de un pedido específico
function getOrderDetails(req, res) {
  const userId = req.user.id_user;
  const orderId = req.params.orderId;
  
  // Verificar que el pedido contiene productos del productor
  const verifyQuery = `
    SELECT COUNT(*) as count
    FROM order_items oi
    JOIN products p ON oi.product_id = p.product_id
    JOIN producers pr ON p.producer_id = pr.producer_id
    WHERE oi.order_id = ? AND pr.user_id = ?
  `;
  
  connectiondb.query(verifyQuery, [orderId, userId], (error, verifyResults) => {
    if (error || verifyResults[0].count === 0) {
      return res.status(403).json({ error: "No tienes permiso para ver este pedido" });
    }
    
    // Obtener detalles del pedido
    const orderQuery = `
      SELECT 
        o.*,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.email as customer_email,
        u.document_number as customer_document,
        d.address,
        d.city,
        d.postal_code,
        d.country
      FROM orders o
      JOIN users u ON o.user_id = u.user_id
      JOIN directions d ON o.address_id = d.id_direction
      WHERE o.order_id = ?
    `;
    
    connectiondb.query(orderQuery, [orderId], (error, orderResults) => {
      if (error) {
        return res.status(500).json({ error: "Error al obtener detalles del pedido" });
      }
      
      // Obtener items del pedido (solo los del productor)
      const getProducerIdQuery = "SELECT producer_id FROM producers WHERE user_id = ?";
      
      connectiondb.query(getProducerIdQuery, [userId], (error, producerResults) => {
        const producerId = producerResults[0].producer_id;
        
        const itemsQuery = `
          SELECT 
            oi.*,
            p.product_name,
            p.unit,
            p.image_url,
            c.category_name
          FROM order_items oi
          JOIN products p ON oi.product_id = p.product_id
          JOIN categories c ON p.category_id = c.category_id
          WHERE oi.order_id = ? AND p.producer_id = ?
        `;
        
        connectiondb.query(itemsQuery, [orderId, producerId], (error, itemsResults) => {
          if (error) {
            return res.status(500).json({ error: "Error al obtener items del pedido" });
          }
          
          res.json({
            order: orderResults[0],
            items: itemsResults
          });
        });
      });
    });
  });
}

// Actualizar estado de un pedido
function updateOrderStatus(req, res) {
  const userId = req.user.id_user;
  const orderId = req.params.orderId;
  const { status } = req.body;
  
  const validStatuses = ['pending', 'shipped', 'delivered', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Estado inválido" });
  }
  
  // Verificar que el pedido contiene productos del productor
  const verifyQuery = `
    SELECT COUNT(*) as count
    FROM order_items oi
    JOIN products p ON oi.product_id = p.product_id
    JOIN producers pr ON p.producer_id = pr.producer_id
    WHERE oi.order_id = ? AND pr.user_id = ?
  `;
  
  connectiondb.query(verifyQuery, [orderId, userId], (error, verifyResults) => {
    if (error || verifyResults[0].count === 0) {
      return res.status(403).json({ error: "No tienes permiso para actualizar este pedido" });
    }
    
    const updateQuery = "UPDATE orders SET status = ? WHERE order_id = ?";
    
    connectiondb.query(updateQuery, [status, orderId], (error, results) => {
      if (error) {
        console.error("Error updating order status:", error);
        return res.status(500).json({ error: "Error al actualizar estado del pedido" });
      }
      
      res.json({ message: "Estado del pedido actualizado exitosamente" });
    });
  });
}

// ===== NOTIFICACIONES =====

// Obtener notificaciones del productor
function getNotifications(req, res) {
  const userId = req.user.id_user;
  
  // Obtener producer_id
  const getProducerIdQuery = "SELECT producer_id FROM producers WHERE user_id = ?";
  
  connectiondb.query(getProducerIdQuery, [userId], (error, producerResults) => {
    if (error || producerResults.length === 0) {
      return res.status(500).json({ error: "Error al obtener información del productor" });
    }
    
    const producerId = producerResults[0].producer_id;
    
    const query = `
      SELECT 
        id,
        type,
        title,
        message as text,
        related_id,
        is_read as \`read\`,
        created_at
      FROM producer_notifications
      WHERE producer_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    connectiondb.query(query, [producerId], (error, results) => {
      if (error) {
        console.error("Error fetching notifications:", error);
        return res.status(500).json({ error: "Error al obtener notificaciones" });
      }
      
      // Formatear las notificaciones para el frontend
      const notifications = results.map(notif => {
        const now = new Date();
        const createdAt = new Date(notif.created_at);
        const diffMinutes = Math.floor((now - createdAt) / 1000 / 60);
        
        let timeText = '';
        if (diffMinutes < 1) {
          timeText = 'Ahora mismo';
        } else if (diffMinutes < 60) {
          timeText = `Hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
        } else if (diffMinutes < 1440) {
          const hours = Math.floor(diffMinutes / 60);
          timeText = `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        } else {
          const days = Math.floor(diffMinutes / 1440);
          timeText = `Hace ${days} día${days > 1 ? 's' : ''}`;
        }
        
        // Determinar icono y color según el tipo
        let icon = 'fa-bell';
        let color = '#2196f3';
        
        switch(notif.type) {
          case 'low_stock':
            icon = 'fa-exclamation-triangle';
            color = '#ff9800';
            break;
          case 'new_order':
            icon = 'fa-shopping-cart';
            color = '#4caf50';
            break;
          case 'order_update':
            icon = 'fa-box';
            color = '#2196f3';
            break;
          case 'system':
            icon = 'fa-info-circle';
            color = '#9e9e9e';
            break;
        }
        
        return {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          text: notif.text,
          time: timeText,
          read: Boolean(notif.read),
          icon: icon,
          color: color,
          related_id: notif.related_id
        };
      });
      
      res.json(notifications);
    });
  });
}

// Marcar notificaciones como leídas
function markNotificationsAsRead(req, res) {
  const userId = req.user.id_user;
  const { notificationIds } = req.body;
  
  if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
    return res.status(400).json({ error: "Se requiere un array de IDs de notificaciones" });
  }
  
  // Obtener producer_id
  const getProducerIdQuery = "SELECT producer_id FROM producers WHERE user_id = ?";
  
  connectiondb.query(getProducerIdQuery, [userId], (error, producerResults) => {
    if (error || producerResults.length === 0) {
      return res.status(500).json({ error: "Error al obtener información del productor" });
    }
    
    const producerId = producerResults[0].producer_id;
    
    const updateQuery = `
      UPDATE producer_notifications 
      SET is_read = TRUE 
      WHERE producer_id = ? AND id IN (?)
    `;
    
    connectiondb.query(updateQuery, [producerId, notificationIds], (error, results) => {
      if (error) {
        console.error("Error marking notifications as read:", error);
        return res.status(500).json({ error: "Error al marcar notificaciones como leídas" });
      }
      
      res.json({ message: "Notificaciones marcadas como leídas", updated: results.affectedRows });
    });
  });
}

export const methods = {
  getProducerProfile,
  getDashboardMetrics,
  updateProducerProfile,
  getProducerProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getProducerOrders,
  getOrderDetails,
  updateOrderStatus,
  getNotifications,
  markNotificationsAsRead
};
