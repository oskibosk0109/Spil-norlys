# Slik-Arenaen

Alle bruger det samme link. Medarbejdere vaelger blot deres navn.
Oskar-kontoen er beskyttet med en 4-cifret kode.

## Adgangskode
  Kode: 2731
Vaelger man Oskar i navnelisten, kommer der en kodeboks. Uden korrekt kode
faar man ingen adgang til Admin - hverken godkendelser, udbetaling,
nyt minefelt, ny saeson eller bestillingslisten.

Koden gemmes i browseren, saa du slipper for at taste den hver gang.
Under Admin nederst er der "Laas admin igen", hvis du forlader skaermen.

Koden tjekkes SERVER-SIDE i api/state.js - den kan ikke omgaas i browseren.
Vil du skifte kode: saet miljoevariablen ADMIN_PIN i Vercel
(Settings -> Environment Variables) og redeploy. Aendr samtidig
ADMIN_PIN oeverst i core.js (bruges kun naar app'en koerer uden server).

## Sadan tastes tal ind
1. Medarbejderen aabner "Mine tal" og udfylder salg, CSAT, KPT, wrap up
   og conformance. Appen viser straks hvor mange moenter det giver.
2. "Send til godkendelse" - moenterne udbetales ikke endnu.
3. Oskar logger ind med koden, ser koeen med en roed notifikation
   og trykker Godkend / Godkend alle / Afvis.

## Moentregler
  1 salg = 1 | 2 CSAT-femmere = 1 | KPT over 6,8 = 1
  Wrap up under 60 sek = 1 | Conformance over 80 % = 1
  3 dage i streak = +2
En typisk dag giver 7 moenter, ca. 38 paa en uge.

## Spillehallen (1 moent pr. tur)
  Minefeltet | Tetris | Lykkehjulet | Skydeteltet | Stabelspillet | Guldgraveren

## Kiosken (point)
  Sodavand 45 | Floedeboller 60 | Slikpose 72 | Energidrik 85 | Oreo 100 | Toffee Fee 120

## Deploy til Vercel
    npm i -g vercel
    cd <denne mappe>
    vercel
Derefter paa vercel.com:
  Storage -> Create Database -> Marketplace -> Upstash -> Redis -> Connect to Project
  og saa:  vercel --prod
Badgen oeverst skal vise "LIVE - ALLE SER DET SAMME".
