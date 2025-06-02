const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json());
app.use(cors());

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // o cualquier otro servicio
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Función para generar el HTML del resumen de compra
const generateOrderSummaryHTML = (orderData) => {
  const { usuario, pedido } = orderData;
  
  let productosHTML = '';
  let total = 0;
  
  pedido.productos.forEach(producto => {
    const subtotal = producto.precio * producto.cantidad;
    total += subtotal;
    
    productosHTML += `
      <div style="background: white; border-radius: 12px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 1px solid #e8e8e8;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: 600;">
              ${producto.nombre}
            </h3>
            <p style="margin: 0; color: #666; font-size: 14px;">
              Cantidad: <strong>${producto.cantidad}</strong>
            </p>
          </div>
          <div style="text-align: right; min-width: 120px;">
            <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">
              ${producto.precio.toFixed(2)} c/u
            </p>
            <p style="margin: 0; color: #28a745; font-size: 18px; font-weight: 700;">
              ${subtotal.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resumen de tu Pedido</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); min-height: 100vh;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 16px 16px 0 0; padding: 30px 20px; text-align: center; color: white; box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);">
          <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">
            ¡Gracias por tu compra! 🎉
          </h1>
          <p style="margin: 0; font-size: 16px; opacity: 0.9;">
            Tu pedido #${pedido.id} ha sido confirmado
          </p>
        </div>
        
        <!-- Main Content -->
        <div style="background: #f8f9fa; padding: 0; border-radius: 0 0 16px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          
          <!-- Customer Info -->
          <div style="padding: 25px; border-bottom: 1px solid #e9ecef;">
            <h2 style="margin: 0 0 20px 0; color: #28a745; font-size: 20px; font-weight: 600; border-bottom: 2px solid #28a745; padding-bottom: 8px; display: inline-block;">
              📋 Información del Cliente
            </h2>
            <div style="background: white; border-radius: 8px; padding: 15px; border-left: 4px solid #28a745;">
              <p style="margin: 5px 0; color: #333; font-size: 14px;">
                <strong style="color: #28a745;">Nombre:</strong> ${usuario.nombre}
              </p>
              <p style="margin: 5px 0; color: #333; font-size: 14px;">
                <strong style="color: #28a745;">Email:</strong> ${usuario.email}
              </p>
              <p style="margin: 5px 0; color: #333; font-size: 14px;">
                <strong style="color: #28a745;">Teléfono:</strong> ${usuario.telefono || 'No proporcionado'}
              </p>
            </div>
          </div>
          
          <!-- Order Details -->
          <div style="padding: 25px; border-bottom: 1px solid #e9ecef;">
            <h2 style="margin: 0 0 20px 0; color: #28a745; font-size: 20px; font-weight: 600; border-bottom: 2px solid #28a745; padding-bottom: 8px; display: inline-block;">
              📦 Detalles del Pedido
            </h2>
            <div style="background: white; border-radius: 8px; padding: 15px; border-left: 4px solid #20c997;">
              <p style="margin: 5px 0; color: #333; font-size: 14px;">
                <strong style="color: #20c997;">Fecha:</strong> ${new Date(pedido.fecha).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p style="margin: 5px 0; color: #333; font-size: 14px;">
                <strong style="color: #20c997;">Estado:</strong> 
                <span style="background: #d4edda; color: #155724; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                  ${pedido.estado}
                </span>
              </p>
            </div>
          </div>
          
          <!-- Products -->
          <div style="padding: 25px;">
            <h2 style="margin: 0 0 20px 0; color: #28a745; font-size: 20px; font-weight: 600; border-bottom: 2px solid #28a745; padding-bottom: 8px; display: inline-block;">
              🛒 Productos
            </h2>
            ${productosHTML}
            
            <!-- Total -->
            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 12px; padding: 20px; margin-top: 20px; text-align: center; color: white; box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);">
              <p style="margin: 0 0 5px 0; font-size: 14px; opacity: 0.9;">Total del pedido</p>
              <h3 style="margin: 0; font-size: 32px; font-weight: 700;">
                ${total.toFixed(2)}
              </h3>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #28a745; color: white; padding: 25px; text-align: center; border-radius: 0 0 16px 16px;">
            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
              ¡Tu pedido está en camino! 🚚
            </p>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">
              Si tienes alguna pregunta, no dudes en contactarnos.
            </p>
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
              <p style="margin: 0; font-size: 12px; opacity: 0.8;">
                © 2025 Tu Tienda Online - Productos frescos y naturales
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </body>
    </html>
  `;
};

// Endpoint para enviar resumen de compra
app.post('/send-order-summary', async (req, res) => {
  try {
    const { usuario, pedido } = req.body;
    
    // Validación básica
    if (!usuario || !usuario.email || !usuario.nombre) {
      return res.status(400).json({
        success: false,
        message: 'Información del usuario incompleta'
      });
    }
    
    if (!pedido || !pedido.id || !pedido.productos || !Array.isArray(pedido.productos)) {
      return res.status(400).json({
        success: false,
        message: 'Información del pedido incompleta'
      });
    }
    
    // Configuración del email
    const mailOptions = {
      from: `"Tu Tienda Online" <${process.env.EMAIL_USER}>`,
      to: usuario.email,
      subject: `Resumen de tu pedido #${pedido.id}`,
      html: generateOrderSummaryHTML({ usuario, pedido })
    };
    
    // Enviar email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email enviado:', info.messageId);
    
    res.status(200).json({
      success: true,
      message: 'Resumen de compra enviado exitosamente',
      messageId: info.messageId
    });
    
  } catch (error) {
    console.error('Error al enviar email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Endpoint de salud
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Microservicio de notificaciones funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para probar configuración de email
app.get('/test-email-config', async (req, res) => {
  try {
    await transporter.verify();
    res.status(200).json({
      success: true,
      message: 'Configuración de email válida'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en la configuración de email',
      error: error.message
    });
  }
});

// Middleware para manejar rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado'
  });
});

// Middleware para manejo de errores
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Microservicio de notificaciones ejecutándose en puerto ${PORT}`);
  console.log(`📧 Configuración de email: ${process.env.EMAIL_USER || 'No configurado'}`);
});