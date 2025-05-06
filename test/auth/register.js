import { jest } from '@jest/globals';
import connectiondb from '../../app/database/database.js';
import bcryptjs from 'bcryptjs';
import { methods } from '../../app/controllers/authentication.controller.js';

// Mock de las dependencias
jest.mock('../../app/database/database.js', () => ({
  query: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password')
}));

describe('Register tests', () => {
  let req, res;
  
  beforeEach(() => {
    // Limpiar mocks
    jest.clearAllMocks();
    
    // Mock request y response
    req = {
      body: {
        first_name_person: 'Test',
        last_name_person: 'User',
        document_number_person: '1234567890',
        user_name: 'testuser',
        email_user: 'test@example.com',
        password: 'password123'
      }
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('Registro exitoso de usuario', async () => {
    // Configurar los mocks para simular una inserción exitosa
    // Primera consulta - insert usuario
    connectiondb.query.mockImplementationOnce((query, values, callback) => {
      expect(query).toContain('INSERT INTO users SET ?');
      callback(null, { insertId: 1 });
    });
    
    // Segunda consulta - buscar role_id
    connectiondb.query.mockImplementationOnce((query, callback) => {
      expect(query).toContain('SELECT role_id FROM roles WHERE role_name');
      callback(null, [{ role_id: 'cli' }]);
    });
    
    // Tercera consulta - insertar user_role
    connectiondb.query.mockImplementationOnce((query, values, callback) => {
      expect(query).toContain('INSERT INTO user_roles');
      callback(null);
    });

    await methods.saveRegister(req, res);

    // Verificaciones
    expect(bcryptjs.hash).toHaveBeenCalledWith('password123', 8);
    expect(connectiondb.query).toHaveBeenCalledTimes(3);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'ok',
      message: expect.stringContaining('registered successfully'),
      redirect: '/'
    }));
  });

  test('Error cuando falta un campo requerido', async () => {
    // Eliminar un campo requerido
    delete req.body.email_user;
    
    connectiondb.query.mockImplementationOnce((query, values, callback) => {
      callback(new Error('Campo requerido faltante'), null);
    });

    await methods.saveRegister(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'Error'
    }));
  });

  test('Error al asignar rol de usuario', async () => {
    // Primera consulta - insert usuario exitoso
    connectiondb.query.mockImplementationOnce((query, values, callback) => {
      callback(null, { insertId: 1 });
    });
    
    // Segunda consulta - error al buscar role_id
    connectiondb.query.mockImplementationOnce((query, callback) => {
      callback(new Error('Error al buscar rol'), null);
    });

    await methods.saveRegister(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'Error',
      message: expect.stringContaining('Error assigning role')
    }));
  });

  test('Error cuando el usuario ya existe', async () => {
    connectiondb.query.mockImplementationOnce((query, values, callback) => {
      const error = new Error('Duplicate entry');
      error.code = 'ER_DUP_ENTRY';
      callback(error, null);
    });

    await methods.saveRegister(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'Error',
      message: expect.stringContaining('Error during registration')
    }));
  });
});