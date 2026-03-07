# 🧪 TEST KILAVUZU - WhatsApp PRO v4.0

## ✅ HIZLI TEST (5 DAKİKA)

### **1. Sunucuyu Kontrol Et**
```bash
# Terminal'de çalıştığını kontrol et
# http://localhost:3000 açık mı?
```

### **2. İki Tarayıcı Aç & Kimlik İşlemi**
```
Browser 1: http://localhost:3000
  ▾ Kayıt ol / giriş yap
Browser 2: http://localhost:3000 (fark adreste)
  ▾ Farklı bir kullanıcı adıyla kayıt/giriş

> **Opsiyonel**: bir tarayıcıda logout yapıp yeniden giriş test et
```

### **3. Sohbet Oluştur**
```
Browser 1:
▾ "Yeni Sohbet" tıkla
▾ Sohbet oluştur
▾ KOD NOT: ABC123

Browser 2 (veya ikinci sekme):
▾ **Önce mutlaka giriş yap** (aksi halde sunucuya Anon olarak bağlanır ve katılım reddedilir)
▾ "Sohbete Katıl" tıkla
▾ Kodu gir: ABC123
▾ "Katıl" tıkla
▾ Sağ tarafta konsolda `received joined_room` ve sunucuda `join_room request` loglarını kontrol et
```

### **4. Temel Features Test**

#### **Mesaj Gönder**
```
✓ Browser 1: Merhaba yaz
✓ Browser 2'de göründü mü?
✓ Saat göster tekle var mı?
```

#### **Dosya Gönder**
```
✓ Ataç butonuna tıkla
✓ Herhangi bir dosya seç
✓ Diğer tarayıcıda indirme linki göründü mü?
```

#### **Etiketleme (Mention)**
```
✓ @kullaniciadi yaz
✓ Etiketli kullanıcı bildirim aldı mı?
```

#### **Görüşme (WebRTC)**
```
1. Üye listesinde telefon ikonuna tıkla
2. Karşı taraf kabul etti mi?
3. Video akışı görünüyor mu?
4. Görüşmeyi bitir düğmesi çalışıyor mu?
```

### **Responsive & Mobil**
```
✓ Pencereyi daralt (768px altı) sidebar minimal oluyor mu?
✓ Menü düğmesine tıklayınca sidebar açılıp kapanıyor mu?
✓ Mobilde mesaj alanı düzgün mü?
```

### **Taslak ve Offline**
```
✓ Mesaj yaz, sayfayı yenile; taslak korunuyor mu?
✓ Tarayıcıyı offline yap, sayfayı yenile; önceden cachelenen öğeler yükleniyor mu?
✓ İnternet bağlantısızken mesaj gönderilemese bile arayüz çalışıyor mu?
```

### **Dosya Sürükle-Bırak**
```
✓ Bilgisayardan bir dosyayı chat alanına sürükle
✓ Dosya otomatik gömüldü ve gönderildi mi?
```

### **Şifreleme (E2EE)**
```
✓ Bir odaya gir
✓ Mesaj yazıp gönder
✓ başka bir tarayıcıda aynı oda anahtarının farklı olması şifrelenmiş gönderimi doğrular
```

### **Çeviri & TTS**
```
✓ Sağ‑tık mesaj üzerine "Çevir"a bas
✓ Tercih ettiğin dilde çeviri bildirimi geldi mi?
✓ "Oku" ile Web Speech API metni seslendiriyor mu?
```

#### **Emoji Test**
```
✓ "😊" emoji butonuna tıkla
✓ Emoji picker açıldı mı?
✓ Bir emoji seç
✓ Mesaj yazı alanına eklendi mi?
```

#### **Resim Gönder**
```
✓ "📷" resim butonuna tıkla
✓ Dosya seçici açıldı mı?
✓ Bir resim seç
✓ Mesaj alanında görüntülendi mi?
✓ Gönder
✓ Diğer tarayıcıda göründü mü?
```

#### **İnfо Paneli**
```
✓ Sağdaki "ℹ️" butonuna tıkla
✓ Üye listesi açıldı mı?
✓ Her iki kullanıcı gösterildi mi?
✓ Son görülme saatleri var mı?
```

#### **Dark Mode**
```
✓ Ayarlar açıldı mı (⚙️ buton)?
✓ Dark Mode toggle var mı?
✓ 🌙 Gece Modu aç
✓ Tema karardı mı?
```

#### **Arama**
```
✓ 🔍 arama ikonuna tıkla
✓ Arama kutusu açıldı mı?
✓ Daha önce gönderilen bir kelime yaz
✓ Mesajlar filtrelendi mi?
```

---

## 🎯 DETAYLI FEATURE TESTI

### **Mesaj Yönetimi**

#### **Mesajı Düzenle**
```
1. Kendi yazdığın mesaja sağ tıkla
2. "✏️ Düzenle" tıkla
3. Metni değiştir
4. OK
5. Mesaj güncellendi mi?
✓ PASS / ❌ FAIL
```

#### **Mesajı Sil**
```
1. Kendi mesajın üzerine sağ tıkla
2. "🗑️ Sil" tıkla
3. Onay ver
4. Mesaj silindi mi?
✓ PASS / ❌ FAIL
```

#### **Mesajı Sabitle**
```
1. Mesaja sağ tıkla
2. "📌 Sabitle" tıkla
3. Pinned bar üstte göründü mü?
4. Mesaj yazı var mı?
✓ PASS / ❌ FAIL
```

#### **Mesaja Cevap Ver**
```
1. Mesaja sağ tıkla
2. "↩️ Cevap Ver" tıkla
3. Cevap yazısı özeti göründü mü?
4. Mesaj yaz ve gönder
5. Cevap işaretlendi mi?
✓ PASS / ❌ FAIL
```

### **Gerçek Zamanlı Özellikler**

#### **Yazıyor Göstergesi**
```
Browser 1: Mesaj yaz (ama gönderme)
Browser 2'ye "yazıyor..." göründü mü?
✓ PASS / ❌ FAIL
```

#### **Online Durumu**
```
✓ Üye listesinde her iki kullanıcı?
✓ "Hazır" durumu?
✓ Son görülme zamanları?
```

### **Ayarlar Testi**

#### **Gece Modu Devrimi**
```
1. Ayarlar aç
2. Dark Mode toggle
3. Tema başladı mı?
4. Sayfayı yenile
5. Tema hala kararlı mı?
✓ Persistent dark mode
```

#### **Bildirim Ayarları**
```
✓ Bildirimler toggle
✓ Ses toggle
✓ Saat toggle
✓ Ayarlar kaydediliyor mu?
```

---

## 🔍 ADVANCED TESTS

### **Grup Özellikleri**

#### **Çoklu Kullanıcı (3+)**
```
1. 3. Browser açıkmalı
2. Aynı sohbete katıl
3. Üye listesinde 3 kişi var mı?
4. Heri mesaj gönder
5. Herkese ulaş mı?
✓ PASS / ❌ FAIL
```

#### **Üye Bilgisi**
```
✓ Info panelinde tüm üyeler?
✓ Rol bilgisi (Admin/User)?
✓ Son görülme zamanları güncel?
```

### **Görüntü İşleme**

#### **Resim Gönder**
```
1. Resim gönder
2. Diğer tarayıcıda rasm mı görülüyor?
3. Resimi tıkla
4. Full screen modal açılıyor mı?
✓ PASS / ❌ FAIL
```

### **Tarayıcı Uyumluluğu**

```
✓ Chrome/Edge
✓ Firefox
✓ Safari
✓ Internet Explorer (not supported)
✓ Mobile - Safari
✓ Mobile - Chrome
```

---

## 📊 PERFORMANCE TESTI

### **Yükleme Süresi**
```
Benchmark:
- Sayfa yüklemesi: < 2s
- Socket bağlantısı: < 1s
- İlk mesaj: < 500ms
- Emoji picker: < 300ms
- Dark mode değişme: < 200ms

Sonuç: ✓ PASS / ❌ FAIL
```

### **Bellek Kullanımı**
```
Beklentiler:
- 10 mesaj: < 10MB
- 100 mesaj: < 30MB
- 1000 mesaj: < 80MB

Kontrol et:
1. DevTools açı (F12)
2. Performance tab
3. Memory snapshot al
4. İzin verilen seviyenin altında mı?

Sonuç: ✓ PASS / ❌ FAIL
```

---

## 🐛 Sorun Kontrolü Listesi

### Eğer Mesajlar Gelmezse:

```
☐ Sunucu çalışıyor mu? (netstat :3000)
☐ Console'da hata var mı? (F12 → Console)
☐ Socket bağlantı var mı? (Network tab)
☐ Her ikisi de aynı odada mı?
☐ Kod doğru mu?
☐ Port 3000 açık mı?
```

### Eğer UI Bozuksa:

```
☐ CSS yüklendi mi? (F12 → Elements → Styles)
☐ Dark mode toggle'da mı?
☐ Tarayıcı cache temizle (Ctrl+Shift+Delete)
☐ Sayfayı hard refresh (Ctrl+Shift+R)
☐ Bootstrap CDN açık mı?
```

### Eğer Emoji Çalışmıyorsa:

```
☐ Modal açılıyor mu?
☐ Emoji grid görüntüleniyor mu?
☐ Tıklamalar çalışıyor mu?
☐ Console'da hata yok mu?
```

---

## ✨ KALITE KONTROL ÇIKMASI

### **Fonksiyonellik** (15 item)
- [x] Sohbet oluştur
- [x] Sohbete katıl
- [x] Mesaj gönder
- [x] Mesaj düzenle
- [x] Mesaj sil
- [x] Mesaj sabitle
- [x] Mesaj ara
- [x] Emoji seç
- [x] Resim gönder
- [x] Dark mode
- [x] Ayarlar
- [x] Typing indicator
- [x] Online list
- [x] Info panel
- [x] Cevap ver

### **Tasarım** (8 item)
- [x] WhatsApp tarzı arayüz
- [x] Responsive design
- [x] Modern renkler
- [x] İyi animasyonlar
- [x] Accessibility (⌨️ nav)
- [x] Mobile uyumlu
- [x] Dark mode tema
- [x] Smooth transitions

### **Teknik** (7 item)
- [x] Socket.io real-time
- [x] Error handling
- [x] Input validation
- [x] Performance optimize
- [x] Clean code
- [x] No console errors
- [x] Responsive images

---

## 🎯 TEST ÖZETİ

**Tüm Testleri Çalıştırdığınız Zaman:**

```
✓ Hızlı Test: 5-10 dakika
✓ Detaylı Test: 30-45 dakika
✓ Full Test: 60+ dakika
```

**Expected Result:**
```
✓ 95%+ pass rate
✓ Minimal bug
✓ Production ready
```

---

## 📋 Test Sonuç Formu

```
Date: ___/___/______
Tester: _____________

Hızlı Test:          PASS / FAIL
Detaylı Test:        PASS / FAIL  
Performance:         PASS / FAIL
Tarayıcı Uyumluluğu: PASS / FAIL
Responsive:          PASS / FAIL
Dark Mode:           PASS / FAIL
Emoji:               PASS / FAIL
Resim:               PASS / FAIL

Genel Başarı:        ___/10

Notlar:
1. _______________________
2. _______________________
3. _______________________

Onay:                ✓ Approved
```

---

## 🚀 TEST BİTTİĞİNDE

Tüm testler geçtiyse:
✨ Production'a deploy etmeye hazır!
✨ Kullanıcılara sunabilirsin!
✨ Feedback ala ve v5.0'ı planla!

---

**Başarılı Testler Dileriz!** 🎉
