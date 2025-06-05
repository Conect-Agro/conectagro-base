import { jest } from '@jest/globals';
import connectiondb from '../../app/database/database.js';
import bcryptjs from 'bcryptjs';
import { methods as recoverMethods } from '../../app/controllers/recoverPassword.controller.js';

// Mock de las dependencias
jest.mock('../../app/database/database.js', () => ({
  query: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('new_hashed_password')
}));

describe('Change Password tests', () => {
  let req, res;
  
  beforeEach(() => {
    // Limpiar mocks
    jest.clearAllMocks();
    
    // Mock request y response
    req = {
      body: {
        token: 'valid_reset_token',
        email: 'user@example.com',
        password: 'newPassword123',
        confirmPassword: 'newPassword123'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
  });

  test('Cambio de contraseña exitoso', async () => {
    // Mock verificación de token y email
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      expect(query).toContain('SELECT * FROM password_reset');
      callback(null, [{
        email: 'user@example.com',
        expiry: new Date(Date.now() + 3600000).toISOString() // Token válido (no expirado)
      }]);
    });

    // Mock actualización de contraseña
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      expect(query).toContain('UPDATE users SET password_hash');
      callback(null, { affectedRows: 1 });
    });

    // Mock eliminación del token usado
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      expect(query).toContain('DELETE FROM password_reset');
      callback(null);
    });
    
    await recoverMethods.changePassword(req, res);

    expect(bcryptjs.hash).toHaveBeenCalledWith('newPassword123', 8);
    expect(connectiondb.query).toHaveBeenCalledTimes(3);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      status: "Success", 
      message: "Password updated successfully"
    });
  });

  test('Error cuando las contraseñas no coinciden', async () => {
    // Modificar confirmPassword para que no coincida
    req.body.confirmPassword = 'differentPassword';
    
    await recoverMethods.changePassword(req, res);
    
    expect(connectiondb.query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      status: "Error", 
      message: "Passwords do not match"
    });
  });

  test('Error cuando el token ha expirado', async () => {
    // Mock token expirado
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      callback(null, [{
        email: 'user@example.com',
        expiry: new Date(Date.now() - 3600000).toISOString() // Token expirado
      }]);
    });
    
    await recoverMethods.changePassword(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      status: "Error", 
      message: "Token has expired"
    });
  });

  test('Error cuando el token no existe', async () => {
    // Mock token no encontrado
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      callback(null, []);
    });
    
    await recoverMethods.changePassword(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      status: "Error", 
      message: "Invalid or expired token"
    });
  });

  test('Error cuando hay problema en la base de datos', async () => {
    // Mock error en la base de datos
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      callback(new Error('Database error'), null);
    });
    
    await recoverMethods.changePassword(req, res);
    
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      status: "Error", 
      message: expect.stringContaining("Database error")
    });
  });
});