-- Agregar campo is_favorite a la tabla productos
ALTER TABLE productos ADD COLUMN is_favorite BOOLEAN DEFAULT false;

-- Crear índice para consultas rápidas de productos favoritos
CREATE INDEX idx_productos_is_favorite ON productos(is_favorite);
