const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Herkesin bağlanmasına izin ver
app.use(bodyParser.json());

// Skorları saklayacağımız basit veritabanı (dosya olarak)
const DB_FILE = 'skorlar.json';

// Veritabanını oku veya oluştur
let scores = [];
if (fs.existsSync(DB_FILE)) {
    scores = JSON.parse(fs.readFileSync(DB_FILE));
} else {
    fs.writeFileSync(DB_FILE, JSON.stringify(scores));
}

// 1. Skorları Listeleme İsteği (GET)
app.get('/api/scores', (req, res) => {
    // En yüksek puana göre sırala ve ilk 10'u gönder
    const topScores = scores.sort((a, b) => b.score - a.score).slice(0, 10);
    res.json(topScores);
});

// 2. Yeni Skor Kaydetme İsteği (POST)
app.post('/api/score', (req, res) => {
    const { name, score } = req.body;

    if (!name || score === undefined) {
        return res.status(400).json({ status: 'error', message: 'Eksik bilgi' });
    }

    // Yeni skoru ekle
    scores.push({ name, score: parseInt(score), date: new Date() });
    
    // Dosyaya kaydet (Sunucu kapanınca silinmesin diye)
    fs.writeFileSync(DB_FILE, JSON.stringify(scores));

    res.json({ status: 'success', message: 'Skor kaydedildi' });
});

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor...`);
});