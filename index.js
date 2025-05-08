const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const http = require('http');
const https = require('https');
const fs = require('fs');

// Получаем порт из переменных окружения или используем 8080 по умолчанию
const PORT = process.env.PORT || 8080;

// Секретный ключ для расшифровки (должен совпадать с ключом на клиенте)
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-123';

// Создаем HTTP сервер
const server = http.createServer((req, res) => {
    console.log('Получен HTTP запрос:', req.method, req.url);
    console.log('Заголовки запроса:', req.headers);
    
    // Добавляем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Upgrade, Connection');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket сервер работает');
});

// Создаем WebSocket сервер, привязанный к HTTP серверу
const wss = new WebSocket.Server({ 
    server,
    path: '/ws',
    // Добавляем проверку origin и дополнительные настройки
    verifyClient: (info, callback) => {
        console.log('Попытка подключения от:', info.origin);
        console.log('Заголовки запроса:', info.req.headers);
        // Разрешаем подключения с любого origin
        callback(true);
    },
    // Добавляем настройки для WSS
    clientTracking: true,
    perMessageDeflate: false,
    // Добавляем обработку ошибок
    handleProtocols: (protocols, req) => {
        console.log('Запрошенные протоколы:', protocols);
        return protocols[0];
    }
});

// Добавляем логирование при создании сервера
wss.on('listening', () => {
    console.log('WebSocket сервер слушает подключения');
    console.log('Настройки сервера:', {
        port: PORT,
        path: wss.options.path,
        clientTracking: wss.options.clientTracking,
        perMessageDeflate: wss.options.perMessageDeflate
    });
});

console.log(`WebSocket сервер запущен на порту ${PORT}`);

// Функция для расшифровки данных
function decryptData(encryptedData) {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedString);
    } catch (error) {
        console.error('Ошибка расшифровки:', error);
        return null;
    }
}

// Функция для красивого вывода данных в консоль
function logData(data, type) {
    console.log('\n' + '='.repeat(50));
    console.log(`[${new Date().toLocaleTimeString()}] ${type}:`);
    console.log('-'.repeat(50));
    if (typeof data === 'object') {
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log(data);
    }
    console.log('='.repeat(50) + '\n');
}

// Обработка подключения новых клиентов
wss.on('connection', function connection(ws, req) {
    const clientIp = req.socket.remoteAddress;
    logData(`Новое подключение установлено от ${clientIp}`, 'CONNECTION');

    // Отправляем приветственное сообщение
    ws.send('Добро пожаловать на сервер!');

    // Обработка входящих сообщений
    ws.on('message', function incoming(message) {
        const plainData = message.toString();
        const now = new Date().toISOString();
        console.log(`[${now}] [${clientIp}] Получено сообщение: ${plainData}`);
        logData(plainData, 'ПОЛУЧЕНОЕ СООБЩЕНИЕ');
        // Сохраняем сообщение в файл
        const logLine = `[${now}] [${clientIp}] ${plainData}\n`;
        fs.appendFile('messages.log', logLine, (err) => {
            if (err) console.error('Ошибка записи в лог:', err);
        });
        // Просто отправляем обратно
        ws.send(plainData);
    });

    // Обработка закрытия соединения
    ws.on('close', function close(code, reason) {
        logData(`Клиент отключился (код: ${code}, причина: ${reason})`, 'DISCONNECTION');
    });

    // Обработка ошибок
    ws.on('error', function error(err) {
        logData(`Ошибка WebSocket: ${err.message}`, 'ERROR');
    });
});

// Добавляем обработку ошибок сервера
server.on('error', (error) => {
    console.error('Ошибка сервера:', error);
});

// Добавляем обработку необработанных исключений
process.on('uncaughtException', (error) => {
    console.error('Необработанное исключение:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Необработанное отклонение промиса:', reason);
});

// Запускаем сервер
server.listen(PORT, () => {
    console.log(`HTTP сервер запущен на порту ${PORT}`);
    console.log(`WebSocket сервер доступен по адресу: wss://websocket-server.onrender.com`);
}); 