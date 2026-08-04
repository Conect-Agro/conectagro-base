import { MercadoPagoConfig, Preference } from 'mercadopago';

// 1. Inicializar el cliente
const client = new MercadoPagoConfig({
    accessToken: 'APP_USR-3475279482530386-080319-bb66860c1c8764053a066787b4ac80ba-3589354114'
});

export const createOrder = async (req, res) => {
    try {
        // 2. Instancia el servicio de Preferencias pasándole el cliente
        const preference = new Preference(client);

        // 3. Se crea la orden envolviendo los datos dentro de la propiedad "body"
        const result = await preference.create({
            body: {
                items: [
                    {
                        title: 'Panela Artesanal',
                        unit_price: 4000,
                        currency_id: 'COP',
                        quantity: 10
                    }
                ],

                //  Redirecciones
                back_urls: {
                    success: 'http://localhost:3000/success', // Ruta si el pago es exitoso
                    failure: 'http://localhost:3000/failure', // Ruta si el pago falla
                    pending: 'http://localhost:3000/pending'  // Ruta si el pago queda pendiente (ej. Efecty)
                },
            }
        });

        // 4. Retornar la respuesta de Mercado Pago
        res.json({
            message: 'Create order route',
            id: result.id,
            init_point: result.init_point // Enlace a usar en el frontend
        });

    } catch (error) {
        console.error('Error al crear la preferencia:', error);
        res.status(500).json({ error: error.message });
    }
}

export const receiveWebhook = (req, res) => {
    console.log('Webhook received:', req.query);
    res.send('Webhook received');
}
