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

// 2. Akıllı Skor Kaydetme (Tek İsim - En Yüksek Puan)
app.post('/api/score', (req, res) => {
    const { name, score } = req.body;

    if (!name || score === undefined) {
        return res.status(400).json({ status: 'error', message: 'Eksik bilgi' });
    }

    const newScore = parseInt(score);

    // Bu isimde biri var mı diye kontrol et
    const existingUserIndex = scores.findIndex(s => s.name === name);

    if (existingUserIndex !== -1) {
        // Kullanıcı zaten var!
        // Eğer yeni skor eskisinden büyükse güncelle, yoksa elleme.
        if (newScore > scores[existingUserIndex].score) {
            scores[existingUserIndex].score = newScore;
            scores[existingUserIndex].date = new Date();
        }
    } else {
        // Kullanıcı yok, yeni kayıt oluştur
        scores.push({ name, score: newScore, date: new Date() });
    }
    
    // Dosyaya kaydet
    fs.writeFileSync(DB_FILE, JSON.stringify(scores));

    res.json({ status: 'success', message: 'İşlem tamam' });
});

app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor...`);

});
