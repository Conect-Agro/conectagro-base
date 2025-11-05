import connectiondb from "../database/database.js";

// Crear nueva suscripción
function createSubscription(req, res) {
  const userId = req.user.id_user;
  const { subscriptionType, deliveryDay, products } = req.body;
  
  let months;
  switch(subscriptionType) {
    case 'monthly': 
      months = 1; 
      break;
    case 'biannual': 
      months = 6; 
      break;
    case 'annual': 
      months = 12; 
      break;
    default: 
      return res.status(400).json({ error: "Tipo de suscripción inválido" });
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + months);

  const query = `
    INSERT INTO subscriptions 
    (user_id, start_date, end_date, delivery_day, subscription_type, is_active) 
    VALUES (?, ?, ?, ?, ?, TRUE)
  `;

  connectiondb.query(
    query,
    [userId, startDate, endDate, deliveryDay, subscriptionType],
    (error, results) => {
      if (error) {
        console.error("Error creating subscription:", error);
        return res.status(500).json({ error: "Error al crear suscripción" });
      }

      const subscriptionId = results.insertId;
      
      // Insertar productos de la suscripción
      const productValues = products.map(p => [subscriptionId, p.productId, p.quantity]);
      
      const productQuery = `
        INSERT INTO subscription_products 
        (subscription_id, product_id, quantity) 
        VALUES ?
      `;

      connectiondb.query(productQuery, [productValues], (error) => {
        if (error) {
          console.error("Error adding subscription products:", error);
          return res.status(500).json({ error: "Error al añadir productos" });
        }
        
        res.status(201).json({ 
          message: "Suscripción creada exitosamente",
          subscriptionId 
        });
      });
    }
  );
}

// Obtener suscripción activa del usuario
function getActiveSubscription(req, res) {
  const userId = req.user.id_user;
  
  const query = `
    SELECT s.*, sp.product_id, sp.quantity, p.product_name, p.price, p.image_url
    FROM subscriptions s
    LEFT JOIN subscription_products sp ON s.subscription_id = sp.subscription_id
    LEFT JOIN products p ON sp.product_id = p.product_id
    WHERE s.user_id = ? AND s.is_active = TRUE
  `;
  
  connectiondb.query(query, [userId], (error, results) => {
    if (error) {
      console.error("Error fetching subscription:", error);
      return res.status(500).json({ error: "Error al obtener suscripción" });
    }
    
    if (results.length === 0) {
      return res.json(null);
    }

    // Formatear resultados
    const subscription = {
      ...results[0],
      products: results.map(r => ({
        productId: r.product_id,
        quantity: r.quantity,
        name: r.product_name,
        price: r.price,
        imageUrl: r.image_url
      }))
    };

    res.json(subscription);
  });
}

// Actualizar día de entrega
function updateDeliveryDay(req, res) {
  const userId = req.user.id_user;
  const { deliveryDay } = req.body;
  
  const query = `
    UPDATE subscriptions 
    SET delivery_day = ?
    WHERE user_id = ? AND is_active = TRUE
  `;
  
  connectiondb.query(query, [deliveryDay, userId], (error) => {
    if (error) {
      console.error("Error updating delivery day:", error);
      return res.status(500).json({ error: "Error al actualizar día de entrega" });
    }
    
    res.json({ message: "Día de entrega actualizado" });
  });
}

// Cancelar suscripción
function cancelSubscription(req, res) {
  const userId = req.user.id_user;
  
  const query = `
    UPDATE subscriptions 
    SET is_active = FALSE
    WHERE user_id = ? AND is_active = TRUE
  `;
  
  connectiondb.query(query, [userId], (error) => {
    if (error) {
      console.error("Error canceling subscription:", error);
      return res.status(500).json({ error: "Error al cancelar suscripción" });
    }
    
    res.json({ message: "Suscripción cancelada" });
  });
}

// Agregar esta nueva función al controlador
function removeSubscriptionProduct(req, res) {
    const userId = req.user.id_user;
    const productId = req.params.productId;

    // Primero verificamos que el usuario tenga una suscripción activa
    const checkQuery = `
        SELECT sp.subscription_product_id, s.subscription_id 
        FROM subscriptions s
        JOIN subscription_products sp ON s.subscription_id = sp.subscription_id
        WHERE s.user_id = ? AND s.is_active = TRUE AND sp.product_id = ?
    `;

    connectiondb.query(checkQuery, [userId, productId], (error, results) => {
        if (error) {
            console.error("Error checking subscription product:", error);
            return res.status(500).json({ error: "Error al verificar el producto" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "Producto no encontrado en la suscripción" });
        }

        // Eliminar el producto de la suscripción
        const deleteQuery = `
            DELETE FROM subscription_products 
            WHERE subscription_product_id = ?
        `;

        connectiondb.query(deleteQuery, [results[0].subscription_product_id], (error) => {
            if (error) {
                console.error("Error removing subscription product:", error);
                return res.status(500).json({ error: "Error al eliminar el producto" });
            }

            // Verificar si quedan productos en la suscripción
            const checkRemainingQuery = `
                SELECT COUNT(*) as count 
                FROM subscription_products 
                WHERE subscription_id = ?
            `;

            connectiondb.query(checkRemainingQuery, [results[0].subscription_id], (error, countResults) => {
                if (error) {
                    console.error("Error checking remaining products:", error);
                    return res.status(200).json({ message: "Producto eliminado exitosamente" });
                }

                // Si no quedan productos, cancelar la suscripción
                if (countResults[0].count === 0) {
                    const cancelQuery = `
                        UPDATE subscriptions 
                        SET is_active = FALSE 
                        WHERE subscription_id = ?
                    `;

                    connectiondb.query(cancelQuery, [results[0].subscription_id], (error) => {
                        if (error) {
                            console.error("Error canceling empty subscription:", error);
                        }
                    });
                }

                res.status(200).json({ message: "Producto eliminado exitosamente" });
            });
        });
    });
}

// Agregar al objeto methods:

async function addSubscriptionProducts(req, res) {
    const userId = req.user.id_user;
    const { products } = req.body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: "No se proporcionaron productos válidos" });
    }

    const getSubscriptionQuery = `
        SELECT subscription_id 
        FROM subscriptions 
        WHERE user_id = ? AND is_active = TRUE
        LIMIT 1
    `;
    
    connectiondb.query(getSubscriptionQuery, [userId], (error, results) => {
        if (error) {
            console.error("Error getting subscription:", error);
            return res.status(500).json({ error: "Error al obtener la suscripción" });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: "No se encontró una suscripción activa" });
        }
        
        const subscriptionId = results[0].subscription_id;

        // Procesar cada producto uno por uno para manejar duplicados
        let processed = 0;
        let errors = [];

        products.forEach(product => {
            // Verificar si el producto ya existe en la suscripción
            const checkExistingQuery = `
                SELECT subscription_product_id, quantity 
                FROM subscription_products 
                WHERE subscription_id = ? AND product_id = ?
            `;

            connectiondb.query(checkExistingQuery, [subscriptionId, product.productId], (error, existingProduct) => {
                if (error) {
                    errors.push(`Error verificando producto ${product.productId}`);
                    if (processed === products.length - 1) {
                        finishProcessing();
                    }
                    return;
                }

                if (existingProduct.length > 0) {
                    // El producto ya existe, actualizar cantidad
                    const newQuantity = existingProduct[0].quantity + product.quantity;
                    const updateQuery = `
                        UPDATE subscription_products 
                        SET quantity = ?
                        WHERE subscription_product_id = ?
                    `;

                    connectiondb.query(updateQuery, [newQuantity, existingProduct[0].subscription_product_id], (error) => {
                        if (error) {
                            errors.push(`Error actualizando producto ${product.productId}`);
                        }
                        processed++;
                        if (processed === products.length) {
                            finishProcessing();
                        }
                    });
                } else {
                    // El producto no existe, insertarlo
                    const insertQuery = `
                        INSERT INTO subscription_products 
                        (subscription_id, product_id, quantity)
                        VALUES (?, ?, ?)
                    `;

                    connectiondb.query(insertQuery, [subscriptionId, product.productId, product.quantity], (error) => {
                        if (error) {
                            errors.push(`Error insertando producto ${product.productId}`);
                        }
                        processed++;
                        if (processed === products.length) {
                            finishProcessing();
                        }
                    });
                }
            });
        });

        function finishProcessing() {
            if (errors.length > 0) {
                return res.status(500).json({ 
                    error: "Hubo errores procesando algunos productos",
                    details: errors
                });
            }
            
            res.status(200).json({ 
                message: "Productos agregados exitosamente a la suscripción"
            });
        }
    });
}

// Agregar el método al objeto methods
export const methods = {
  createSubscription,
  getActiveSubscription,
  updateDeliveryDay,
  cancelSubscription,
  removeSubscriptionProduct,
  addSubscriptionProducts
};