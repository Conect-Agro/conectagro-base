const https = require('https');
const http = require('http');

class KeepAliveService {
  constructor(url, interval = 5 * 60 * 1000) { // 5 minutos por defecto
    this.url = url;
    this.interval = interval;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Keep-alive service ya está ejecutándose');
      return;
    }

    this.isRunning = true;
    console.log(`🔄 Iniciando keep-alive service para ${this.url}`);
    console.log(`⏰ Intervalo: ${this.interval / 1000} segundos`);

    this.pingInterval = setInterval(() => {
      this.ping();
    }, this.interval);

    // Ping inicial
    this.ping();
  }

  stop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.isRunning = false;
      console.log('🛑 Keep-alive service detenido');
    }
  }

  ping() {
    const protocol = this.url.startsWith('https://') ? https : http;
    const now = new Date().toISOString();

    console.log(`📡 Ping a ${this.url} - ${now}`);

    const req = protocol.get(this.url, (res) => {
      console.log(`✅ Ping exitoso - Status: ${res.statusCode} - ${now}`);
    });

    req.on('error', (error) => {
      console.error(`❌ Error en ping: ${error.message} - ${now}`);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.error(`⏰ Timeout en ping - ${now}`);
    });
  }
}

module.exports = KeepAliveService;