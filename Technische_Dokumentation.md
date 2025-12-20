\# \*\*Technische Dokumentation: Deus ex CT WebApp v1.0\*\*



\## \*\*Architekturübersicht\*\*



Die Anwendung ist eine \*\*Serverless Single-Page Application (SPA)\*\*, die vollständig im Browser des Clients ausgeführt wird. Sie basiert auf \*\*React 18\*\* und nutzt \*\*Tailwind CSS\*\* für das Styling.



\### \*\*Kern-Technologien\*\*



\* \*\*Runtime:\*\* Browser (Client-Side Rendering)  

\* \*\*Framework:\*\* React 18 (via UMD Builds, kein Build-Step notwendig)  

\* \*\*Transpiler:\*\* Babel Standalone (In-Browser JSX Kompilierung)  

\* \*\*Styling:\*\* Tailwind CSS (JIT via CDN)  

\* \*\*Icons:\*\* Lucide Icons



\### \*\*Dateistruktur \& Datenfluss\*\*



Die gesamte Logik residiert in einer einzigen Datei (index.html), um das Deployment auf Shared Hosting (IONOS) maximal zu vereinfachen.



1\. \*\*Datenhaltung:\*\*  

&nbsp;  \* Alle Track-Metadaten sind im konstanten Array TRACKS definiert.  

&nbsp;  \* Pfade werden dynamisch basierend auf einer konsistenten Nomenklatur generiert (BASE\\\_URL \\+ /assets/...).  

2\. \*\*State Management:\*\*  

&nbsp;  \* trackIndex: Index des aktuellen Songs im Array.  

&nbsp;  \* mode: 'audio' vs. 'video' (steuert Layout und Rendering).  

&nbsp;  \* isPlaying: Globaler Playback-Status.  

&nbsp;  \* minimized: Status der Control-Bar (bool).



\### \*\*Wichtige Komponenten \& Logik\*\*



\#### \*\*1\\. Audio Engine (useAudioPlayer Hook)\*\*



Dieser Custom Hook kapselt das HTML5 \\<audio\\> Element. Er verwaltet Play/Pause, TimeUpdates und Error-Handling.



\* \*\*Besonderheit:\*\* Er ist vom DOM entkoppelt (via new Audio()), rendert aber Updates in den React State, um die UI (Slider) zu synchronisieren.



\#### \*\*2\\. Video Synchronisation\*\*



Im 'Video'-Modus wird ein \\<video\\> Element gerendert, aber \*\*stummgeschaltet\*\*.



\* \*\*Logik:\*\* Ein setInterval Loop (200ms) prüft die Differenz zwischen audio.currentTime und video.currentTime.  

\* \*\*Korrektur:\*\* Wenn die Differenz \\> 0.3s beträgt, wird das Video hart auf die Audio-Zeit gesetzt. Dies garantiert Lippen-Synchronität auch bei schlechter Performance.



\#### \*\*3\\. Lyrics Engine (LyricsDisplay)\*\*



\* Lädt asynchron die .lrc Datei via fetch.  

\* Parst Zeitstempel (\\\[mm:ss.xx\\]) in Sekunden.  

\* Berechnet bei jedem currentTime Update den aktiven Index.  

\* Nutzt scrollIntoView mit behavior: 'smooth' für automatische Zentrierung der aktuellen Zeile.



\#### \*\*4\\. Mobile \& Touch Optimierung\*\*



\* \*\*Viewport:\*\* viewport-fit=cover und h-\\\[100dvh\\] verhindern Probleme mit der "Notch" und dynamischen Browser-Leisten auf iOS.  

\* \*\*Touch Targets:\*\* Alle interaktiven Elemente haben min. 44px² Klickfläche.  

\* \*\*Lockscreen:\*\* Die Media Session API (navigator.mediaSession) wird vollständig unterstützt, inkl. Cover-Art und Metadaten.



\### \*\*Performance Hinweise\*\*



\* \*\*Asset Loading:\*\* Bilder werden nicht preloaded, um Bandbreite zu sparen ("Lazy" Verhalten des Browsers).  

\* \*\*Animationen:\*\* Ausschließlich transform und opacity werden animiert, um GPU-Beschleunigung zu erzwingen und Reflows zu vermeiden.  

\* \*\*Cleanup:\*\* useEffect Hooks haben strikte Return-Funktionen, um EventListener (Maus, Touch, Audio) sauber zu entfernen und Memory Leaks zu verhindern.



\### \*\*Wartung\*\*



Um neue Songs hinzuzufügen:



1\. Dateien (MP3, WebP, MP4, LRC) in die entsprechenden assets Unterordner hochladen.  

2\. Das RAW\\\_TRACKS Array in index.html erweitern.

