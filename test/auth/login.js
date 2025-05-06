import { jest } from '@jest/globals';
import connectiondb from '../../app/database/database.js';
import bcryptjs from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';
import { methods } from '../../app/controllers/authentication.controller.js';

// Mock de las dependencias
jest.mock('../../app/database/database.js', () => ({
  query: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('jwt_token_mock')
}));

describe('Login tests', () => {
  let req, res;
  
  beforeEach(() => {
    // Limpiar mocks
    jest.clearAllMocks();
    
    // Configurar variables de entorno necesarias
    process.env.JWT_SECRET = 'test_secret';
    process.env.JWT_EXPIRATION = '1h';
    process.env.JWT_COOKIE_EXPIRES = '1';
    
    // Mock request y response
    req = {
      body: {
        user: 'testuser',
        password: 'password123'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      cookie: jest.fn()
    };
  });

  test('Login exitoso', async () => {
    // Mock usuario encontrado
    const mockUser = {
      username: 'testuser',
      password_hash: 'hashed_password',
      is_active: 1,
      login_attempts: 0
    };
    
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      expect(query).toContain('SELECT * FROM users WHERE username');
      callback(null, [mockUser]);
    });
    
    // Mock contraseña correcta
    bcryptjs.compare.mockResolvedValueOnce(true);
    
    // Mock reseteo de intentos fallidos
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      expect(query).toContain('UPDATE users SET login_attempts = 0');
      callback(null);
    });
    
    await methods.login(req, res);

    expect(connectiondb.query).toHaveBeenCalledTimes(2);
    expect(bcryptjs.compare).toHaveBeenCalledWith('password123', 'hashed_password');
    expect(jsonwebtoken.sign).toHaveBeenCalledWith(
      { user: 'testuser' }, 
      'test_secret', 
      { expiresIn: '1h' }
    );
    expect(res.cookie).toHaveBeenCalledWith('jwt', 'jwt_token_mock', expect.any(Object));
    expect(res.send).toHaveBeenCalledWith({
      status: 'ok',
      message: 'User logged in',
      redirect: '/productor'
    });
  });

  test('Error cuando faltan campos', async () => {
    // Eliminar un campo requerido
    delete req.body.password;
    
    await methods.login(req, res);
    
    expect(connectiondb.query).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      status: 'Error',
      message: 'Missing fields'
    });
  });

  test('Error cuando el usuario no existe', async () => {
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      callback(null, []);
    });
    
    await methods.login(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      status: 'Error',
      message: 'Incorrect username or password'
    });
  });

  test('Error cuando la contraseña es incorrecta', async () => {
    // Mock usuario encontrado
    const mockUser = {
      username: 'testuser',
      password_hash: 'hashed_password',
      is_active: 1,
      login_attempts: 0
    };
    
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      callback(null, [mockUser]);
    });
    
    // Mock contraseña incorrecta
    bcryptjs.compare.mockResolvedValueOnce(false);
    
    // Mock incremento de intentos fallidos
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      expect(query).toContain('UPDATE users SET login_attempts');
      callback(null);
    });
    
    await methods.login(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      status: 'Error',
      message: 'Incorrect username or password'
    });
  });

  test('Error cuando el usuario está inactivo', async () => {
    // Mock usuario inactivo
    const mockUser = {
      username: 'testuser',
      password_hash: 'hashed_password',
      is_active: 0,
      login_attempts: 0
    };
    
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      callback(null, [mockUser]);
    });
    
    await methods.login(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      status: 'Error',
      message: 'Inactive user'
    });
  });

  test('Error cuando hay demasiados intentos fallidos', async () => {
    // Mock usuario con demasiados intentos fallidos
    const mockUser = {
      username: 'testuser',
      password_hash: 'hashed_password',
      is_active: 1,
      login_attempts: 6
    };
    
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      callback(null, [mockUser]);
    });
    
    // Mock para la desactivación del usuario
    connectiondb.query.mockImplementationOnce((query, params, callback) => {
      expect(query).toContain('UPDATE users SET is_active = 0');
      callback(null);
    });
    
    await methods.login(req, res);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      status: 'Error',
      message: 'User blocked due to multiple failed attempts'
    });
  });
});