// Belief decomposition script for Finansavisen profiles
// Takes bio text + stock data, decomposes into atomic beliefs, POSTs to Cogniti

const profiles = [
  {
    id: 1257,
    name: "John Fredriksen",
    rank: 1,
    age: 82,
    industry: "Shipping",
    title: "Gründer og eier i Hemen Holding",
    stockValue: "27,45 mrd",
    stockCount: 16,
    biggestHolding: "MOWI",
    boughtSold: "1,27 mrd / 2,47 mrd",
    wealthChange: "+3,44%",
    birthDate: "11. mai 1944",
    residence: "Kypros",
    education: "Handelsgymnas",
    bio: [
      "John Fredriksen (født 11. mai 1944 i Oslo) antas å være verdens største tankreder, og er storeier i flere børsnoterte foretak. Han bygde i 1980-årene opp en stor formue gjennom shippingvirksomhet fra baser i Storbritannia, og senere Kypros.",
      "Fredriksen er oppvokst på Etterstad i Oslo, og har ingen formell studiekompetanse utover gymnas. Sveisersønnen fra Oslo øst begynte som bud i skipsmeglerfirmaet Blehr & Tenvig i 1961. Der sluttet han som 20-åring og gikk over til en tankmegler og investerte til en viss grad selv, i tillegg til meglingen. Dermed kunne han innkassere den første millionen rundt 1967 – bare 23 år gammel.",
      "Tidlig på 1980-tallet vokste Fredriksen seg stor på oljefrakt i konfliktsoner. Han tilbød frakttjenester der ingen andre våget.",
      "Det er velkjent at Fredriksen har et vanskelig forhold til norske myndigheter. Hovedgrunnen er straffesaken for over 30 år siden. I 1986 satt han 113 dager i varetekt, siktet for å ha stjålet råolje fra fraktkundene og brukt det som drivstoff for egne tankbåter. I 1990 ble saken henlagt. Men opplevelsen er ikke glemt for Fredriksen. Fengselsoppholdet påførte ham klaustrofobi.",
      "I 1996 overtok han det svenske tankrederiet Frontline og flyttet virksomheten til Norge. Så sent som i 2002 fikk han formuen sin halvert (i Kapitals verdianslag) etter de svakeste stortankratene på 15 år. Det ble spekulert i Frontlines evne til å betjene et låneforfall. Han slet også med selskapene Northern Oil og Northern Offshore.",
      "Etter år 2000 utvidet han til forretninger også innen andre bransjer. Han konsoliderte i fiskeoppdrettsbransjen og endte som storeier i oppdrettsselskapet Marine Harvest, i dag Mowi MOWI. Han har også bygget seg opp innen boreriggbransjen, med selskapet Seadrill SDRL, og innen bulk.",
      "Fredriksen var gift med Inger Astrup Fredriksen, som gikk bort i 2006. De har sammen tvillingdøtrene Kathrine Fredriksen og Cecilie Fredriksen. Fredriksen har overført en del av eierskapet til sine døtre, som også er aktive i farens forretningsvirksomhet.",
      "I 2001 kjøpte Fredriksen prakteiendommen The Old Rectory i Chelsea av sin greske rederkollega Theodore Angelopoulos. Han betalte 520 millioner kroner for gigantboligen på over 3.000 kvadratmeter i et av London aller mest fasjonable nabolag. Bare tre år senere skal russeren Roman Abramovitsj ha tilbudt Fredriksen 1,2 milliarder kroner for eiendommen. Men budet ble avslått. I ettertid har Kathrine og Cecilie kjøpt hver sin tilstøtende luksusbolig.",
      "Som utflyttet nordmann oppholder Fredriksen seg hovedsakelig i London eller på reise rundt om i verden på jakt etter den neste dealen. Når han er i Norge, er han på det norske avdelingskontoret på Aker Brygge i Oslo, men han legger også alltid inn flere dager til å fiske laks i norske elver.",
      "Fredriksen har i flere omganger donert penger til arbeidet mot kreft, både til Rikshospitalet og Radiumhospitalet. Beløpet dreier seg i alle fall om 100 millioner kroner de senere årene, kanskje mye mer. 50 av disse millionene ble donert bort på en serviett på Theatercafeen til daværende direktør Jan Vincents Johannessen på Radiumhospitalet i 2007.",
      "Knut Sogner, professor ved BI og ekspert på næringslivhistorie, uttalte til Finansavisen i forbindelse med Fredriksens 75-årsdag i 2018, at han må være den rikeste nordmannen noensinne, hvis man inflasjonsjusterer ved sammenligning med brødrene Peder Anker og Bernt Anker, som var rike på slutten av 1700-tallet og begynnelsen av 1800-tallet, og Thorvald Meyer, som i andre halvdel av 1800-tallet eide store deler av Oslo.",
      "Storeulv troner på toppen nok en gang. Etter store utbytter og salgsgevinster holder formuen seg stabil, men selv en økning på tre prosent betyr sju milliarder mer i formue for Norges suverent rikeste. Den kypriotiske statsborgeren er fortsatt den mest innflytelsesrike aktøren på Oslo Børs, med tunge posisjoner i flere børsgiganter. Shipping er fremdeles kjernen, med store eksponeringer innen tank, tørrlast, LNG, LPG og supply gjennom Seatankers, som har 31 nybygg på vei. Det siste året har Fredriksen også gjort betydelige kjøp i Star Bulk, Dof Group og Valaris. Midt i geopolitisk uro sitter han med rekordstor kontantbeholdning, og mange spekulerer i hvor neste storsatsing kommer."
    ]
  },
  {
    id: 830,
    name: "Torstein Hagen",
    rank: 2,
    age: 83,
    industry: "Hotell/Reiseliv",
    title: "Konsernsjef Viking Cruises",
    wealthChange: "+37,84%",
    birthDate: "1. jan 1943",
    residence: "Sveits",
    education: "Sivilingeniør",
    bio: [
      "Torstein Hagen er vokst opp i Nittedal, utdannet sivilingeniør fra NTNU og har en MBA fra Harvard Business School. Han startet karrieren som konsulent i McKinsey. Der kom han i kontakt med shipping- og cruisebransjen. Det var også som konsulent at han fikk appetitten på risiko, noe han ikke hadde hatt fra før.",
      "Etter hvert ble Hagen sjef i Bergenske Dampskibsselskab og leder for Royal Viking Line. Det har vært elleville opp- og nedturer innen business etter det og før elvecruiseselskapet Viking Cruises ble etablert. Det er tuftet på et russisk elvecruise hans eks-kone dro på, noen gode kontakter og Hagens forståelse av cruiseindustrien.",
      "Hovedkontoret til Viking Cruises er i Basel i Sveits. Selv bor Hagen i Luzern i alpelandet. Butikken styres også fra Bermuda og Los Angeles. Rederen har en stor leilighet på Tjuvholmen, men den er kun en investering. Jobben er hobbyen hans. Hagen har vært i stormen i mediene i den såkalte Drevland-saken og i forbindelse med skilsmisseoppgjøret med sin ekskone.",
      "Fra et lite rødt hus i Nittedal til dollarmilliardær, konkurs – og tilbake som dollarmilliardær, med god margin. Torstein Hagen har hatt en eventyrlig reise, og dagens formue springer ut av Viking Cruises. Rederiet ble børsnotert i 2024, og kursen har passert 60 dollar, noe som verdsetter selskapet til over 25 milliarder dollar. Hagen, som eier godt over halvparten, har dermed seilt opp til en formue på rett under 150 milliarder kroner. Han er den store jojoen på Kapitals 400-liste, men virker å trives i turbulensen. Satset alt på cruise – og traff perfekt. I dag styrer han en flåte på nær 90 high-end skip på verdens hav, innsjøer og fjorder."
    ]
  },
  {
    id: 695,
    name: "Ole Andreas Halvorsen",
    rank: 3,
    age: 65,
    industry: "Finans",
    title: "Hedgefondforvalter - Viking Global Investors",
    wealthChange: "+6,75%",
    bio: [
      "Ole Andreas Halvorsen, opprinnelig fra Borge ved Fredrikstad, har slått seg opp som en av verdens mest anerkjente og respekterte finansmenn. Han har de siste tiårene vært en gjenganger i diverse kåringer av verdens fremste forvalterne og tradere.",
      "Den tidligere marinejegeren har sin utdannelse fra sjøforsvaret, samt Williams College i Massachusetts og Stanford Graduate School of Business. Etter skolegangen arbeidet han i den internasjonale storbanken Morgan Stanley, før han siden innehadde flere ledende stillinger i det amerikanske hedgefondet Tiger Management Corp. Etter tiden i Tiger Management regnes Halvorsen som en protégé av den kjente (nå pensjonerte) forvalteren Julian Robertson, og en av hans \"tiger cubs\".",
      "I 1999 grunnla Halvorsen sitt eget hedgefond, Viking Global Investors, og fikk følge av to av sine tidligere kolleger, David Ott og Brian Olson. Viking Global Investors har kontorer i Greenwich i Connecticut, New York, Hong Kong, London og San Fransisco, og forvalter verdier for over 30 milliarder dollar.",
      "Halvorsen er bosatt i Darien, Connecticut, er gift og har tre barn. Det er ellers kjent at den relativt mediesky forvalteren er en meget habil skikjører.",
      "Etter et nytt sterkt år for Viking Global Investors har hedgefondforvalteren fra Fredrikstad, med base i Connecticut, klatret 17 plasser til 382. plass på Forbes' liste over verdens rikeste. Forbes anslår formuen til rundt åtte milliarder dollar, tilsvarende 81,6 milliarder kroner. Dette er også det beste estimatet Kapital kan gi. Halvorsen har bakgrunn fra marinejegerkommandoen og Stanford, før han startet i Tiger Management, hvor kallenavnet \"Tigergutt\" så dagens lys. Senere etablerte han Viking Global Investors, som nå forvalter 53 milliarder dollar – grunnlaget for formuen til Tigergutt fra Fredrikstad."
    ]
  },
  {
    id: 836,
    name: "Odd Reitan",
    rank: 4,
    age: 74,
    industry: "Handel",
    title: "Gründer og eier av Reitangruppen",
    wealthChange: "+10,39%",
    birthDate: "Ukjent",
    residence: "Trondheim",
    education: "Ukjent",
    bio: [
      "Bak Odd Reitans rufsete ytre skjuler det seg et petimeter av de sjeldne. Colonialmajoren bruker halvlangt, tjafsete hår og grått ti-dagers-skjegg nærmest for å dekke over en sjel med tellekanter. Men evnen til å stå på og flikke på detaljer har bragt ham langt i næringslivet og helt i toppsjiktet av Kapitals 400-rike liste.",
      "Sønnene Ole Robert og Magnus Reitan har vært med på å skape solide virksomheter og har gjennom årene ledet REMA 1000, Reitan Convenience og Reitan Kapital.",
      "Som ung gutt begynte pappa Odd å jobbe i foreldrenes kolonial i Trondheim og utviklet en ambisjon om å bygge opp en større dagligvarekjede basert på et lavpriskonsept. Først tenkte han lokalt i Trondheim og siden ble ambisjonen nasjonal. I dag leder han Reitangruppen som omsetter for nærmere 100 milliarder kroner innenfor fem forretningsområder og sysselsetter 37.000 mennesker i Norden og Baltikum.",
      "Mest verdifull er dagligvarekjeden Rema 1000 med nesten tusen utsalgssteder som ledes av Reitans sønn, Ole Robert. Men til tross for suksessen har Reitan blitt passert av Norgesgruppen som Norges største dagligvareaktør og deres lavpriskonsept Kiwi tar innpå Rema 1000 i omsetning og størrelse.",
      "Reitan er svært glad i flotte bygg og eier rundt 70 bygninger i midt-byen i Trondheim. Reitangruppens finansielle og kulturelle hovedsete ligger på Lade gård som var et maktsenter helt tilbake til vikingtiden.",
      "I 2019 realiserte Odd Reitan guttedrømmen om å renovere ærverdige Britannia Hotel og etter tre og et halvt år og 1,2 milliarder kroner stod hotellet ferdig i fordums prakt.",
      "Odd Reitan er gift for andre gang og har totalt fem barn. Han har en lidenskap for golf og spiller jevnlig på Byneset Golfklubb. Reitan har donert betydelige summer til veldedige formål, spesielt innen idrett og kultur.",
      "Gjennom Reitangruppen eier familien dagligvarekjeden REMA 1000, nærbutikk-kjeden Nærbutikken, og andre virksomheter innen eiendom, hotell og kapitalforvaltning."
    ]
  },
  {
    id: 1039,
    name: "Johan Johannson",
    rank: 5,
    age: 59,
    industry: "Handel",
    title: "Familien er hovedeier i Norgesgruppen",
    wealthChange: "+5,93%",
    bio: [
      "Johannson-familien har vært aktive innen grossistvirksomhet siden 1866, og eier og driver i dag den største aktøren i dagligvaresektoren i Norge. Sammen med sin far og onkel, Knut Hartvig Johannson og Torbjørn Johannson, eier Johan over 74 prosent av NorgesGruppen.",
      "Med en årlig omsetning på over 90 milliarder kroner og en markedsandel på 44 prosent er NorgesGruppen Norges største dagligvarekonsern. Konsernet består blant annet av dagligvarekjedene Kiwi, Meny, Joker og Spar, servicehandelskonseptene Mix, Deli de Luca, Jafs og engrosselskapet Asko.",
      "Mens nordmenn flest var opptatt av OL på Lillehammer i 1994, slo Knut Hartvig Johannson, Sverre Lorentzen og Sverre Leiro seg sammen og startet arbeidet med å danne butikkgiganten Norgesgruppen, et samarbeidsselskap for grossister og detaljister.",
      "Årsaken var at Norges daværende matkonge, Stein Erik Hagen, hadde avsluttet samarbeidet med Joh. Johannson. Dermed mistet grossisten om lag 40 prosent av omsetningen og sto igjen med en rekke regionale kjeder og enkeltstående butikker som kunder.",
      "I et sjeldent intervju med Nettavisen vedgår Johan Johannson at han har latt seg friste til å handle på Rema 1000. - Jeg har syndet én gang i mitt liv, og da var jeg innom en Rema-butikk ikke så langt unna der jeg bor og kjøpte én is. Det var veldig varmt den dagen, sier han med et smil.",
      "Med en eierandel på rundt 75 prosent kontrollerer Johan Johannson og familien Norges største dagligvareaktør, NorgesGruppen. Under paraplyen ligger kjeder som Kiwi, Meny, Joker og Spar, i tillegg til Kaffebrenneriet, Deli de Luca, Mix og Jafs, samt engrosgiganten Asko.",
      "Til tross for høy kostnadsvekst og redusert kjøpekraft leverte konsernet solide resultater, som gav et markant løft i formuen. Via Joh Johannson Eiendom eier familien også en betydelig eiendomsportefølje.",
      "De gode resultatene har samtidig gitt ringvirkninger i politikken, der Høyre, Venstre og FrP har mottatt donasjoner i forkant av valget."
    ]
  }
];

// Save profiles to a JSON file for the extraction script
require('fs').writeFileSync('/tmp/profiles.json', JSON.stringify(profiles, null, 2));
console.log(`Saved ${profiles.length} profiles`);
