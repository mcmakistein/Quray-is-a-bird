const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// --- AYARLAR ---
// MongoDB Linkini ve Şifreni buraya tekrar yazdığından emin ol!
const MONGO_URI = "mongodb+srv://ArdaQ:Qurayisabest@cluster0.rzmtpg6.mongodb.net/?appName=Cluster0"; 
const ADMIN_PASSWORD = "Qurayisabest"; 

app.use(cors());
app.use(bodyParser.json());

// --- MONGODB BAĞLANTISI ---
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Bağlandı"))
    .catch(err => console.log("❌ Hata:", err));

// Şema
const scoreSchema = new mongoose.Schema({
    name: String,
    score: Number,
    date: { type: Date, default: Date.now }
});
const Score = mongoose.model('Score', scoreSchema);

// --- API ---

// 1. Skorları Listele
app.get('/api/scores', async (req, res) => {
    // Puanı yüksekten düşüğe sırala
    const topScores = await Score.find().sort({ score: -1 }).limit(10);
    res.json(topScores);
});

// 2. SKOR KAYDET (GÜNCELLENMİŞ VERSİYON)
app.post('/api/score', async (req, res) => {
    const { name, score } = req.body;
    if (!name || score === undefined) return res.status(400).json({ message: 'Eksik bilgi' });

    const newScore = parseInt(score);
    
    // ▼▼▼ BURASI DEĞİŞTİ: İSMİ ZORLA BÜYÜK HARF YAPIYORUZ ▼▼▼
    // Artık "arda", "Arda", "ARDA" hepsi "ARDA" olarak kaydedilecek.
    const cleanName = name.trim().substring(0, 15)
                          .replace(/</g, "")
                          .replace(/>/g, "")
                          .toLocaleUpperCase('tr-TR'); 

    try {
        // Bu isimde biri var mı?
        const existingUser = await Score.findOne({ name: cleanName });

        if (existingUser) {
            console.log(`Kullanıcı bulundu: ${cleanName}. Eski: ${existingUser.score}, Yeni: ${newScore}`);
            
            // Eğer yeni skor eskisinden büyükse güncelle
            if (newScore > existingUser.score) {
                existingUser.score = newScore;
                existingUser.date = new Date();
                await existingUser.save();
                console.log("Puan güncellendi.");
            } else {
                console.log("Yeni puan daha düşük, işlem yapılmadı.");
            }
        } else {
            console.log(`Yeni kullanıcı oluşturuluyor: ${cleanName}`);
            // Yoksa yeni oluştur
            const newEntry = new Score({ name: cleanName, score: newScore });
            await newEntry.save();
        }
        res.json({ status: 'success' });
    } catch (err) {
        console.error("Kayıt hatası:", err);
        res.status(500).json({ error: "Kaydedilemedi" });
    }
});

// --- ADMIN KOMUTLARI ---

app.get('/api/admin/delete', async (req, res) => {
    const { name, pass } = req.query;
    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre");
    // Silmek istediğin ismi de büyük harfe çevirip arıyoruz
    const targetName = name.trim().toLocaleUpperCase('tr-TR');
    await Score.deleteOne({ name: targetName });
    res.send(`${targetName} silindi.`);
});

app.get('/api/admin/reset', async (req, res) => {
    const { pass } = req.query;
    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre");
    await Score.deleteMany({});
    res.send("Tablo sıfırlandı.");
});

app.get('/api/admin/add', async (req, res) => {
    const { name, score, pass } = req.query;
    if (pass !== ADMIN_PASSWORD) return res.send("HATA: Yanlış Şifre");
    
    const cleanName = name.trim().toLocaleUpperCase('tr-TR');
    const newScore = parseInt(score);

    const existingUser = await Score.findOne({ name: cleanName });
    if (existingUser) {
        existingUser.score = newScore;
        await existingUser.save();
        res.send(`GÜNCELLENDİ: ${cleanName}`);
    } else {
        await new Score({ name: cleanName, score: newScore }).save();
        res.send(`EKLENDİ: ${cleanName}`);
    }
});

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
