# Deus ex CT WebApp - Implementierungsanleitung

Diese Anleitung beschreibt präzise, wie die "Deus ex CT" WebApp auf dem IONOS Webhosting Plus Paket bereitgestellt wird.

## 1. Vorbereitung

Stelle sicher, dass die Assets in exakt dieser Struktur auf dem Webspace unter `/Deus-ex-CT-WebApp` liegen:

```text
/Deus-ex-CT-WebApp
├── assets
│   ├── audio          (enthält 12 .mp3 Dateien)
│   ├── images         (enthält 13 .webp Dateien inkl. 00-Albumcover.webp)
│   ├── lyrics         (enthält 12 .lrc Dateien)
│   ├── video
│   │   ├── background (enthält 12 .mp4 Dateien)
│   │   ├── mid        (enthält 12 _mid.mp4 Dateien)
│   │   └── high       (enthält 12 _hq.mp4 Dateien)
│   └── downloads      (enthält Deus_ex_CT_Complete.zip & 12 einzelne Video-Zips)
└── index.html         (Die Hauptdatei)

```

**Wichtig:**

* Die Dateinamen (z.B. `01-Oberarzt_Dr_med_Placzek.mp3`) müssen exakt mit den Definitionen im Code (Zeile 116-127) übereinstimmen. Achte auf Groß-/Kleinschreibung!
* Prüfe, ob die Zips im Ordner `assets/downloads` wirklich dem Namensschema `[Dateiname]_Deus-Ex-CT_Lyrics-Videos_(HQ).zip` entsprechen. Falls sie anders heißen, müssen sie entweder umbenannt oder der Code in `index.html` angepasst werden.

## 2. Installation

1. **Datei erstellen:** Kopiere den vollständigen Code der `index.html` aus dem vorherigen Schritt.
2. **Upload:** Lade die `index.html` in das Stammverzeichnis deiner Subdomain (also direkt in `Deus-ex-CT-WebApp`).
3. **Berechtigung:** Stelle sicher, dass die Dateiberechtigungen (CHMOD) für Ordner auf **755** und Dateien auf **644** stehen.

## 3. IONOS Webhosting Optimierung

Da du das "Plus" Paket nutzt, aktiviere folgende Features im IONOS Control Center für maximale Performance:

1. **PHP Version:** Irrelevant für HTML, aber setze sie sicherheitshalber auf 8.2+.
2. **Performance Level:** Setze es auf Maximum (Level 5 oder höher), um RAM-Limits für gleichzeitige Zugriffe zu erhöhen.
3. **CDN:** Aktiviere das IONOS CDN für diese Subdomain, falls verfügbar. Das beschleunigt das Laden der MP3s und Videos enorm.
4. **HTTPS:** Stelle sicher, dass das SSL-Zertifikat aktiv ist und "SSL erzwingen" eingeschaltet ist.

## 4. Testprotokoll

Führe nach dem Upload folgende Tests durch:

* **Desktop:**
* Läd das Hintergrundvideo? (Es sollte ein Loop im Hintergrund laufen).
* Funktioniert der Download des "Gesamt-Albums" oben links im Menü?


* **Mobile (iOS/Android):**
* Starte einen Song und sperre den Bildschirm. Funktioniert die Steuerung (Pause/Weiter) über den Lockscreen?
* Tippe auf "Video" und drehe das Handy. Wird das Video korrekt angezeigt?
* Überlappen sich Elemente, wenn die URL-Leiste des Browsers ein/ausblendet? (Sollte durch `dvh` fixiert sein).



## 5. Troubleshooting

* **Audio spielt nicht:** Prüfe in der Browser-Konsole (F12), ob 404 Fehler für `.mp3` Dateien angezeigt werden. Meistens liegt es an Tippfehlern im Dateinamen.
* **Lyrics fehlen:** Prüfe, ob die `.lrc` Dateien UTF-8 kodiert sind.
* **Video ruckelt:** Das `mid` Video wird geladen. Prüfe, ob die Internetverbindung stabil ist. Für langsame Verbindungen ist das `mid` Format optimiert.
