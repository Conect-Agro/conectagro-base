import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../app/index.js';
import connectiondb from '../../app/database/database.js';
import jwt from 'jsonwebtoken';

// Mock de la conexión a la base de datos
jest.mock('../../app/database/database.js');

describe('Pruebas para agregar direcciones', () => {
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

  test('Debe agregar una dirección exitosamente', async () => {
    // Datos de prueba
    const newAddress = {
      address: 'Calle Principal 123',
      city: 'Ciudad Ejemplo',
      postal_code: '12345',
      country: 'Colombia',
      is_default: true
    };
    
    // Mock para la verificación de dirección predeterminada
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      expect(query).toContain('SELECT id_direction FROM directions WHERE user_id = ? AND is_default = 1');
      callback(null, []); // No hay dirección predeterminada previa
    });
    
    // Mock para la inserción de la dirección
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      expect(query).toContain('INSERT INTO directions');
      expect(params).toEqual([
        mockUserId,
        newAddress.address,
        newAddress.city,
        newAddress.postal_code,
        newAddress.country,
        newAddress.is_default ? 1 : 0
      ]);
      callback(null, { insertId: 1 });
    });
    
    // Realizar la solicitud HTTP
    const response = await request(app)
      .post('/api/addresses')
      .set('Cookie', [`jwt=${authToken}`])
      .send(newAddress);
    
    // Verificaciones
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id_direction');
    expect(response.body.address).toBe(newAddress.address);
    expect(response.body.is_default).toBe(newAddress.is_default ? 1 : 0);
    expect(connectiondb.query).toHaveBeenCalledTimes(2);
  });

  test('Debe actualizar la dirección predeterminada cuando se agrega una nueva predeterminada', async () => {
    // Datos de prueba
    const newAddress = {
      address: 'Calle Principal 123',
      city: 'Ciudad Ejemplo',
      postal_code: '12345',
      country: 'Colombia',
      is_default: true
    };
    
    // Mock para la verificación de dirección predeterminada (existe una previa)
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      expect(query).toContain('SELECT id_direction FROM directions WHERE user_id = ? AND is_default = 1');
      callback(null, [{ id_direction: 5 }]); // Ya existe una dirección predeterminada
    });
    
    // Mock para actualizar la dirección predeterminada previa
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      expect(query).toContain('UPDATE directions SET is_default = 0 WHERE id_direction = ?');
      expect(params).toEqual([5]);
      callback(null, { affectedRows: 1 });
    });
    
    // Mock para la inserción de la nueva dirección
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      expect(query).toContain('INSERT INTO directions');
      callback(null, { insertId: 6 });
    });
    
    // Realizar la solicitud HTTP
    const response = await request(app)
      .post('/api/addresses')
      .set('Cookie', [`jwt=${authToken}`])
      .send(newAddress);
    
    // Verificaciones
    expect(response.status).toBe(201);
    expect(connectiondb.query).toHaveBeenCalledTimes(3);
  });

  test('Debe retornar error 400 si faltan campos requeridos', async () => {
    // Datos incompletos
    const incompleteAddress = {
      address: 'Calle Principal 123',
      // Falta city
      postal_code: '12345',
      country: 'Colombia'
    };
    
    // Realizar la solicitud HTTP
    const response = await request(app)
      .post('/api/addresses')
      .set('Cookie', [`jwt=${authToken}`])
      .send(incompleteAddress);
    
    // Verificaciones
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(connectiondb.query).not.toHaveBeenCalled();
  });

  test('Debe retornar error 401 si no hay autenticación', async () => {
    // Datos de prueba
    const newAddress = {
      address: 'Calle Principal 123',
      city: 'Ciudad Ejemplo',
      postal_code: '12345',
      country: 'Colombia'
    };
    
    // Realizar la solicitud HTTP sin token
    const response = await request(app)
      .post('/api/addresses')
      .send(newAddress);
    
    // Verificaciones
    expect(response.status).toBe(401);
    expect(connectiondb.query).not.toHaveBeenCalled();
  });

  test('Debe manejar errores de base de datos', async () => {
    // Datos de prueba
    const newAddress = {
      address: 'Calle Principal 123',
      city: 'Ciudad Ejemplo',
      postal_code: '12345',
      country: 'Colombia'
    };
    
    // Mock para simular un error de base de datos
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      callback(new Error('Error de conexión a la base de datos'), null);
    });
    
    // Realizar la solicitud HTTP
    const response = await request(app)
      .post('/api/addresses')
      .set('Cookie', [`jwt=${authToken}`])
      .send(newAddress);
    
    // Verificaciones
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});