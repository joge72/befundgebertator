// Normwerte für die CIDP-Auswertung.
// Hier die laboreigenen Grenzwerte eintragen. null = noch kein Wert,
// die davon abhängigen Kriterien werden dann nicht ausgewertet.
//
// Motorisch:
//   dml      obere Normgrenze distal-motorische Latenz (ms)
//   amp      untere Normgrenze distale CMAP-Amplitude, negativer Gipfel (mV)
//   nlg      untere Normgrenze motorische NLG (m/s), entweder eine Zahl für alle
//            Segmente oder eine Tabelle nach Alter. Jede Zeile gilt bis
//            einschließlich "alterBis", die erste Zeile ab "alterVon". Außerhalb
//            dieses Bereichs wird mit der nächstliegenden Zeile gerechnet und
//            gewarnt. Die Segmente heißen nach dem
//            proximalen Stimulationsort:
//              medianus  ell = Handgelenk–Ellenbogen, ax = Ellenbogen–Axilla, erb = Axilla–Erb
//              ulnaris   ue = Handgelenk–unterhalb Sulcus, oe = über den Sulcus,
//                        ax = oberhalb Sulcus–Axilla, erb = Axilla–Erb
//              peroneus  fk = Fußrist–unterhalb Fibulaköpfchen, kk = über das Fibulaköpfchen
//              tibialis  kk = Innenknöchel–Kniekehle
//   fLatenz  obere Normgrenze minimale F-Wellen-Latenz (ms) bei distaler
//            Stimulation, als Zahl oder Tabelle nach Körpergröße (von "groesseVon"
//            bis einschließlich "groesseBis" cm, außerhalb wie beim Alter)
//
// Sensibel:
//   amp      untere Normgrenze SNAP-Amplitude (µV)
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
        { alterVon: 20, alterBis: 30, ell: 51, ax: 51, erb: 53 },
        { alterBis: 40, ell: 49, ax: 49, erb: 53 },
        { alterBis: 50, ell: 46, ax: 46, erb: 53 },
        { alterBis: 60, ell: 44, ax: 44, erb: 53 },
        { alterBis: 70, ell: 42, ax: 42, erb: null },
      ],
      fLatenz: 31.0,
    },
    // Blatt 2/7
    ulnaris: {
      dml: 3,
      amp: 4,
      nlg: [
        { alterVon: 20, alterBis: 30, ue: 45, oe: 40, ax: 46, erb: 58 },
        { alterBis: 40, ue: 44, oe: 40, ax: 45, erb: 58 },
        { alterBis: 50, ue: 44, oe: 39, ax: 44, erb: 58 },
        { alterBis: 60, ue: 43, oe: 39, ax: 43, erb: null },
        { alterBis: 70, ue: 42, oe: 38, ax: 42, erb: null },
      ],
      fLatenz: 31.0, // Stimulation am Ellenbogen: 26,2 ms (bestätigt, derzeit nicht verwendet)
    },
    // Blatt 3/7
    peroneus: {
      dml: 5,
      amp: 3,
      nlg: [
        { alterVon: 20, alterBis: 30, fk: 43, kk: 43 },
        { alterBis: 40, fk: 42, kk: 42 },
        { alterBis: 50, fk: 40, kk: 40 },
        { alterBis: 60, fk: 39, kk: 39 },
        { alterBis: 70, fk: 38, kk: 38 },
      ],
      fLatenz: [
        { groesseVon: 147, groesseBis: 160, wert: 52.7 },
        { groesseBis: 175, wert: 56.9 },
        { groesseBis: 193, wert: 61.2 },
      ],
    },
    // Blatt 4/7
    tibialis: {
      dml: 6,
      amp: 3,
      nlg: [
        { alterVon: 20, alterBis: 30, kk: 42 },
        { alterBis: 40, kk: 40 },
        { alterBis: 50, kk: 39 },
        { alterBis: 60, kk: 37 },
        { alterBis: 70, kk: 35 },
      ],
      fLatenz: [
        { groesseVon: 147, groesseBis: 160, wert: 54.5 },
        { groesseBis: 175, wert: 58.0 },
        { groesseBis: 193, wert: 63.6 },
      ],
    },
  },
  sensibel: {
    medianus: {
      amp: 6.9,
      nlg: [
        { alterVon: 20, alterBis: 30, wert: 53 },
        { alterBis: 40, wert: 50 },
        { alterBis: 50, wert: 47 },
        { alterBis: 60, wert: 44 },
        { alterBis: 70, wert: 41 },
      ],
    },
    // Blatt 2/7 (SNAP-Amplitude handschriftlich von 5,8 auf 7 korrigiert, bestätigt)
    ulnaris:  { amp: 7, nlg: 44 },
    // Blatt 7/7
    radialis: { amp: 16.0, nlg: 55.0 },
    suralis:  { amp: 10.0, nlg: 40.6 },
    cutaneusAntebrachiiLateralis: { amp: 12.0, nlg: 57.0 },
    cutaneusFemorisLateralis: { amp: 4.0, nlg: 43.0 },
    peronaeusSuperficialis: { amp: 10.0, nlg: 40.0 },
  },
  // MEP-Rechner (Excel): obere Normgrenze der zentralmotorischen Leitungszeit (ms)
  mep: {
    adm: { zml: 7.86 },
    ah: { zml: 17.99 },
  },
  // Blatt 5/7 und Ergänzung: Leitzeit nach Stimulation am Erb'schen Punkt (bzw. N. femoralis
  // in der Leiste) als obere Normgrenze je Distanz (cm), SPA als untere Normgrenze (mV).
  // Zwischen den Distanzen wird linear interpoliert.
  proximal: {
    suprascapularisSupraspinatus: { leitzeit: [{ distanz: 8.5, wert: 3.3 }, { distanz: 10.5, wert: 3.4 }], amp: null },
    suprascapularisInfraspinatus: { leitzeit: [{ distanz: 14.0, wert: 4.4 }, { distanz: 17.0, wert: 4.4 }], amp: null },
    axillaris: { leitzeit: [{ distanz: 15.5, wert: 5.3 }], amp: 10 },
    musculocutaneus: { leitzeit: [{ distanz: 20.0, wert: 5.8 }, { distanz: 24.0, wert: 5.9 }, { distanz: 28.0, wert: 6.0 }], amp: 5 },
    radialisTriceps: { leitzeit: [{ distanz: 21.5, wert: 5.5 }, { distanz: 26.5, wert: 5.9 }, { distanz: 31.5, wert: 6.3 }], amp: 8 },
    femoralis: { leitzeit: [{ distanz: 14.0, wert: 4.6 }, { distanz: 30.0, wert: 7.2 }], amp: null },
  },
};

if (typeof module !== 'undefined') module.exports = NORMWERTE;
