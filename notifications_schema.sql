-- Tabla de notificaciones para productores
CREATE TABLE IF NOT EXISTS `producer_notifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `producer_id` INT NOT NULL,
  `type` ENUM('low_stock', 'new_order', 'order_update', 'system') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `related_id` INT NULL COMMENT 'ID del producto o pedido relacionado',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_producer_id` (`producer_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_notifications_producer` FOREIGN KEY (`producer_id`) REFERENCES `producers` (`producer_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Trigger para crear notificación cuando el stock es bajo (menor a 20)
DELIMITER $$

CREATE TRIGGER `check_low_stock_after_update`
AFTER UPDATE ON `products`
FOR EACH ROW
BEGIN
  IF NEW.stock < 20 AND NEW.stock != OLD.stock THEN
    -- Verificar si ya existe una notificación de stock bajo no leída para este producto
    IF NOT EXISTS (
      SELECT 1 FROM producer_notifications 
      WHERE producer_id = NEW.producer_id 
      AND type = 'low_stock' 
      AND related_id = NEW.product_id 
      AND is_read = FALSE
    ) THEN
      INSERT INTO producer_notifications (producer_id, type, title, message, related_id)
      VALUES (
        NEW.producer_id,
        'low_stock',
        'Stock bajo',
        CONCAT('El producto "', NEW.product_name, '" tiene solo ', NEW.stock, ' unidades disponibles'),
        NEW.product_id
      );
    END IF;
  END IF;
END$$

-- Trigger para crear notificación cuando se crea un nuevo pedido
CREATE TRIGGER `notify_new_order`
AFTER INSERT ON `order_items`
FOR EACH ROW
BEGIN
  DECLARE v_producer_id INT;
  DECLARE v_order_id INT;
  DECLARE v_customer_name VARCHAR(200);
  
  -- Obtener el producer_id del producto
  SELECT producer_id INTO v_producer_id
  FROM products
  WHERE product_id = NEW.product_id;
  
  -- Obtener información del pedido y cliente
  SELECT o.order_id, CONCAT(u.first_name, ' ', u.last_name)
  INTO v_order_id, v_customer_name
  FROM orders o
  JOIN users u ON o.user_id = u.user_id
  WHERE o.order_id = NEW.order_id;
  
  -- Verificar si ya existe una notificación para este pedido
  IF NOT EXISTS (
    SELECT 1 FROM producer_notifications 
    WHERE producer_id = v_producer_id 
    AND type = 'new_order' 
    AND related_id = v_order_id
  ) THEN
    INSERT INTO producer_notifications (producer_id, type, title, message, related_id)
    VALUES (
      v_producer_id,
      'new_order',
      '¡Nuevo pedido!',
      CONCAT(v_customer_name, ' ha realizado un pedido'),
      v_order_id
    );
  END IF;
END$$

DELIMITER ;
