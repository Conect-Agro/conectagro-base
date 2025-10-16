const express = require('express');
const sgMail = require('@sendgrid/mail');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Función para formatear la fecha
const formatearFecha = (fechaISO) => {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Función para calcular el total del pedido
const calcularTotal = (productos) => {
  return productos.reduce((total, producto) => {
    return total + (producto.precio * producto.cantidad);
  }, 0).toFixed(2);
};

// Función para generar el HTML del correo
const generarHTMLCorreo = (usuario, pedido) => {
  const total = calcularTotal(pedido.productos);
  const fechaFormateada = formatearFecha(pedido.fecha);
  
  const productosHTML = pedido.productos.map(producto => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${producto.nombre}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${producto.cantidad}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${producto.precio.toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(producto.precio * producto.cantidad).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Pedido</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px;">
        <h1 style="color: #28a745; text-align: center; margin-bottom: 30px;">¡Confirmación de Pedido!</h1>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #495057; border-bottom: 2px solid #28a745; padding-bottom: 10px;">Hola ${usuario.nombre},</h2>
          <p>¡Gracias por tu pedido! Hemos recibido tu orden y está siendo procesada.</p>
          
          <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Detalles del Pedido</h3>
            <p><strong>ID del Pedido:</strong> ${pedido.id}</p>
            <p><strong>Fecha:</strong> ${fechaFormateada}</p>
            <p><strong>Estado:</strong> <span style="color: #28a745; font-weight: bold;">${pedido.estado}</span></p>
          </div>
          
          <h3 style="color: #495057; margin-top: 30px;">Productos Ordenados</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #28a745; color: white;">
                <th style="padding: 12px; text-align: left;">Producto</th>
                <th style="padding: 12px; text-align: center;">Cantidad</th>
                <th style="padding: 12px; text-align: right;">Precio Unit.</th>
                <th style="padding: 12px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${productosHTML}
            </tbody>
            <tfoot>
              <tr style="background-color: #f8f9fa; font-weight: bold;">
                <td colspan="3" style="padding: 15px; text-align: right; border-top: 2px solid #28a745;">TOTAL:</td>
                <td style="padding: 15px; text-align: right; border-top: 2px solid #28a745; color: #28a745; font-size: 1.2em;">$${total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h4 style="color: #0c5460; margin-top: 0;">¿Qué sigue?</h4>
          <p style="margin-bottom: 0; color: #0c5460;">Te enviaremos una notificación cuando tu pedido sea enviado. Si tienes alguna pregunta, no dudes en contactarnos.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; margin-bottom: 0;">¡Gracias por confiar en nosotros!</p>
          <p style="color: #6c757d; font-size: 0.9em;">Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Función para generar el texto plano del correo
const generarTextoCorreo = (usuario, pedido) => {
  const total = calcularTotal(pedido.productos);
  const fechaFormateada = formatearFecha(pedido.fecha);
  
  const productosTexto = pedido.productos.map(producto => 
    `- ${producto.nombre} (Cantidad: ${producto.cantidad}) - $${producto.precio.toFixed(2)} c/u = $${(producto.precio * producto.cantidad).toFixed(2)}`
  ).join('\n');

  return `
¡Confirmación de Pedido!

Hola ${usuario.nombre},

¡Gracias por tu pedido! Hemos recibido tu orden y está siendo procesada.

DETALLES DEL PEDIDO:
- ID del Pedido: ${pedido.id}
- Fecha: ${fechaFormateada}
- Estado: ${pedido.estado}

PRODUCTOS ORDENADOS:
${productosTexto}

TOTAL: $${total}

¿Qué sigue?
Te enviaremos una notificación cuando tu pedido sea enviado. Si tienes alguna pregunta, no dudes en contactarnos.

¡Gracias por confiar en nosotros!

---
Este es un correo automático, por favor no respondas a este mensaje.
  `.trim();
};

// Endpoint principal para enviar correos
app.post('/enviar-correo', async (req, res) => {
  try {
    const { usuario, pedido } = req.body;

    // Validar datos requeridos
    if (!usuario || !usuario.nombre || !usuario.email) {
      return res.status(400).json({
        success: false,
        error: 'Datos del usuario incompletos. Se requiere nombre y email.'
      });
    }

    if (!pedido || !pedido.id || !pedido.productos || !Array.isArray(pedido.productos)) {
      return res.status(400).json({
        success: false,
        error: 'Datos del pedido incompletos. Se requiere id y productos.'
      });
    }

    // Configurar el mensaje
    const msg = {
      to: usuario.email,
      from: {
        email: process.env.FROM_EMAIL || 'noreply@tuempresa.com',
        name: process.env.FROM_NAME || 'Tu Empresa'
      },
      subject: `Confirmación de Pedido - ${pedido.id}`,
      text: generarTextoCorreo(usuario, pedido),
      html: generarHTMLCorreo(usuario, pedido),
    };

    // Enviar el correo
    await sgMail.send(msg);

    console.log(`Correo enviado exitosamente a ${usuario.email} para el pedido ${pedido.id}`);

    res.status(200).json({
      success: true,
      message: 'Correo enviado exitosamente',
      datos: {
        destinatario: usuario.email,
        pedidoId: pedido.id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error al enviar correo:', error);

    // Manejar errores específicos de SendGrid
    if (error.response) {
      console.error('Error de SendGrid:', error.response.body);
      return res.status(500).json({
        success: false,
        error: 'Error del servicio de correo',
        detalles: error.response.body.errors || 'Error desconocido'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      mensaje: error.message
    });
  }
});

// Endpoint de salud
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Microservicio de Correos SendGrid',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Endpoint para probar la configuración de SendGrid
app.get('/test-config', (req, res) => {
  const config = {
    sendgridConfigured: !!process.env.SENDGRID_API_KEY,
    fromEmail: process.env.FROM_EMAIL || 'No configurado',
    fromName: process.env.FROM_NAME || 'No configurado',
    port: PORT
  };

  res.status(200).json({
    status: 'Configuración del servicio',
    config
  });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado'
  });
});

// Iniciar el servidor
const HOST = process.env.HOST || '0.0.0.0'; // Permitir conexiones desde cualquier IP

app.listen(PORT, HOST, () => {
  console.log(`🚀 Microservicio de correos ejecutándose en ${HOST}:${PORT}`);
  console.log(`📧 SendGrid API Key configurada: ${!!process.env.SENDGRID_API_KEY}`);
  console.log(`📬 Correo remitente: ${process.env.FROM_EMAIL || 'No configurado'}`);
  console.log(`🌐 Accesible desde: http://${HOST === '0.0.0.0' ? 'tu-servidor-ip' : HOST}:${PORT}`);
});

module.exports = app;