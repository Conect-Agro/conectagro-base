import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../app/index.js';
import connectiondb from '../../app/database/database.js';

// Mock de la conexión a la base de datos
jest.mock('../../app/database/database.js');

describe('Pruebas para visualización de productos por categoría', () => {
  
  beforeEach(() => {
    // Limpiar todos los mocks
    jest.clearAllMocks();
  });

  test('Debe obtener productos por categoría correctamente', async () => {
    const categoryId = 1; // ID de categoría para frutas
    
    // Datos de prueba para productos de una categoría
    const mockProducts = [
      {
        product_id: 1,
        product_name: 'Aguacate Hass',
        description: 'Aguacate fresco de la mejor calidad',
        price: 12.50,
        stock: 100,
        image_url: '/img/products/avocado.jpg',
        category_id: categoryId,
        category_name: 'Frutas',
        is_active: 1
      },
      {
        product_id: 3,
        product_name: 'Manzanas Rojas',
        description: 'Manzanas rojas jugosas y dulces',
        price: 8.75,
        stock: 150,
        image_url: '/img/products/apple.jpg',
        category_id: categoryId,
        category_name: 'Frutas',
        is_active: 1
      }
    ];
    
    // Mock para la consulta SQL
    connectiondb.query.mockImplementation((query, params, callback) => {
      if (query.includes('FROM products p') && query.includes('WHERE p.is_active = 1 AND p.category_id = ?')) {
        expect(params).toEqual([categoryId.toString()]);
        callback(null, mockProducts);
      }
    });
    
    // Realizar la solicitud HTTP
    const response = await request(app)
      .get(`/api/products/category/${categoryId}`);
    
    // Verificaciones
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].product_name).toBe('Aguacate Hass');
    expect(response.body[0].category_id).toBe(categoryId);
    expect(response.body[1].product_name).toBe('Manzanas Rojas');
    expect(response.body[1].category_name).toBe('Frutas');
    expect(connectiondb.query).toHaveBeenCalledTimes(1);
  });

  test('Debe devolver un array vacío cuando no hay productos en la categoría', async () => {
    const categoryId = 999; // Categoría sin productos
    
    // Mock para categoría sin productos
    connectiondb.query.mockImplementation((query, params, callback) => {
      callback(null, []); // No hay productos
    });
    
    // Realizar la solicitud HTTP
    const response = await request(app)
      .get(`/api/products/category/${categoryId}`);
    
    // Verificaciones
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(0);
  });

  test('Debe manejar errores de base de datos', async () => {
    const categoryId = 1;
    
    // Mock para simular error de base de datos
    connectiondb.query.mockImplementation((query, params, callback) => {
      callback(new Error('Error de conexión a la base de datos'), null);
    });
    
    // Realizar la solicitud HTTP
    const response = await request(app)
      .get(`/api/products/category/${categoryId}`);
    
    // Verificaciones
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Error fetching products');
  });

  test('Debe validar que el ID de categoría sea un número válido', async () => {
    // Realizar la solicitud HTTP con un ID inválido
    const response = await request(app)
      .get('/api/products/category/abc');
    
    // Verificaciones - Dependerá de cómo manejas la validación en tu controlador
    // Si no tienes una validación explícita, esto podría ser un test para añadir
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Invalid category ID');
  });
});