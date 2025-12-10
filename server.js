const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose'); // Yeni kütüphanemiz

const app = express();
const PORT = process.env.PORT || 3000;

// --- AYARLAR ---
// BURAYA MongoDB'den aldığın linki yapıştır!
// Şifreni <password> yerine yazmayı unutma.
const MONGO_URI = "mongodb+srv://ArdaQ:<db_password>@cluster0.rzmtpg6.mongodb.net/?appName=Cluster0"; 

const ADMIN_PASSWORD = "Qurayisabest"; // Admin şifren

app.use(cors());
app.use(bodyParser.json());

// --- MONGODB BAĞLANTISI ---
mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB'ye Bağlandı!"))
    .catch(err => console.log("Veritabanı Hatası:", err));

// --- VERİTABANI ŞEMASI (TABLO YAPISI) ---
const scoreSchema = new mongoose.Schema({
    name: String,
    score: Number,
    date: { type: Date, default: Date.now }
});

const Score = mongoose.model('Score', scoreSchema);

// --- API ---

// 1. Skorları Getir
app.get('/api/scores', async (req, res) => {
    try {
        // Veritabanından çek, puana göre sırala, ilk 10'u al
        const topScores = await Score.find().sort({ score: -1 }).limit(10);
        res.json(topScores);
    } catch (err) {
        res.status(500).json({ error: "Veri çekilemedi" });
    }
});

// 2. Skor Kaydet (Aynı İsim Kontrollü)
app.post('/api/score', async (req, res) => {
    const { name, score } = req.body;
    if (!name || score === undefined) return res.status(400).json({ message: 'Eksik bilgi' });

    const newScore = parseInt(score);
    // İsim temizliği
    const cleanName = name.trim().substring(0, 15).replace(/</g, "&lt;").replace(/>/g, "&gt;");

    try {
        // Bu isimde biri var mı bak
        const existingUser = await Score.findOne({ name: cleanName });

        if (existingUser) {
            // Varsa ve yeni skor daha yüksekse güncelle
            if (newScore > existingUser.score) {
                existingUser.score = newScore;
                existingUser.date = new Date();
                await existingUser.save();
            }
        } else {
            // Yoksa yeni oluştur
            const newEntry = new Score({ name: cleanName, score: newScore });
            await newEntry.save();
        }
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: "Kaydedilemedi" });
    }
});

// --- ADMIN KOMUTLARI ---

// Silme: /api/admin/delete?name=Ali&pass=SİFRE123
app.get('/api/admin/delete', async (req, res) => {
    const { name, pass } = req.query;
    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre!");

    await Score.deleteOne({ name: name });
    res.send(`İŞLEM TAMAM: ${name} silindi (varsa).`);
});

// Sıfırlama: /api/admin/reset?pass=SİFRE123
app.get('/api/admin/reset', async (req, res) => {
    const { pass } = req.query;
    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre!");

    await Score.deleteMany({});
    res.send("BAŞARILI: Veritabanı tamamen temizlendi!");
});

// Ekleme: /api/admin/add?name=Ali&score=100&pass=SİFRE123
app.get('/api/admin/add', async (req, res) => {
    const { name, score, pass } = req.query;
    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre!");

    const cleanName = name.trim();
    const newScore = parseInt(score);

    const existingUser = await Score.findOne({ name: cleanName });
    if (existingUser) {
        existingUser.score = newScore;
        await existingUser.save();
        res.send("GÜNCELLENDİ");
    } else {
        await new Score({ name: cleanName, score: newScore }).save();
        res.send("EKLENDİ");
    }
});
// --- ADMIN KOMUTLARI (SİLME & SIFIRLAMA) ---

// 1. TEK KİŞİ SİLME: /api/admin/delete?name=Arda&pass=SİFRE123
app.get('/api/admin/delete', async (req, res) => {
    const { name, pass } = req.query;
    
    // Şifre kontrolü
    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre!");
    if (!name) return res.send("HATA: İsim belirtmedin!");

    // MongoDB'den sil
    const sonuc = await Score.deleteOne({ name: name });

    if (sonuc.deletedCount > 0) {
        res.send(`BAŞARILI: '${name}' isimli oyuncu silindi.`);
    } else {
        res.send(`HATA: '${name}' diye biri listede yok.`);
    }
});

// 2. TABLOYU KOMPLE SIFIRLAMA: /api/admin/reset?pass=SİFRE123
app.get('/api/admin/reset', async (req, res) => {
    const { pass } = req.query;

    // Şifre kontrolü
    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre!");

    // Her şeyi sil
    await Score.deleteMany({});
    
    res.send("BAŞARILI: Tüm skor tablosu sıfırlandı, veritabanı tertemiz!");
});
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
