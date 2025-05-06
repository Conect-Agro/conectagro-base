import connectiondb from "../database/database.js";

// Obtener direcciones del usuario
function getUserAddresses(req, res) {
  const userId = req.user.id_user;
  
  connectiondb.query(
    "SELECT * FROM directions WHERE user_id = ?",
    [userId],
    (error, results) => {
      if (error) {
        console.error("Error fetching addresses:", error);
        return res.status(500).json({ error: "Server error" });
      }
      
      res.json(results);
    }
  );
}

// Añadir una nueva dirección
function addAddress(req, res) {
  const userId = req.user.id_user;
  const { address, city, postal_code, country, is_default } = req.body;
  
  if (!address || !city || !postal_code || !country) {
    return res.status(400).json({ error: "All fields are required" });
  }
  
  // Si es la dirección predeterminada, reseteamos las otras
  if (is_default) {
    connectiondb.query(
      "UPDATE directions SET is_default = 0 WHERE user_id = ?",
      [userId],
      (error) => {
        if (error) {
          console.error("Error resetting default addresses:", error);
          return res.status(500).json({ error: "Server error" });
        }
        
        insertAddress();
      }
    );
  } else {
    insertAddress();
  }
  
  function insertAddress() {
    const setDefault = is_default ? 1 : 0;
    
    // Si es la primera dirección del usuario, la marcamos como predeterminada
    connectiondb.query(
      "SELECT COUNT(*) as count FROM directions WHERE user_id = ?",
      [userId],
      (error, results) => {
        if (error) {
          console.error("Error counting addresses:", error);
          return res.status(500).json({ error: "Server error" });
        }
        
        const isFirstAddress = results[0].count === 0;
        const finalDefault = isFirstAddress ? 1 : setDefault;
        
        connectiondb.query(
          "INSERT INTO directions (user_id, address, city, postal_code, country, is_default) VALUES (?, ?, ?, ?, ?, ?)",
          [userId, address, city, postal_code, country, finalDefault],
          (error, result) => {
            if (error) {
              console.error("Error adding address:", error);
              return res.status(500).json({ error: "Server error" });
            }
            
            res.status(201).json({
              id_direction: result.insertId,
              user_id: userId,
              address,
              city,
              postal_code,
              country,
              is_default: finalDefault
            });
          }
        );
      }
    );
  }
}

// Establecer dirección predeterminada
function setDefaultAddress(req, res) {
  const userId = req.user.id_user;
  const addressId = req.params.addressId;
  
  // Primero, resetear todas las direcciones predeterminadas
  connectiondb.query(
    "UPDATE directions SET is_default = 0 WHERE user_id = ?",
    [userId],
    (error) => {
      if (error) {
        console.error("Error resetting default addresses:", error);
        return res.status(500).json({ error: "Server error" });
      }
      
      // Luego, establecer la nueva dirección predeterminada
      connectiondb.query(
        "UPDATE directions SET is_default = 1 WHERE id_direction = ? AND user_id = ?",
        [addressId, userId],
        (error, result) => {
          if (error) {
            console.error("Error setting default address:", error);
            return res.status(500).json({ error: "Server error" });
          }
          
          if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Address not found" });
          }
          
          res.json({ success: true, message: "Default address updated" });
        }
      );
    }
  );
}

// Eliminar dirección
function deleteAddress(req, res) {
  const userId = req.user.id_user;
  const addressId = req.params.addressId;
  
  // Verificar si es la única dirección
  connectiondb.query(
    "SELECT COUNT(*) as count FROM directions WHERE user_id = ?",
    [userId],
    (error, results) => {
      if (error) {
        console.error("Error counting addresses:", error);
        return res.status(500).json({ error: "Server error" });
      }
      
      if (results[0].count <= 1) {
        return res.status(400).json({ error: "Cannot delete the only address" });
      }
      
      // Verificar si es la dirección predeterminada
      connectiondb.query(
        "SELECT is_default FROM directions WHERE id_direction = ? AND user_id = ?",
        [addressId, userId],
        (error, results) => {
          if (error) {
            console.error("Error checking if default address:", error);
            return res.status(500).json({ error: "Server error" });
          }
          
          if (results.length === 0) {
            return res.status(404).json({ error: "Address not found" });
          }
          
          const isDefault = results[0].is_default;
          
          // Eliminar la dirección
          connectiondb.query(
            "DELETE FROM directions WHERE id_direction = ? AND user_id = ?",
            [addressId, userId],
            (error) => {
              if (error) {
                console.error("Error deleting address:", error);
                return res.status(500).json({ error: "Server error" });
              }
              
              // Si era la predeterminada, establecer otra como predeterminada
              if (isDefault) {
                connectiondb.query(
                  "UPDATE directions SET is_default = 1 WHERE user_id = ? LIMIT 1",
                  [userId],
                  (error) => {
                    if (error) {
                      console.error("Error setting new default address:", error);
                      return res.status(500).json({ error: "Server error" });
                    }
                    
                    res.json({ success: true, message: "Address deleted and new default set" });
                  }
                );
              } else {
                res.json({ success: true, message: "Address deleted" });
              }
            }
          );
        }
      );
    }
  );
}

export const methods = {
  getUserAddresses,
  addAddress,
  setDefaultAddress,
  deleteAddress
};