
CREATE DATABASE IF NOT EXISTS reciipe_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE reciipe_v2;

CREATE TABLE IF NOT EXISTS reciipe_user (
    id INT PRIMARY KEY AUTO_INCREMENT,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_google_id (google_id),
    INDEX idx_email (email)
);

CREATE TABLE IF NOT EXISTS units (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(20) NOT NULL,
    type ENUM('volume', 'weight', 'length', 'piece') DEFAULT 'piece',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingredients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_category (category)
);

CREATE TABLE IF NOT EXISTS tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#007bff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
);

CREATE TABLE IF NOT EXISTS recipes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image VARCHAR(500),
    category VARCHAR(100),
    type VARCHAR(100),
    prep_time INT DEFAULT 0 COMMENT 'Temps de préparation en minutes',
    cooking_time INT DEFAULT 0 COMMENT 'Temps de cuisson en minutes',
    rest_time INT DEFAULT 0 COMMENT 'Temps de repos en minutes (pâte, marinade)',
    chill_time INT DEFAULT 0 COMMENT 'Temps de réfrigération en minutes',
    freeze_time INT DEFAULT 0 COMMENT 'Temps de congélation en minutes',
    total_time INT GENERATED ALWAYS AS (prep_time + cooking_time + rest_time + chill_time + freeze_time) STORED,
    servings INT DEFAULT 1 COMMENT 'Compatibilité - nombre de personnes',
    base_value DECIMAL(10,3) DEFAULT NULL COMMENT 'Valeur de base flexible (ex: 500, 24, 4)',
    base_unit VARCHAR(50) DEFAULT NULL COMMENT 'Unité de base flexible (ex: g de pâtes, coques, personnes)',
    rating DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    visibility ENUM('private', 'public', 'link_only') DEFAULT 'private' COMMENT 'Visibilité de la recette',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES reciipe_user(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_name (name),
    INDEX idx_category (category),
    INDEX idx_type (type),
    INDEX idx_total_time (total_time),
    INDEX idx_rating (rating),
    INDEX idx_visibility (visibility),
    INDEX idx_base_value (base_value)
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recipe_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_id INT,
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_ingredient_id (ingredient_id),
    UNIQUE KEY unique_recipe_ingredient (recipe_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS recipe_steps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recipe_id INT NOT NULL,
    step_number INT NOT NULL,
    instruction TEXT NOT NULL,
    duration_minutes INT DEFAULT 0,
    temperature VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_step_number (step_number),
    UNIQUE KEY unique_recipe_step (recipe_id, step_number)
);

CREATE TABLE IF NOT EXISTS recipe_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recipe_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_tag_id (tag_id),
    UNIQUE KEY unique_recipe_tag (recipe_id, tag_id)
);

CREATE TABLE IF NOT EXISTS recipe_shares (
    id INT PRIMARY KEY AUTO_INCREMENT,
    recipe_id INT NOT NULL,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    view_count INT DEFAULT 0,
    
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    INDEX idx_share_token (share_token),
    INDEX idx_recipe_id (recipe_id),
    INDEX idx_active (is_active)
);

INSERT IGNORE INTO units (name, abbreviation, type) VALUES
('gramme', 'g', 'weight'),
('kilogramme', 'kg', 'weight'),
('litre', 'l', 'volume'),
('millilitre', 'ml', 'volume'),
('cuillère à soupe', 'c. à s.', 'volume'),
('cuillère à café', 'c. à c.', 'volume'),
('tasse', 'tasse', 'volume'),
('pièce', 'pièce', 'piece'),
('tranche', 'tranche', 'piece'),
('pincée', 'pincée', 'piece');

INSERT IGNORE INTO tags (name, color) VALUES
('Rapide', '#28a745'),
('Végétarien', '#17a2b8'),
('Sans gluten', '#ffc107'),
('Italien', '#dc3545'),
('Français', '#6f42c1'),
('Dessert', '#e83e8c'),
('Réconfortant', '#fd7e14'),
('Léger', '#20c997'),
('Festif', '#6610f2'),
('Enfants', '#e83e8c');


INSERT IGNORE INTO ingredients (name, category) VALUES
('Farine', 'Féculents'),
('Sucre', 'Sucrants'),
('Œuf', 'Produits laitiers'),
('Lait', 'Produits laitiers'),
('Beurre', 'Matières grasses'),
('Huile d''olive', 'Matières grasses'),
('Sel', 'Assaisonnements'),
('Poivre', 'Assaisonnements'),
('Oignon', 'Légumes'),
('Ail', 'Légumes');

SET @exist_base_value = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'recipes' 
    AND column_name = 'base_value'
);

SET @exist_base_unit = (  
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'recipes' 
    AND column_name = 'base_unit'
);

SET @sql = IF(@exist_base_value = 0, 
    'ALTER TABLE recipes ADD COLUMN base_value DECIMAL(10,3) DEFAULT NULL AFTER servings', 
    'SELECT "Column base_value already exists" as message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@exist_base_unit = 0,
    'ALTER TABLE recipes ADD COLUMN base_unit VARCHAR(50) DEFAULT NULL AFTER base_value',
    'SELECT "Column base_unit already exists" as message'  
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE recipes 
SET 
  base_value = servings,
  base_unit = CASE 
    WHEN servings = 1 THEN 'personne'
    ELSE 'personnes'
  END
WHERE servings IS NOT NULL 
  AND (base_value IS NULL OR base_unit IS NULL);

SELECT 'Database setup completed successfully!' as status;

SELECT 
    TABLE_NAME as 'Tables créées',
    TABLE_ROWS as 'Lignes'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;

SELECT 
    COUNT(*) as 'Recettes totales',
    COUNT(CASE WHEN base_value IS NOT NULL THEN 1 END) as 'Avec base_value',
    COUNT(CASE WHEN base_unit IS NOT NULL THEN 1 END) as 'Avec base_unit'
FROM recipes;

CREATE TABLE IF NOT EXISTS subrecipes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image VARCHAR(500),
    ingredients JSON NOT NULL,
    instructions JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES reciipe_user(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_name (name)
);