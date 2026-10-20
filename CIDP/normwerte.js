// Normwerte für die CIDP-Auswertung.
// Hier die laboreigenen Grenzwerte eintragen. null = noch kein Wert,
// die davon abhängigen Kriterien werden dann nicht ausgewertet.
//
// Motorisch:
//   dml      obere Normgrenze distal-motorische Latenz (ms)
//   amp      untere Normgrenze distale CMAP-Amplitude, negativer Gipfel (mV)
//   nlg      untere Normgrenze motorische NLG (m/s), entweder eine Zahl für alle
//            Segmente oder eine Tabelle nach Alter. Jede Zeile gilt bis
//            einschließlich "alterBis"; die Segmente heißen nach dem
//            proximalen Stimulationsort:
//              medianus  ell = Handgelenk–Ellenbogen, ax = Ellenbogen–Axilla, erb = Axilla–Erb
//              ulnaris   ue = Handgelenk–unterhalb Sulcus, oe = über den Sulcus,
//                        ax = oberhalb Sulcus–Axilla, erb = Axilla–Erb
//              peroneus  fk = Sprunggelenk–Fibulaköpfchen, kk = über das Fibulaköpfchen
//              tibialis  kk = Innenknöchel–Kniekehle
//   fLatenz  obere Normgrenze minimale F-Wellen-Latenz (ms) bei distaler
//            Stimulation, als Zahl oder Tabelle nach Körpergröße (bis einschließlich
//            "groesseBis" cm)
//
// Sensibel:
//   latenz   obere Normgrenze distale Latenz (ms)
//   amp      untere Normgrenze SNAP-Amplitude (µV)
//   ampAb60  optional: untere Normgrenze SNAP-Amplitude ab 60 Jahren (µV)
//   nlg      untere Normgrenze sensible NLG (m/s), als Zahl oder Tabelle nach
//            Alter ({ alterBis, wert })
//
// Die Grenzwerte für die distale CMAP-Dauer (Kriterium g) stehen in der
// Leitlinie selbst und sind in logik.js hinterlegt.

const NORMWERTE = {
  motorisch: {
    // Blatt 1/7, Normwerte modifiziert nach Stöhr & Ludin (Dr. Kranz, Dr. Zebenholzer)
    medianus: {
      dml: 4,
      amp: 4,
      nlg: [
        { alterBis: 30, ell: 51, ax: 51, erb: 53 },
        { alterBis: 40, ell: 49, ax: 49, erb: 53 },
        { alterBis: 50, ell: 46, ax: 46, erb: 53 },
        { alterBis: 60, ell: 44, ax: 44, erb: 53 },
        { alterBis: 120, ell: 42, ax: 42, erb: null },
      ],
      fLatenz: 31.0,
    },
    // Blatt 2/7
    ulnaris: {
      dml: 3,
      amp: 4,
      nlg: [
        { alterBis: 30, ue: 45, oe: 40, ax: 46, erb: 58 },
        { alterBis: 40, ue: 44, oe: 40, ax: 45, erb: 58 },
        { alterBis: 50, ue: 44, oe: 39, ax: 44, erb: 58 },
        { alterBis: 60, ue: 43, oe: 39, ax: 43, erb: null },
        { alterBis: 120, ue: 42, oe: 38, ax: 42, erb: null },
      ],
      fLatenz: 31.0,
    },
    peroneus: {
      dml: null,
      amp: null,
      nlg: [
        { alterBis: 30, fk: null, kk: null },
        { alterBis: 40, fk: null, kk: null },
        { alterBis: 50, fk: null, kk: null },
        { alterBis: 60, fk: null, kk: null },
        { alterBis: 120, fk: null, kk: null },
      ],
      fLatenz: [
        { groesseBis: 160, wert: null },
        { groesseBis: 175, wert: null },
        { groesseBis: 250, wert: null },
      ],
    },
    tibialis: {
      dml: null,
      amp: null,
      nlg: [
        { alterBis: 30, kk: null },
        { alterBis: 40, kk: null },
        { alterBis: 50, kk: null },
        { alterBis: 60, kk: null },
        { alterBis: 120, kk: null },
      ],
      fLatenz: [
        { groesseBis: 160, wert: null },
        { groesseBis: 175, wert: null },
        { groesseBis: 250, wert: null },
      ],
    },
  },
  sensibel: {
    medianus: {
      latenz: null,
      amp: 6.9,
      nlg: [
        { alterBis: 30, wert: 53 },
        { alterBis: 40, wert: 50 },
        { alterBis: 50, wert: 47 },
        { alterBis: 60, wert: 44 },
        { alterBis: 120, wert: 41 },
      ],
    },
    // Blatt 2/7 (SNAP-Amplitude handschriftlich von 5,8 auf 7 korrigiert)
    ulnaris:  { latenz: null, amp: 7, nlg: 44 },
    // Blatt 7/7
    radialis: { latenz: null, amp: 16.0, nlg: 55.0 },
    suralis:  { latenz: null, amp: 10.0, ampAb60: null, nlg: 40.6 },
  },
};

if (typeof module !== 'undefined') module.exports = NORMWERTE;
