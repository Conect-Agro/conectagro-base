import connectiondb from "../database/database.js";

// Crear nueva suscripción
function createSubscription(req, res) {
  const userId = req.user.id_user;
  const { subscriptionType, deliveryDay, products } = req.body;
  
  let months;
  switch(subscriptionType) {
    case 'monthly': months = 1; break;
    case 'biannual': months = 6; break;
    case 'annual': months = 12; break;
    default: return res.status(400).json({ error: "Tipo de suscripción inválido" });
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + months);

  const query = `
    INSERT INTO subscriptions 
    (user_id, start_date, end_date, delivery_day, subscription_type) 
    VALUES (?, ?, ?, ?, ?)
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

export const methods = {
  createSubscription,
  getActiveSubscription,
  updateDeliveryDay,
  cancelSubscription
};