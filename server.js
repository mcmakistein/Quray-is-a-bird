const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
// Render'ın verdiği portu kullan, yoksa 3000
const PORT = process.env.PORT || 3000; 

app.use(cors());
app.use(bodyParser.json());

const DB_FILE = 'skorlar.json';
const ADMIN_PASSWORD = "qurayisbest"; // 

// Veritabanını Başlat
let scores = [];
if (fs.existsSync(DB_FILE)) {
    try {
        scores = JSON.parse(fs.readFileSync(DB_FILE));
    } catch (e) {
        scores = [];
    }
} else {
    fs.writeFileSync(DB_FILE, JSON.stringify(scores));
}

// 1. Skorları Getir
app.get('/api/scores', (req, res) => {
    // Puanı yüksekten düşüğe sırala ve ilk 10'u gönder
    const topScores = scores.sort((a, b) => b.score - a.score).slice(0, 10);
    res.json(topScores);
});

// 2. Skor Kaydet (Aynı İsim Kontrollü)
app.post('/api/score', (req, res) => {
    const { name, score } = req.body;
    if (!name || score === undefined) return res.status(400).json({ message: 'Eksik bilgi' });

    const newScore = parseInt(score);
    
    // İsim temizliği (Çok uzun isimleri kes, HTML karakterlerini engelle)
    const cleanName = name.trim().substring(0, 15).replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const existingUserIndex = scores.findIndex(s => s.name === cleanName);

    if (existingUserIndex !== -1) {
        if (newScore > scores[existingUserIndex].score) {
            scores[existingUserIndex].score = newScore;
            scores[existingUserIndex].date = new Date();
        }
    } else {
        scores.push({ name: cleanName, score: newScore, date: new Date() });
    }
    
    fs.writeFileSync(DB_FILE, JSON.stringify(scores));
    res.json({ status: 'success' });
});

// --- YÖNETİCİ (ADMIN) KOMUTLARI ---

// 3. İsim Silme: /api/admin/delete?name=Arda&pass=SİFRE123
app.get('/api/admin/delete', (req, res) => {
    const { name, pass } = req.query;

    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre!");

    const initialLength = scores.length;
    scores = scores.filter(s => s.name !== name); // İsmi listeden çıkar

    if (scores.length < initialLength) {
        fs.writeFileSync(DB_FILE, JSON.stringify(scores));
        res.send(`BAŞARILI: '${name}' isimli oyuncu silindi.`);
    } else {
        res.send(`HATA: '${name}' isminde oyuncu bulunamadı.`);
    }
});

// 4. Tabloyu Sıfırlama: /api/admin/reset?pass=SİFRE123
app.get('/api/admin/reset', (req, res) => {
    const { pass } = req.query;

    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre!");

    scores = [];
    fs.writeFileSync(DB_FILE, JSON.stringify(scores));
    res.send("BAŞARILI: Tüm skor tablosu sıfırlandı!");
});
// 5. Manuel Skor Ekleme: /api/admin/add?name=Ali&score=1000&pass=SİFRE123
app.get('/api/admin/add', (req, res) => {
    const { name, score, pass } = req.query;

    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre!");
    if (!name || !score) return res.send("HATA: İsim ve Skor belirtilmeli!");

    const newScore = parseInt(score);
    
    // Bu isimde biri var mı?
    const existingUserIndex = scores.findIndex(s => s.name === name);

    if (existingUserIndex !== -1) {
        // Varsa puanını güncelle (Düşük olsa bile değiştirir, çünkü admin sensin)
        scores[existingUserIndex].score = newScore;
        res.send(`GÜNCELLENDİ: ${name} kullanıcısının puanı ${newScore} yapıldı.`);
    } else {
        // Yoksa yeni oluştur
        scores.push({ name: name, score: newScore, date: new Date() });
        res.send(`EKLENDİ: ${name} kullanıcısı ${newScore} puanla listeye eklendi.`);
    }

    // Kaydet
    fs.writeFileSync(DB_FILE, JSON.stringify(scores));
});

app.listen(PORT, () => {
    console.log(`Sunucu çalışıyor... Port: ${PORT}`);
});
