# 🍬 Slik-Arenaen — seks nye spil (oktober 2026)

Den eksisterende kode er uændret. De nye spil er lagt oven i efter opskriften i handoff-dokumentet (afsnit 10.2). Mønter, point, regler og kiosk bliver liggende, når du lægger den nye version op.

## Det er nyt

| Spil | Sådan virker det | Point eller mønter |
|---|---|---|
| 🐦 Flødebolle-flyveren | Flappy Bird. Mellemrum, pil op eller klik får flødebollen til at flyve op gennem hullerne. Banen bliver gradvist hurtigere. | 1 point pr. 4 huller, maks 6 pr. tur |
| 🐸 Over vejen | Crossy Road. 30 sekunder. Hop over veje og åer med piletasterne. | 1 point pr. 5 rækker, maks 6 pr. tur |
| 🍪 Småkage-klikkeren | Cookie Clicker. 30 sekunder. Klik på småkagen, og køb kagerulle, bedstemor og ovn undervejs. | 500 bagte småkager = 1 point, maks 6 pr. tur |
| 🎟️ Lotteriet | 1 mønt pr. lod. Oskar trækker vinderen i Admin, og vinderen får alle mønterne i puljen. | Flytter kun mønter |
| ✊ Sten, saks, papir | Udfordr en kollega eller hele holdet. Begge satser 1 mønt, vinderen tager begge. Uafgjort: begge får mønten tilbage. | Flytter kun mønter |
| 📊 Salgstippet | Gæt holdets salg i dag inden fristen (standard kl. 10). Oskar taster holdets resultat i Admin, og den, der er tættest på, får puljen. | Flytter kun mønter |

De tre arkadespil har et dagligt pointloft på 12 som standard, ligesom de andre spil. De tre andre flytter kun mønter mellem spillerne, så holdet bruger ikke mere slik af dem.

## Sådan lægger du den nye version op

Det er samme fremgangsmåde som i handoff-dokumentet (afsnit 9.1):

1. Pak zip-filen ud. Upload ikke selve zip-filen.
2. Repoet → **Add file** → **Upload files**. Træk de seks rodfiler ind: `index.html`, `styles.css`, `core.js`, `games.js`, `sync.js` og `package.json`. Klik på **Commit**.
3. Ret `api/state.js`: klik på filen → blyanten → erstat alt indholdet med den nye `api/state.js` → **Commit**.
4. Vent et minut. Starter Vercel ikke selv, så gå til **Deployments** → **Create Deployment** fra `main`.
5. Åbn `/api/state` i browseren. Svaret skal starte med `{"v":`.
6. Bed alle trykke Ctrl+F5.

Alle seks spil er åbne fra start. Vil du åbne dem ét ad gangen, så luk dem under **Admin → Spil og grænser**.

## Sådan bruger du dem i Admin

- **📊 Salgstippet:** Her sætter du fristen og en eventuel bundgrænse. Bundgrænsen er det laveste tip, man må give, fx holdets dagsmål. Når holdet ikke når den, går puljen videre til næste runde.
  - Efter fristen ser du alle tip. Tast holdets salg for dagen. Appen viser, hvem der vinder, før du trykker **Udbetal**.
  - Runden venter, indtil du har tastet tallet. Du kan også annullere en runde, så alle får deres mønt tilbage.
- **🎟️ Lotteriet:** Her ser du puljen og, hvem der har lodder. Du sætter, hvor mange lodder hver person højst må købe pr. runde (standard 10), og trykker **Træk vinder**.
- **✊ Sten, saks, papir:** Her ser du, hvem der har valgt en personlig kode, og du kan nulstille en kode.

**Tip ved start:** Bed alle vælge deres kode til Sten, saks, papir den første dag. Når man vælger en kode, kommer det i aktivitetsloggen. Dukker en besked op i ens navn, som man ikke selv har lavet, nulstiller du koden.

## Snydesikring

- **Arkadespil:** Serveren regner selv pointene ud fra resultatet og giver højst 6 point pr. tur. En tur kan kun give point én gang, og kun hvis der er betalt for den. Det daglige pointloft gælder stadig.
- **Småkage-klikkeren:** Klik ud over 12 i sekundet tæller ikke. Klik, der er lavet af et script, tæller heller ikke.
- **Salgstippet:**
  - Fristen styres af serverens ur i dansk tid og følger også vintertiden. Man kan ikke snyde ved at stille uret på sin PC.
  - Tallene er krypteret indtil fristen, så man ikke kan se dem, heller ikke ved at kigge i appens data.
  - Hver person har ét tip pr. dag. Det kan kun rettes fra den PC, man tippede fra.
  - Admin-kontoen kan ikke tippe, fordi det er den, der taster resultatet.
- **Sten, saks, papir:**
  - Ens valg er krypteret, indtil modstanderen har valgt.
  - Hver spiller bruger en personlig kode på 4 cifre, fordi mønterne går fra den ene til den anden. 5 forkerte forsøg låser koden resten af dagen.
  - Udfordringer, der ikke er besvaret, når dagen er slut, betales tilbage.
- **Det, der ikke kan lukkes uden login:** Man kan stadig vælge en kollegas navn og tippe eller købe lodder for dem. Så er det dog kollegaen, der har chancen for at vinde.

## Balance

Pointene er afprøvet med simulerede spillere med realistisk reaktionstid og usikkerhed:

| Spil | Almindelig spiller | Øvet spiller | Meget dygtig |
|---|---|---|---|
| 🐦 Flødebolle-flyveren | ca. 2,2 point pr. mønt | ca. 3,2 | ca. 4,9 |
| 🐸 Over vejen | ca. 1,4 | ca. 2,4 | ca. 3,3 |
| 🍪 Småkage-klikkeren (gode køb) | ca. 2,0 ved 5 klik/sek | ca. 3,0 ved 7 klik/sek | 6 ved 12 klik/sek |

Flyveren giver 1 point pr. 4 huller i stedet for de oprindeligt foreslåede 3, og Småkage-klikkeren giver 1 point pr. 500 bagte småkager i stedet for 420. Ellers ville øvede spillere få markant mere end i de andre spil. Hold øje med de første uger, og brug pointloftet under Admin, hvis et spil giver for meget.

## Teknisk (til den, der videreudvikler)

- **Nye handlinger i `api/state.js`:**
  - `lottoBuy`, `lottoDraw`, `lottoSave`
  - `rpsSetCode`, `rpsCheck`, `rpsChallenge`, `rpsAnswer`, `rpsCancel`, `rpsResetCode`
  - `tipSet`, `tipResult`, `tipCancel`, `tipCfg`
  - `tick`
  - De ligger samlet i `newAction()` under overskriften "NYE SPIL".
- **Nye felter i tilstanden:** `lotto`, `tip`, `rps`, `codes` og `rec` (rekorder med navn og dato for de nye arkadespil). Felterne oprettes af `upgrade()`, så den nye version kan lægges oven på produktionsdata. Ved **Afslut sæson** følger lotteriets maks-antal, salgstippets frist og bundgrænse samt koderne med.
- **Arkadespil:**
  - `spend` giver en billet (`p.tk`) til `fly`, `road` og `cookie`.
  - `score` kræver billetten og regner selv point ud via `NEWARC`.
  - De gamle spil bruger `spend` og `score` præcis som før.
- **Hemmeligheder:**
  - Tip og valg i sten-saks-papir krypteres med AES-GCM. Nøglen er afledt af databasens token og findes kun på serveren.
  - Koder gemmes som HMAC.
  - Skifter databasens token, kan gamle hemmeligheder ikke læses. Ventende tip og udfordringer betales så tilbage, og alle skal vælge en ny kode.
- **Oprydning:**
  - `housekeep()` kører før hver ny handling. Den afslører tip efter fristen og betaler udløbne udfordringer tilbage.
  - Browseren sender selv `tick`, når der er noget at rydde op.
  - Handlinger, der fejler, men har ryddet op, markeres med `save:true`, så oprydningen stadig gemmes. Det er den eneste ændring i request-flowet.
- **Dansk tid:** De nye spil bruger rigtig dansk tid (`Europe/Copenhagen`). De gamle spils dagsgrænse bruger stadig UTC+2 som før.
- **Afprøvet:** Følgende er afprøvet automatisk med en falsk database og en falsk browser:
  - alle handlinger og alle 9 udfald i sten-saks-papir
  - at mønterne går op
  - lodtrækningens vægtning
  - fristen i både sommer- og vintertid
  - alle sider og Admin
  - at de gamle spil virker som før
