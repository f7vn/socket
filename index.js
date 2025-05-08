const WebSocket = require('ws');
const CryptoJS = require('crypto-js');

// Получаем порт из переменных окружения или используем 8080 по умолчанию
const PORT = process.env.PORT || 8080;

// Секретный ключ для расшифровки (должен совпадать с ключом на клиенте)
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-123';

// Создаем WebSocket сервер
const wss = new WebSocket.Server({ port: PORT });

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
wss.on('connection', function connection(ws) {
    logData('Новое подключение установлено', 'CONNECTION');

    // Отправляем приветственное сообщение
    ws.send('Добро пожаловать на сервер!');

    // Обработка входящих сообщений
    ws.on('message', function incoming(message) {
        const encryptedData = message.toString();
        logData(encryptedData, 'ЗАШИФРОВАННЫЕ ДАННЫЕ');
        
        // Расшифровываем данные
        const decryptedData = decryptData(encryptedData);
        
        if (decryptedData) {
            logData(decryptedData, 'РАСШИФРОВАННЫЕ ДАННЫЕ');
            
            // Отправляем расшифрованные данные обратно клиенту
            ws.send(JSON.stringify(decryptedData));
        } else {
            logData('Не удалось расшифровать данные', 'ОШИБКА');
            ws.send('Ошибка расшифровки данных');
        }
    });

    // Обработка закрытия соединения
    ws.on('close', function close() {
        logData('Клиент отключился', 'DISCONNECTION');
    });

    // Обработка ошибок
    ws.on('error', function error(err) {
        logData(err.message, 'ERROR');
    });
}); 