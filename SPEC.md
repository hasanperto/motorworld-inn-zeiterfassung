# MotorWorld Inn — Personel Zaman & Kazanç Takip

## 🎯 Proje Özeti

**Amaç:** Restoran personeli için zaman takibi ve kazanç hesaplama uygulaması

**Tema:** Endüstriyel/Modern - MotorWorld estetiği ile mobil-first yaklaşım

---

## 📱 Ekranlar

### 1. Schicht (Ana Ekran)
```
┌─────────────────────────────┐
│     🕐 10:26:45            │
│     Montag, 13. April      │
├─────────────────────────────┤
│                             │
│     [█ SCHICHT STARTEN]     │  🟢 Yeşil
│     [■ SCHICHT ENDE]       │  🔴 Kırmızı (aktifken)
│                             │
├─────────────────────────────┤
│  ⏸ PAUSE       00:12:34   │
│  ⏰ ALARM        [kur]     │
├─────────────────────────────┤
│  Giriş: 08:00   Çıkış: --- │
│  Geçen: 02:26:45          │
│                             │
│  [📊 AY DETAYI]           │
└─────────────────────────────┘
```

### 2. Verlauf (Geçmiş)
```
┌─────────────────────────────┐
│  📋 VERLAUF - KW16         │
├─────────────────────────────┤
│  Mo 31.03                   │
│  08:00 → 16:30  = 8.50h    │
│  Normal: 8.50h    💰 127.50€│
├─────────────────────────────┤
│  Di 01.04                   │
│  22:00 → 06:00 = 8.00h     │
│  🌙 Nacht: 8.00h (+25%)     │
│  💰 150.00€                │
├─────────────────────────────┤
│  So 06.04                   │
│  10:00 → 18:00 = 8.00h     │
│  📅 Sonntag: 8.00h (+50%)   │
│  💰 180.00€                │
└─────────────────────────────┘
```

### 3. Übersicht (İstatistikler)
```
┌─────────────────────────────┐
│  📊 ÜBERSICHT - APRİL     │
├─────────────────────────────┤
│  Sollstunden: 125,96h     │
│  ████████████░░░░  78%     │
│  Geleistet: 98,50h         │
│                             │
│  Stundensaldo: +5,46h       │
│                             │
├─────────────────────────────┤
│  💰 LOHN                    │
│  ────────────────           │
│  Normal:  78.00h  @ 15€    │
│  Nacht:   12.00h  @ 18.75€ │
│  Sonntag:  8.50h  @ 22.50€ │
│  ────────────────           │
│  Brutto:  1.845,00€        │
│  netto:   1.252,00€        │
└─────────────────────────────┘
```

---

## ⏱️ Zaman Hesaplama Kuralları

### Normal Saat (Base)
- 06:00 - 22:00 arası
- Saat başına ücret

### Nachtzone (+25%)
- 22:00 - 06:00 arası
- %25 zamlı

### Sonntagszone (+50%)
- Pazar günleri (Sonntag)
- %50 zamlı

### Mola (Pause)
- Otomatik düşülür
- Molalı net çalışma saati

---

## 💰 Kazanç Hesaplama

```
Brutto = (NormalSaat × BasisStundenlohn) 
       + (NachtStunden × 1.25) 
       + (SonntagStunden × 1.50)

Netto ≈ Brutto × 0.68 (vergi kesintisi)
```

### Örnek Hesaplama
```
Basis: 15€/saat
8 saat normal:      8 × 15 = 120€
4 saat gece:        4 × 18.75 = 75€  (+25%)
2 saat pazar:       2 × 22.50 = 45€  (+50%)
─────────────────────────────
Toplam Brutto:              = 240€
Netto (×0.68):             = 163.20€
```

---

## 👥 Personel Listesi

| Pozisyon | Kısaltma | Ekip |
|----------|----------|------|
| Spülküche | SPÜ | B |
| Saucier | SAU | B |
| Entremetier | ENT | B |
| Gardemanger | GAR | B |
| Pizza | PIZ | B |
| Conference | CONF | B |

---

## 🏗️ Teknik Özellikler

### Stack
- **Frontend:** React + Vite + TypeScript
- **Styling:** TailwindCSS
- **State:** Zustand (localStorage persist)
- **PWA:** Service Worker + manifest
- **Mobile:** Capacitor (opsiyonel)

### Veri Modeli
```typescript
interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string | null;
  pauseMinutes: number;
  type: 'normal' | 'nacht' | 'sonntag' | 'nacht+sonntag';
}

interface Employee {
  id: string;
  name: string;
  position: string;
  team: string;
  hourlyRate: number;
  shifts: Shift[];
}
```

---

## 📱 Responsive Tasarım

| Breakpoint | Grid | Font |
|------------|------|------|
| Mobile (<640px) | 1 kolon | 14-16px |
| Tablet (640-1024) | 2 kolon | 16px |
| Desktop (>1024) | 3 kolon | 16-18px |

### Renk Paleti
```
Primary:   #1a1a2e (Koyu Lacivert)
Secondary: #16213e (Koyu Mavi)
Accent:    #e94560 (Kırmızı)
Success:   #0f9b0f (Yeşil)
Warning:   #f39c12 (Turuncu)
Text:      #eaeaea (Açık Gri)
Background:#0f0f23 (Koyu)
```

---

## 🔔 Alarm Sistemi

- Çıkış saati ayarlanabilir
- Bildirim + vibrasyon
- Alarm geçince sesli uyarı

---

## 📅 Takvim Görünümü

- Haftalık (KW) grid
- Renk kodlu vardiyalar
- Tıkla → detay gör

---

## ✅ Yapılacaklar

- [x] SPEC.md oluştur
- [ ] Proje yapısı kur (React + Vite + TS)
- [ ] Zustand store + localStorage
- [ ] Ana ekran (Schicht)
- [ ] Geçmiş ekranı (Verlauf)
- [ ] İstatistik ekranı (Übersicht)
- [ ] Alarm sistemi
- [ ] Kazanç hesaplama
- [ ] Personel seçimi
- [ ] PWA manifest + SW
- [ ] Build + deploy
