import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../app/index.js';
import connectiondb from '../../app/database/database.js';
import jwt from 'jsonwebtoken';

// Mock de la conexión a la base de datos
jest.mock('../../app/database/database.js');

describe('Pruebas para visualización de pedidos', () => {
  let authToken;
  const mockUserId = 1;
  
  beforeEach(() => {
    // Limpiar todos los mocks
    jest.clearAllMocks();
    
    // Generar token JWT para autenticación
    authToken = jwt.sign(
      { id_user: mockUserId },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
    
    // Mock para verificar el token
    jest.spyOn(jwt, 'verify').mockImplementation((token, secret, callback) => {
      callback(null, { id_user: mockUserId });
    });
  });

  test('Debe obtener la lista de pedidos del usuario correctamente', async () => {
    // Datos de prueba para pedidos del usuario
    const mockOrders = [
      {
        order_id: 1,
        order_date: '2025-06-04T10:30:00',
        total: 53.75,
        status: 'pending',
        address: 'Calle Principal 123',
        city: 'Ciudad Ejemplo',
        postal_code: '12345',
        country: 'Colombia'
      },
      {
        order_id: 2,
        order_date: '2025-06-02T14:45:00',
        total: 27.50,
        status: 'delivered',
        address: 'Avenida Central 456',
        city: 'Ciudad Ejemplo',
        postal_code: '12345',
        country: 'Colombia'
      }
    ];
    
    // Mock de la consulta SQL para obtener pedidos
    connectiondb.query.mockImplementation((query, params, callback) => {
      if (query.includes('SELECT o.order_id, o.order_date, o.total, o.status')) {
        expect(params).toEqual([mockUserId]);
        callback(null, mockOrders);
      }
    });
    
    // Realizar la solicitud HTTP
    const response = await request(app)
      .get('/api/orders')
      .set('Cookie', [`jwt=${authToken}`]);
    
    // Verificaciones
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].order_id).toBe(1);
    expect(response.body[1].order_id).toBe(2);
    expect(connectiondb.query).toHaveBeenCalledTimes(1);
  });

  test('Debe obtener los detalles de un pedido específico', async () => {
    const orderId = 1;
    
    // Mock de datos del pedido
    const mockOrderData = {
      order: {
        order_id: orderId,
        order_date: '2025-06-04T10:30:00',
        total: 53.75,
        status: 'pending',
        user_id: mockUserId
      },
      address: {
        id_direction: 5,
        address: 'Calle Principal 123',
        city: 'Ciudad Ejemplo',
        postal_code: '12345',
        country: 'Colombia'
      },
      items: [
        {
          product_id: 101,
          product_name: 'Aguacate Hass',
          quantity: 3,
          price: 12.50,
          subtotal: 37.50,
          image_url: '/img/products/avocado.jpg'
        },
        {
          product_id: 102,
          product_name: 'Fresas Orgánicas',
          quantity: 1,
          price: 16.25,
          subtotal: 16.25,
          image_url: '/img/products/strawberry.jpg'
        }
      ]
    };
    
    // Mock para verificar el pedido (comprobar que pertenece al usuario)
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      if (query.includes('SELECT * FROM orders WHERE order_id = ? AND user_id = ?')) {
        expect(params).toEqual([orderId.toString(), mockUserId]);
        callback(null, [mockOrderData.order]);
      }
    });
    
    // Mock para obtener la dirección del pedido
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      if (query.includes('SELECT * FROM directions WHERE id_direction = ?')) {
        expect(params).toEqual([mockOrderData.order.address_id]);
        callback(null, [mockOrderData.address]);
      }
    });
    
    // Mock para obtener los items del pedido
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      if (query.includes('SELECT oi.quantity, oi.price')) {
        expect(params).toEqual([orderId.toString()]);
        callback(null, mockOrderData.items);
      }
    });
    
    // Realizar la solicitud HTTP
    const response = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Cookie', [`jwt=${authToken}`]);
    
    // Verificaciones
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('order');
    expect(response.body).toHaveProperty('address');
    expect(response.body).toHaveProperty('items');
    expect(response.body.order.order_id).toBe(orderId);
    expect(response.body.items).toHaveLength(2);
    expect(connectiondb.query).toHaveBeenCalledTimes(3);
  });

  test('Debe retornar error 404 si se intenta acceder a un pedido que no existe', async () => {
    const nonExistentOrderId = 999;
    
    // Mock para verificación de pedido no existente
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      if (query.includes('SELECT * FROM orders WHERE order_id = ? AND user_id = ?')) {
        callback(null, []); // No se encontró ningún pedido
      }
    });
    
    // Realizar la solicitud HTTP
    const response = await request(app)
      .get(`/api/orders/${nonExistentOrderId}`)
      .set('Cookie', [`jwt=${authToken}`]);
    
    // Verificaciones
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

  test('Debe retornar error 401 si se intenta acceder sin autenticación', async () => {
    // Realizar la solicitud HTTP sin token de autenticación
    const response = await request(app)
      .get('/api/orders');
    
    // Verificaciones
    expect(response.status).toBe(401);
  });

  test('Debe manejar errores de base de datos al listar pedidos', async () => {
    // Mock para simular un error en la base de datos
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      callback(new Error('Error de conexión a la base de datos'), null);
    });
    
    // Realizar la solicitud HTTP
    const response = await request(app)
      .get('/api/orders')
      .set('Cookie', [`jwt=${authToken}`]);
    
    // Verificaciones
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});