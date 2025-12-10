const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose'); // MongoDB kütüphanesi

const app = express();
const PORT = process.env.PORT || 3000;

// --- AYARLAR ---
// 1. ADIM: MongoDB Atlas'tan aldığın linki tırnak içine yapıştır.
// <password> kısmına kendi şifreni yazdığından emin ol!
const MONGO_URI = "mongodb+srv://ArdaQ:Qurayisabest@cluster0.rzmtpg6.mongodb.net/?appName=Cluster0"; 

// 2. ADIM: Yönetici şifreni belirle (Linkten silme yaparken lazım olacak)
const ADMIN_PASSWORD = "Qurayisabest"; 

app.use(cors());
app.use(bodyParser.json());

// --- MONGODB BAĞLANTISI ---
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB'ye Başarıyla Bağlandı!"))
    .catch(err => console.log("❌ Veritabanı Hatası:", err));

// --- VERİTABANI MODELİ ---
const scoreSchema = new mongoose.Schema({
    name: String,
    score: Number,
    date: { type: Date, default: Date.now }
});
const Score = mongoose.model('Score', scoreSchema);

// --- OYUN API KOMUTLARI ---

// 1. Skorları Listele
app.get('/api/scores', async (req, res) => {
    try {
        // En yüksek puana göre sırala, ilk 10 kişiyi getir
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
    // İsim temizliği (Uzun isimleri kısalt, güvenli hale getir)
    const cleanName = name.trim().substring(0, 15).replace(/</g, "&lt;").replace(/>/g, "&gt;");

    try {
        // Bu isimde biri var mı?
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

// --- ADMIN KOMUTLARI (Link ile Yönetim) ---

// 3. Tek Kişi Silme: /api/admin/delete?name=Ali&pass=SİFRE123
app.get('/api/admin/delete', async (req, res) => {
    const { name, pass } = req.query;
    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre!");

    const sonuc = await Score.deleteOne({ name: name });
    if (sonuc.deletedCount > 0) res.send(`BAŞARILI: '${name}' silindi.`);
    else res.send(`HATA: '${name}' bulunamadı.`);
});

// 4. Tabloyu Sıfırlama: /api/admin/reset?pass=SİFRE123
app.get('/api/admin/reset', async (req, res) => {
    const { pass } = req.query;
    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre!");

    await Score.deleteMany({});
    res.send("BAŞARILI: Veritabanı tamamen temizlendi!");
});

// 5. Manuel Ekleme: /api/admin/add?name=Ali&score=500&pass=SİFRE123
app.get('/api/admin/add', async (req, res) => {
    const { name, score, pass } = req.query;
    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre!");

    const cleanName = name.trim();
    const newScore = parseInt(score);

    const existingUser = await Score.findOne({ name: cleanName });
    if (existingUser) {
        existingUser.score = newScore;
        await existingUser.save();
        res.send(`GÜNCELLENDİ: ${cleanName} artık ${newScore} puan.`);
    } else {
        await new Score({ name: cleanName, score: newScore }).save();
        res.send(`EKLENDİ: ${cleanName} listeye girdi.`);
    }
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
