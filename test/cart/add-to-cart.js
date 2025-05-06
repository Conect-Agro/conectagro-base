import request from 'supertest';
import app from '../../app/index.js'; 
import connectiondb from '../../app/database/database.js';
import jwt from 'jsonwebtoken';

describe('Pruebas del carrito de compras', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // Crear usuario de prueba
    const userResult = await new Promise((resolve, reject) => {
      connectiondb.query(
        `INSERT INTO users (username, password_hash, document_number, email, first_name, last_name, created_at, is_active) 
         VALUES ('testuser', '$2b$08$JDjwQrjeeYs4YzBNeL6dfOH1BCf0LhPY9uOfTCb6FUNx1C/qrL4Ii', '123456', 'test@test.com', 'Test', 'User', NOW(), 1)`,
        (error, results) => {
          if (error) reject(error);
          resolve(results);
        }
      );
    });

    testUserId = userResult.insertId;

    // Generar token JWT
    authToken = jwt.sign(
      { id_user: testUserId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await new Promise(resolve => {
      connectiondb.query('DELETE FROM cart_items', resolve);
    });
    await new Promise(resolve => {
      connectiondb.query('DELETE FROM carts', resolve);
    });
    await new Promise(resolve => {
      connectiondb.query('DELETE FROM users WHERE user_id = ?', [testUserId], resolve);
    });
  });

  test('Debe agregar un producto al carrito exitosamente', async () => {
    const response = await request(app)
      .post('/api/cart')
      .set('Cookie', [`jwt=${authToken}`])
      .send({
        productId: 1, // ID del aguacate Hass
        quantity: 2
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        message: expect.any(String)
      })
    );
  });

  test('No debe agregar producto sin autenticación', async () => {
    const response = await request(app)
      .post('/api/cart')
      .send({
        productId: 1,
        quantity: 2
      });

    expect(response.status).toBe(401);
  });

  test('No debe agregar producto con cantidad inválida', async () => {
    const response = await request(app)
      .post('/api/cart')
      .set('Cookie', [`jwt=${authToken}`])
      .send({
        productId: 1,
        quantity: -1
      });

    expect(response.status).toBe(400);
  });

  test('No debe agregar producto inexistente', async () => {
    const response = await request(app)
      .post('/api/cart')
      .set('Cookie', [`jwt=${authToken}`])
      .send({
        productId: 999, // ID que no existe
        quantity: 1
      });

    expect(response.status).toBe(400);
  });
});