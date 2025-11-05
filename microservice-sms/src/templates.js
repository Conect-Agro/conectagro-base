export const buildWhatsAppTemplate = (data) => {
  if (!data || !data.order || !data.order.products) {
    throw new Error("El pedido no contiene productos válidos");
  }

  const { order, producer } = data;

  const productos = order.products
    .map(p => `• ${p.name} (${p.quantity} x $${p.price.toLocaleString("es-CO")})`)
    .join('\n');

  return `📦 *ConectAgro*
Hola *${producer.name}*, tienes un nuevo pedido asignado. 🌱

🆔 Pedido: ${order.id}
📅 Fecha: ${new Date(order.date).toLocaleDateString("es-CO")}
📦 Estado: ${order.status}

🧺 *Productos:*
${productos}

💰 *Total:* $${order.products
    .reduce((sum, p) => sum + p.price * p.quantity, 0)
    .toLocaleString("es-CO")}

Por favor revisa tu panel o contacta con el administrador para más detalles.`;
};

export const buildSMSTemplate = (data) => {
  if (!data || !data.order || !data.order.products) {
    throw new Error("El pedido no contiene productos válidos");
  }

  const { order, producer } = data;

  const total = order.products
    .reduce((sum, p) => sum + p.price * p.quantity, 0)
    .toLocaleString("es-CO");

  return `ConectAgro: Nuevo pedido para ${producer.name}.
🆔 ID: ${order.id}
🧺 Productos: ${order.products
    .map(p => `${p.name}(${p.quantity})`)
    .join(", ")}.
💰 Total: $${total}`;
};