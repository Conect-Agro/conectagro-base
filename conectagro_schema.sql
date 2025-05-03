-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema conectagro
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema conectagro
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `conectagro` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci ;
USE `conectagro` ;

-- -----------------------------------------------------
-- Table `conectagro`.`users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `conectagro`.`users` (
  `user_id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(45) NOT NULL,
  `password_hash` VARCHAR(60) NOT NULL,
  `document_number` VARCHAR(15) NOT NULL,
  `email` VARCHAR(45) NOT NULL,
  `first_name` VARCHAR(45) NOT NULL,
  `last_name` VARCHAR(45) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` TINYINT NOT NULL DEFAULT '1',
  `login_attempts` INT NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`),
  UNIQUE INDEX `username` (`username` ASC) VISIBLE,
  UNIQUE INDEX `document_number` (`document_number` ASC) VISIBLE,
  UNIQUE INDEX `email` (`email` ASC) VISIBLE)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `conectagro`.`audit`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `conectagro`.`audit` (
  `id_audit` INT NOT NULL AUTO_INCREMENT,
  `table_name` VARCHAR(45) NOT NULL,
  `operation_type` VARCHAR(45) NOT NULL,
  `before_data` BLOB NOT NULL,
  `new_data` BLOB NOT NULL,
  `data_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id_user` INT NOT NULL,
  PRIMARY KEY (`id_audit`),
  INDEX `idx_user` (`id_user` ASC) VISIBLE,
  CONSTRAINT `fk_audit_user`
    FOREIGN KEY (`id_user`)
    REFERENCES `conectagro`.`users` (`user_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `conectagro`.`carts`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `conectagro`.`carts` (
  `cart_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  PRIMARY KEY (`cart_id`),
  INDEX `user_id` (`user_id` ASC) VISIBLE,
  CONSTRAINT `carts_ibfk_1`
    FOREIGN KEY (`user_id`)
    REFERENCES `conectagro`.`users` (`user_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `conectagro`.`categories`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `conectagro`.`categories` (
  `category_id` INT NOT NULL AUTO_INCREMENT,
  `category_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`category_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `conectagro`.`products`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `conectagro`.`products` (
  `product_id` INT NOT NULL AUTO_INCREMENT,
  `product_name` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `stock` INT NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `category_id` INT NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`product_id`),
  INDEX `category_id` (`category_id` ASC) VISIBLE,
  CONSTRAINT `products_ibfk_1`
    FOREIGN KEY (`category_id`)
    REFERENCES `conectagro`.`categories` (`category_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `conectagro`.`cart_items`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `conectagro`.`cart_items` (
  `cart_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  PRIMARY KEY (`cart_id`, `product_id`),
  INDEX `product_id` (`product_id` ASC) VISIBLE,
  CONSTRAINT `cart_items_ibfk_1`
    FOREIGN KEY (`cart_id`)
    REFERENCES `conectagro`.`carts` (`cart_id`),
  CONSTRAINT `cart_items_ibfk_2`
    FOREIGN KEY (`product_id`)
    REFERENCES `conectagro`.`products` (`product_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `conectagro`.`directions`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `conectagro`.`directions` (
  `id_direction` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `address` TEXT NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `postal_code` VARCHAR(10) NOT NULL,
  `country` VARCHAR(50) NOT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_direction`),
  INDEX `user_id` (`user_id` ASC) VISIBLE,
  CONSTRAINT `directions_ibfk_1`
    FOREIGN KEY (`user_id`)
    REFERENCES `conectagro`.`users` (`user_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `conectagro`.`orders`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `conectagro`.`orders` (
  `order_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `address_id` INT NOT NULL,
  `order_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`order_id`),
  INDEX `user_id` (`user_id` ASC) VISIBLE,
  INDEX `address_id` (`address_id` ASC) VISIBLE,
  CONSTRAINT `orders_ibfk_1`
    FOREIGN KEY (`user_id`)
    REFERENCES `conectagro`.`users` (`user_id`),
  CONSTRAINT `orders_ibfk_2`
    FOREIGN KEY (`address_id`)
    REFERENCES `conectagro`.`directions` (`id_direction`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `conectagro`.`order_items`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `conectagro`.`order_items` (
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`order_id`, `product_id`),
  INDEX `product_id` (`product_id` ASC) VISIBLE,
  CONSTRAINT `order_items_ibfk_1`
    FOREIGN KEY (`order_id`)
    REFERENCES `conectagro`.`orders` (`order_id`),
  CONSTRAINT `order_items_ibfk_2`
    FOREIGN KEY (`product_id`)
    REFERENCES `conectagro`.`products` (`product_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `conectagro`.`roles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `conectagro`.`roles` (
  `role_id` CHAR(3) NOT NULL,
  `role_name` VARCHAR(45) NOT NULL,
  `role_description` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`role_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


-- -----------------------------------------------------
-- Table `conectagro`.`user_roles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `conectagro`.`user_roles` (
  `role_id` CHAR(3) NOT NULL,
  `user_id` INT NOT NULL,
  PRIMARY KEY (`role_id`, `user_id`),
  INDEX `user_id` (`user_id` ASC) VISIBLE,
  CONSTRAINT `user_roles_ibfk_1`
    FOREIGN KEY (`role_id`)
    REFERENCES `conectagro`.`roles` (`role_id`),
  CONSTRAINT `user_roles_ibfk_2`
    FOREIGN KEY (`user_id`)
    REFERENCES `conectagro`.`users` (`user_id`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8mb4
COLLATE = utf8mb4_0900_ai_ci;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
