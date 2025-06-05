import { jest } from '@jest/globals';
import fetch from 'node-fetch';
import { sendOrderSummary } from '../../app/controllers/orders.controller.js';
import connectiondb from '../../app/database/database.js';

// Mock de fetch y connectiondb
jest.mock('node-fetch');
jest.mock('../../app/database/database.js');

describe('Microservicio de envío de correo - Pruebas', () => {
  let originalEnv;
  
  beforeEach(() => {
    // Guardar variables de entorno originales
    originalEnv = { ...process.env };
    
    // Configurar variables de entorno para pruebas
    process.env.EMAIL_MICROSERVICE_URL = 'http://microservice-sendGrid:3003';
    process.env.EMAIL_MICROSERVICE_ENDPOINT = '/enviar-correo';
    
    // Limpiar mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    // Restaurar variables de entorno
    process.env = originalEnv;
  });
  
  test('Debe enviar correctamente el resumen del pedido al microservicio', async () => {
    // Datos de prueba para el usuario
    const mockUserData = [{
      user_id: 1,
      username: 'KarenPrueba',
      email: 'karen.pena04@uptc.edu.co',
      document_number: '1234567890'
    }];
    
    // Datos de prueba para el pedido
    const mockOrderData = [{
      order_id: 100,
      order_date: '2025-06-05T15:30:00',
      total: 35.75,
      status: 'pending'
    }];
    
    // Datos de prueba para los productos del pedido
    const mockProductsData = [
      {
        nombre: 'Aguacate Hass',
        cantidad: 2,
        precio: 12.50
      },
      {
        nombre: 'Tomates Orgánicos',
        cantidad: 1,
        precio: 10.75
      }
    ];
    
    // Mock para las consultas a la base de datos
    connectiondb.query.mockImplementation((query, params, callback) => {
      if (query.includes('SELECT username, email, document_number FROM users')) {
        callback(null, mockUserData);
      } else if (query.includes('SELECT order_id, order_date, status FROM orders')) {
        callback(null, mockOrderData);
      } else if (query.includes('SELECT p.product_name as nombre')) {
        callback(null, mockProductsData);
      }
    });
    
    // Mock para la respuesta de fetch
    const mockFetchResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        message: 'Correo enviado exitosamente',
        messageId: 'test-message-id-12345'
      })
    };
    
    fetch.mockResolvedValue(mockFetchResponse);
    
    // Ejecutar la función que envía el resumen del pedido
    await sendOrderSummary(1, 100);
    
    // Verificar que la consulta de usuario se realizó correctamente
    expect(connectiondb.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT username, email, document_number FROM users'),
      [1],
      expect.any(Function)
    );
    
    // Verificar que la consulta de pedido se realizó correctamente
    expect(connectiondb.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT order_id, order_date, status FROM orders'),
      [100],
      expect.any(Function)
    );
    
    // Verificar que la consulta de productos se realizó correctamente
    expect(connectiondb.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT p.product_name as nombre'),
      [100],
      expect.any(Function)
    );
    
    // Verificar que se llamó a fetch con los datos correctos
    expect(fetch).toHaveBeenCalledWith(
      'http://microservice-sendGrid:3003/enviar-correo',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.any(String)
      })
    );
    
    // Verificar que el cuerpo de la petición contiene la estructura correcta
    const fetchCallBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(fetchCallBody).toHaveProperty('usuario');
    expect(fetchCallBody).toHaveProperty('pedido');
    expect(fetchCallBody.usuario.email).toBe('test@example.com');
    expect(fetchCallBody.pedido.productos).toHaveLength(2);
    
    // Verificar que se procesó la respuesta del microservicio
    expect(mockFetchResponse.json).toHaveBeenCalled();
  });
  
  test('Debe manejar errores cuando el microservicio no está disponible', async () => {
    // Mock para las consultas a la base de datos (simplificado para este test)
    connectiondb.query.mockImplementation((query, params, callback) => {
      if (query.includes('SELECT username, email')) {
        callback(null, [{ username: 'usuario_test', email: 'test@example.com' }]);
      } else if (query.includes('SELECT order_id')) {
        callback(null, [{ order_id: 100, order_date: '2025-06-05', status: 'pending' }]);
      } else if (query.includes('SELECT p.product_name')) {
        callback(null, [{ nombre: 'Producto Test', cantidad: 1, precio: 10.0 }]);
      }
    });
    
    // Simular error de conexión
    fetch.mockRejectedValue(new Error('Error de conexión al microservicio'));
    
    // La función no debe lanzar excepción incluso si hay error
    await expect(sendOrderSummary(1, 100)).resolves.not.toThrow();
    
    // Verificar que se intentó llamar a fetch
    expect(fetch).toHaveBeenCalled();
  });
  
  test('Debe manejar errores cuando el microservicio responde con error', async () => {
    // Mock para las consultas a la base de datos (simplificado para este test)
    connectiondb.query.mockImplementation((query, params, callback) => {
      if (query.includes('SELECT username, email')) {
        callback(null, [{ username: 'usuario_test', email: 'test@example.com' }]);
      } else if (query.includes('SELECT order_id')) {
        callback(null, [{ order_id: 100, order_date: '2025-06-05', status: 'pending' }]);
      } else if (query.includes('SELECT p.product_name')) {
        callback(null, [{ nombre: 'Producto Test', cantidad: 1, precio: 10.0 }]);
      }
    });
    
    // Simular respuesta de error del microservicio
    const mockErrorResponse = {
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({
        success: false,
        error: 'Error interno del servidor de correo'
      })
    };
    
    fetch.mockResolvedValue(mockErrorResponse);
    
    // La función no debe lanzar excepción incluso si hay error
    await expect(sendOrderSummary(1, 100)).resolves.not.toThrow();
    
    // Verificar que se intentó procesar la respuesta de error
    expect(mockErrorResponse.json).toHaveBeenCalled();
  });
});