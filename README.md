# 💬 Davet Kodlu Chat Uygulaması

Gerçek zamanlı, davet kodu tabanlı modern bir sohbet uygulaması.

## ✨ Özellikler

### Backend Geliştirmeleri
- ✅ **CORS Desteği** - Daha güvenli ve esnek bağlantılar
- ✅ **Hata Yönetimi** - Kapsamlı hata işleme ve loglama
- ✅ **Connection Status** - Gerçek zamanlı bağlantı takibi
- ✅ **Zaman Damgası** - Her mesajda otomatik zaman bilgisi
- ✅ **Kullanıcı Sayısı Takibi** - Odadaki canlı kullanıcı sayısı
- ✅ **Port Yönetimi** - Dinamik port konfigürasyonu

### Frontend Geliştirmeleri
- 🎨 **Modern UI** - Bootstrap 5 ile profesyonel tasarım
- 🎨 **Gradient Design** - Çekici renk şemaları ve animasyonlar
- 📱 **Responsive Design** - Tüm cihazlarda mükemmel görünüm
- 💬 **Gelişmiş Chat** - Asimetrik mesaj görünümü (sent/received)
- ⏰ **Zaman Gösterimi** - Her mesajda yerel saat formatında zaman
- 👥 **Kullanıcı Sayısı** - Odada aktif kullanıcı sayısı gösterge
- 🔗 **Kod Otomatik Biçimlendirme** - Davet kodu otomatik UPPERCASE
- 📋 **Form Validasyonu** - İstemci ve sunucu taraflı doğrulama
- 🎯 **UI State Yönetimi** - Odaya girmeden çıkma, sesi AC/KAPAT
- ⌚ **Loading Göstergesi** - Spinner animasyonları işlem sırasında
- 🔔 **Bildirimi Sistemi** - Toast tarzı bildirimler
- 🔐 **XSS Koruması** - HTML kaçış ile güvenli metin görüntüleme
- 🎰 **Animasyonlar** - Sliding, fading ve pulsing efektleri

## 🚀 Kurulum & Başlatma

### Gereksinimler
- Node.js 16+ 
- npm veya yarn

### Adımlar
```bash
# Proje dizinine gir
cd invite-chat

# Bağımlılıkları yükle
npm install

# Sunucuyu başlat
npm start

# Tarayıcı otomatik açılmaz, aşağıdaki adrese git:
# http://localhost:3000
```

## 📚 Kullanım

### Oda Oluşturma
1. Kullanıcı adı gir
2. "Oda Oluştur" butonuna tıkla
3. Otomatik olarak oluşturulan 6 karakterli kodu kopyala

### Odaya Katılma
1. Kullanıcı adı gir
2. "Odaya Katıl" butonuna tıkla
3. Davet kodunu gir
4. Enter tuşu veya "Odaya Gir" butonuna tıkla

### Mesaj Gönderme
- Metni yazıp "Gönder" butonuna tıkla
- Veya Enter tuşu kısayolunu kullan
- Shift+Enter yeni satır eklemek için

## 🛠️ Teknik Özellikler

### Backend (Node.js + Express + Socket.io)
```javascript
- Express.js - Web framework
- Socket.io - Gerçek zamanlı iletişim
- CORS enabled - Güvenli cross-origin istekleri
- Error handling - Komprehansif hata yönetimi
```

### Frontend (HTML + CSS + JavaScript)
```javascript
- Bootstrap 5 - Responsive grid sistemi
- Custom CSS - Gradients ve animasyonlar
- Vanilla JavaScript - 0 framework dependency
- Socket.io client - Gerçek zamanlı bağlantı
```

## 📊 Proje Yapısı
```
invite-chat/
├── server.js              # Express + Socket.io sunucusu
├── package.json           # Bağımlılıklar ve scripts
├── public/
│   ├── index.html         # Ana HTML sayfası
│   ├── client.js          # Frontend Socket.io ve UI mantığı
│   └── style.css          # Modern özel stiller
└── .gitignore             # Git ignorefile
```

## 🔧 Yapılandırma

### Port Değiştirme
`server.js`te veya environment variable ile:
```bash
PORT=8080 npm start
```

### Kullanıcı Sınırları
- Oda başına max 2 kullanıcı
- Kullanıcı adı max 20 karakter
- Mesaj max 500 karakter

## 🐛 Sorun Giderme

### Port zaten kullanımda
```bash
# Alternatif port kullan
PORT=3001 npm start
```

### Bağlantı hatası
- Tarayıcıyı yenile (Ctrl+R)
- Konsolu kontrol et (F12)
- Sunucunun çalışıp çalışmadığını kontrol et

### Mesajlar gönderilmiyor
- Odada olup olmadığını kontrol et
- Bağlantı durumunu kontrol et
- Mesaj boş değildir kontrolü yap

## 📝 Geliştirme Notları

### Version 2.0 Geliştirmeleri
- ✅ Tüm UI modernleştirildi Bootstrap ile
- ✅ Custom CSS gradients ve animasyonlar eklendi
- ✅ Zaman damgası sistemi kuruldu
- ✅ Hata yönetimi geliştirildi
- ✅ XSS koruması eklendi
- ✅ Loading states eklendi
- ✅ Connection status tracking yapıldı
- ✅ Responsive tasarım sağlandı

### Gelecek Özellikler (Planned)
- [ ] Kullanıcı profilleri
- [ ] Emoji desteği
- [ ] Mesaj silme/düzeltme
- [ ] Dosya paylaşımı
- [ ] Anlık yazıyor göstergesi
- [ ] Mesaj arşivi/geçmiş
- [ ] Şifre korumalı odalar
- [ ] Oda listelemeleri
- [ ] Veritabanı entegrasyonu
- [ ] Kullanıcı kimlik doğrulama

## 📄 Lisans

MIT License - Açık kaynak olarak kullanılabilir

## �️ Deployment & Cloud

Bu uygulamayı Vercel'de frontend, başka bir platformda backend olarak çalıştırabilirsiniz. Vercel sunucusuz yapısı nedeniyle Socket.io doğrudan desteklenmez; bu yüzden backend'i Render/Railway/Heroku gibi hizmetlere koyup frontend'i Vercel'e dağıtmak en sağlıklısı.

1. **Backend**
   - GitHub reposundan bir Web Service oluşturun (Render.com gibi).
   - Ortam değişkeni `FRONTEND_ORIGIN` ile frontend URL'sini verin.
   - `start` komutu: `node server.js`.
   - Kullanılan port otomatik olarak verilir.

2. **Frontend (Vercel)**
   - Projeyi Vercel'e bağlayın.
   - Framework Preset: `Other`.
   - Build gerekmiyor, sadece `public/` içeriğini dağıtacak.
   - Ortam değişkeni `NEXT_PUBLIC_API_URL` ile backend URL'sini ayarlayın.
   - `client.js` içerisindeki Socket.io bağlantısını bu değişkene göre ayarlayın.

3. **Config Değişikliği**
   - `server.js` zaten `FRONTEND_ORIGIN` env değişkenini okuyor.
   - `client.js`'de başlangıçta API_URL kontrolü ekleyin:
     ```js
     const API_URL = window._env_?.API_URL || "http://localhost:3000";
     const socket = io(API_URL, { ... });
     ```

4. **Veritabanı**
   - `data.json` üretimde uygun değil; yerine MongoDB, SQLite veya başka bir servis kullanın.

---

## �👨‍💻 Geliştirici

Davet Kodlu Chat v2.0 - 2026
