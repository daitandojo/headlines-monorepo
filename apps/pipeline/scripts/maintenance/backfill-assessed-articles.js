/**
 * @command maintenance:backfill-assessed
 * @group Maintenance
 * @description Backfills the database with articles that were assessed but not saved in a previous run, preventing costly reprocessing.
 */
import mongoose from 'mongoose'
import colors from 'ansi-colors'
import { initializeScriptEnv } from '../seed/lib/script-init.js'
import { logger } from '@headlines/utils-shared'
import { bulkWriteArticles, getAllSources } from '@headlines/data-access'

// --- START: Paste the JSON array of articles here ---
const ARTICLES_TO_BACKFILL = [
  {
    headline: 'Norsk advokatgigant lurer på dansk ekspansion - 7 oktober 2025',
    newspaper: 'InsideBusiness',
    link: 'https://insidebusiness.dk/nyheder/artikel/193910',
  },
  {
    headline:
      'Nordea Pension nærmer sig storkundejagt, men der er stadig ingen prismodel på plads',
    newspaper: 'InsideBusiness',
    link: 'https://insidebusiness.dk/nyheder/artikel/193915',
  },
  {
    headline: 'Pensionskasser får milliardtab på britisk eventyr - 7 oktober 2025',
    newspaper: 'InsideBusiness',
    link: 'https://insidebusiness.dk/nyheder/artikel/193911',
  },
  {
    headline: 'Spænding om kasernebyggeri tæt på kulmination - 2 oktober 2025',
    newspaper: 'InsideBusiness',
    link: 'https://insidebusiness.dk/nyheder/artikel/193859',
  },
  {
    headline: '7. oktober 2025 Dansk virksomhed investerer i ukrainsk forsvarsproduktion',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/erhverv/article18635813.ece',
  },
  {
    headline:
      '6. oktober 2025 Akson Robotics får investering og Matchlån til global vækst',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/erhverv/article18632615.ece',
  },
  {
    headline:
      '2. oktober 2025 Danmark lancerer verdens største kvantefond med Eifo og Novo Holdings som ankerinvestorer',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/fonde/article18617834.ece',
  },
  {
    headline: 'Analyse: Pensionskasser risikerer at blive efterladt på perronen',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/pension/article18619625.ece',
  },
  {
    headline:
      'Investeringsselskab med dansker i front sender trecifret millionbeløb i britisk brintselskab',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/investering/article18632789.ece',
  },
  {
    headline:
      'Cleantech-virksomhed jagter 600 millioner kroner til planlagt børsnotering',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/kapitalrejsning/article18625904.ece',
  },
  {
    headline:
      'Pensam-direktør vil have staten på banen som fødselshjælper til investeringer i Danmark',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/pension/article18629003.ece',
  },
  {
    headline:
      'Pensionssektorens kamp for afkast er tegnet skarpt op: "Det bliver helt afgørende"',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/pension/article18629555.ece',
  },
  {
    headline: 'Kapitalfonde i stort comeback efter rentechok for år tilbage',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/kapitalfonde/article18620040.ece',
  },
  {
    headline: 'Tidligere Coop-topchef rykker ind i bestyrelsen i Freetrailer',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/navne/article18630719.ece',
  },
  {
    headline: 'Suger venturekapital til sig: DTU søsætter ny enhed',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/uddannelse/article18629918.ece',
  },
  {
    headline: 'Kapitalfondsejet dansk dronebekæmper åbner ny fabrik i USA',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/erhverv/article18630662.ece',
  },
  {
    headline: 'Nystartet M&A-kontor vil være forlænget investeringsarm for kapitalfonde',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/ma/article18625400.ece',
  },
  {
    headline: 'International profil bliver ny partner i dansk ventureselskab',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/navne/article18627887.ece',
  },
  {
    headline:
      'Erfaren investor arbejder på de indre linjer: Vil rejse nye milliarder til investeringer',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/investering/article18627140.ece',
  },
  {
    headline:
      'Henter ny investeringsdirektør hos EY: Kapitalfond styrker fokus på forsyningssektoren',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/navne/article18625220.ece',
  },
  {
    headline: 'Conscia ændrer organisationen efter grønt lys til opkøb',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/erhverv/article18624137.ece',
  },
  {
    headline: 'Aerbio henter "bridge-lån" og gearer op for kapitalrejsning til efteråret',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/kapitalrejsning/article18624116.ece',
  },
  {
    headline: 'Bør eksterne investorer kunne eje advokathuse? Advokater er splittede',
    newspaper: 'KapitalWatch',
    link: 'https://kapwatch.dk/nyheder/branche/article18620849.ece',
  },
  {
    headline:
      'Halberg-familiens topchef melder om resultat som forventet - men på lavere niveau',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/erhverv/ECE18637782/halbergfamiliens-topchef-melder-om-resultat-som-forventet-men-paa-lavere-niveau/?ctxref=ext',
  },
  {
    headline: 'Dansk regntøjsfirma forventer ny vækst efter rekordregnskab',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/erhverv/ECE18637683/dansk-regntoejsfirma-forventer-ny-vaekst-efter-rekordregnskab/?ctxref=ext',
  },
  {
    headline: 'Dansk AI-startup får millionindsprøjtning til international ekspansion',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/erhverv/ECE18637083/dansk-aistartup-faar-millionindsprøjtning-til-international-ekspansion/?ctxref=ext',
  },
  {
    headline:
      'Snupper profil fra Nordea: Citi sætter to nye personer i spidsen for nordisk afdeling',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/finans/ECE18637152/snupper-profil-fra-nordea-citi-saetter-to-nye-personer-i-spidsen-for-nordisk-afdeling/?ctxref=ext',
  },
  {
    headline:
      'Pensiondanmark insisterer på at "lede hårdt" efter gode investeringer i Danmark',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/finans/ECE18636501/pensiondanmark-insisterer-paa-at-lede-haardt-efter-gode-investeringer-i-danmark/?ctxref=ext',
  },
  {
    headline: 'Kapitalfonde: Bavarian Nordic skal ud på en større opkøbsjagt',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/erhverv/ECE18636405/kapitalfonde-bavarian-nordic-skal-ud-paa-en-stoerre-opkoebsjagt/?ctxref=ext',
  },
  {
    headline: 'Digitalt Alzheimers-firma får ny finansdirektør',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/erhverv/ECE18636453/digitalt-alzheimersfirma-faar-ny-finansdirektoer/?ctxref=ext',
  },
  {
    headline: 'Løgismose øger overskud trods dalende salg',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/erhverv/ECE18636282/loegismose-oeger-overskud-trods-dalende-salg/?ctxref=ext',
  },
  {
    headline: 'CIP-ejet biogasselskab henter ny direktør fra vindindustrien',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/erhverv/ECE18635879/cipejet-biogasselskab-henter-ny-direktoer-fra-vindindustrien/?ctxref=ext',
  },
  {
    headline:
      'Klumme: Homo Economicus er død. Længe leve den emotionelt motiverede køber',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/debat/ECE18620245/klumme-homo-economicus-er-doed-laenge-leve-den-emotionelt-motiverede-koeber/?ctxref=ext',
  },
  {
    headline: 'Verdens største kvantefond lanceres: Oprustning og life science i fokus',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/erhverv/ECE18617834/verdens-stoerste-kvantefond-lanceres-oprustning-og-life-science-i-fokus/?ctxref=ext',
  },
  {
    headline: 'Investorer skyder tocifret milliardbeløb i ny lånefond til virksomheder',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/finans/ECE18617300/investorer-skyder-tocifret-milliardbeloeb-i-ny-laanefond-til-virksomheder/?ctxref=ext',
  },
  {
    headline: 'Eifo og Novo ankerinvestorer i verdens største kvantefond',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/erhverv/ECE18617507/eifo-og-novo-ankerinvestorer-i-verdens-stoerste-kvantefond/?ctxref=ext',
  },
  {
    headline: 'Droneovervågnings-firma melder udsolgt og er åben for investorer',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/erhverv/ECE18616196/droneovervaagningsfirma-melder-udsolgt-og-er-aaben-for-investorer/?ctxref=ext',
  },
  {
    headline: 'Freetrailer leverer rekordomsætning og tocifret vækst i indtjeningen',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/erhverv/ECE18615959/freetrailer-leverer-rekordomsaetning-og-tocifret-vaekst-i-indtjeningen/?ctxref=ext',
  },
  {
    headline: 'M&A-sultent advokathus ændrer selskabsform efter udvidelse',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/erhverv/ECE18615995/masultent-advokathus-aendrer-selskabsform-efter-udvidelse/?ctxref=ext',
  },
  {
    headline:
      'C.V. Obel-ejede Semco opruster til forsvarsordrer: "Vi ser ind i et voksende marked"',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/erhverv/ECE18615464/c-v-obelejede-semco-oprustrer-til-forsvarsordrer-vi-ser-ind-i-et-voksende-marked/?ctxref=ext',
  },
  {
    headline:
      'Innovativt digitalt medie booster vækst og mission i nyt stærkt partnerskab',
    newspaper: 'Finans.dk',
    link: 'https://finans.dk/partner/ECE18580049/innovativt-digitalt-medie-booster-vaekst-og-mission-i-nyt-staerkt-partnerskab/?ctxref=ext',
  },
  {
    headline:
      'Nu kan du spare penge hver måned på dit lån i boligen. Men det koster på den lange bane',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/nu-kan-du-spare-penge-hver-maaned-paa-dit-laan-i-boligen-men-det-koster-paa-den-lange-bane',
  },
  {
    headline: 'Jyske Bank stiger efter højere forventninger til indtjeningen',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/finans/jyske-bank-stiger-efter-hojere-forventninger-til-indtjeningen-1',
  },
  {
    headline: 'Højere priser på kød og ost puster til inflationen',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/okonomi/hojere-priser-paa-kod-og-ost-puster-til-inflationen',
  },
  {
    headline: 'Global økonomisk usikkerhed får sølvprisen til at sætte rekord',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/global-okonomisk-usikkerhed-faar-solvprisen-til-at-saette-rekord',
  },
  {
    headline: 'Ørsted-topchef varsler fyringsrunde inden nytår',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/baeredygtig/orsted-topchef-varsler-fyringsrunde-inden-nytaar',
  },
  {
    headline: 'Ørsted er i mål med aktiesalg for 60 milliarder kroner',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/baeredygtig/oersted-er-i-maal-med-aktiesalg-for-60-milliarder-kroner-1',
  },
  {
    headline: 'Aldrig har udbuddet af ejer­lejligheder i København været lavere',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/aldrig-har-udbuddet-af-ejerlejligheder-i-kobenhavn-vaeret-lavere',
  },
  {
    headline: 'Amerikanske aktier sætter nye rekorder',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/amerikanske-aktier-saetter-nye-rekorder-1',
  },
  {
    headline: 'Inflationen i eurozonen tager til',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/okonomi/inflationen-i-eurozonen-tager-til',
  },
  {
    headline:
      'Forskere løser gåde om, hvorfor vi flytter, som vi gør:  »Der er en skjult mekanisme på spil«',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/okonomi/forskere-loser-gaade-om-hvorfor-vi-flytter-som-vi-gor-der-er-en-skjult-mekanisme-paa-spil',
  },
  {
    headline: 'Norlys opsiger 137 medarbejdere i varslet fyringsrunde',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/virksomheder/norlys-opsiger-137-medarbejdere-i-varslet-fyringsrunde',
  },
  {
    headline: 'Flying Tiger vil åbne 130 nye butikker i Asien',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/virksomheder/flying-tiger-vil-aabne-130-nye-butikker-i-asien',
  },
  {
    headline:
      'Danskerne har fået flere penge mellem hænderne i hverdagen. Alligevel har de et stort problem',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/danskerne-har-faaet-flere-penge-mellem-haenderne-i-hverdagen-alligevel-har-de-et-stort-problem',
  },
  {
    headline: 'Nationalbanken nedjusterer vækstskøn for i år',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/okonomi/nationalbanken-nedjusterer-vaekstskon-for-i-aar-2',
  },
  {
    headline: 'Bolig­prisernes optur skaber panik blandt førstegangs­købere',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/boligprisernes-optur-skaber-panik-blandt-forstegangskobere',
  },
  {
    headline: 'Ørsted vinder stor juridisk sejr i USA',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/baeredygtig/orsted-vinder-stor-juridisk-sejr-i-usa',
  },
  {
    headline:
      'Han er Trumps mand på energi og dårligt nyt for Danmark:  »Han vil trække i alle de håndtag, han kan«',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/politik/han-er-trumps-mand-paa-energi-og-daarligt-nyt-for-danmark-han-vil-traekke-i-alle-de-haandtag-han-kan',
  },
  {
    headline: 'Forbrugernes pessimisme er den værste i to år',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/okonomi/forbrugernes-pessimisme-er-den-vaerste-i-to-aar',
  },
  {
    headline: 'Beskæftigelsen satte endnu en rekord i juli',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/okonomi/beskaeftigelsen-satte-endnu-en-rekord-i-juli',
  },
  {
    headline: 'Novo-aktien lukker i plus for femte dag i træk',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/novo-aktien-lukker-i-plus-for-femte-dag-i-traek',
  },
  {
    headline:
      'Mægler kalder det et »opsparet behov«: Nu ser vi noget, der kan puste liv i boligmarkedet',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/maegler-kalder-det-et-opsparet-behov-nu-ser-vi-noget-der-kan-puste-liv-i-boligmarkedet',
  },
  {
    headline:
      'Derfor var Skats køb af lækkede dokumenter ikke nyttesløst trods skuffende resultat',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/politik/derfor-var-skats-kob-af-laekkede-dokumenter-ikke-nytteslost-trods-skuffende-resultat',
  },
  {
    headline:
      'Dyr mad vækker stor bekymring – men problemet er mindre, end det har været',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/dyr-mad-vaekker-stor-bekymring-men-problemet-er-mindre-end-det-har-vaeret',
  },
  {
    headline:
      'Ørsteds plan overrasker analytiker: »Det her har de færreste nok set komme«',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/baeredygtig/orsteds-plan-overrasker-analytiker-det-her-har-de-faerreste-nok-set-komme',
  },
  {
    headline: 'ECB fastholder renten for andet rentemøde i træk',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/okonomi/ecb-fastholder-renten-for-andet-rentemode-i-traek',
  },
  {
    headline:
      'Novos investorer er begejstrede for de mange fyringer – det er der en særlig grund til',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/novos-investorer-er-begejstrede-for-de-mange-fyringer-det-er-der-en-saerlig-grund-til',
  },
  {
    headline: 'Novo-chef vil gennemføre massefyringer inden for nogle måneder',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/virksomheder/novo-chef-vil-gennemfoere-massefyringer-inden-for-nogle-maaneder',
  },
  {
    headline: 'Lundbeck omlægger og skærer 602 stillinger globalt',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/virksomheder/lundbeck-omlaegger-og-skaerer-602-stillinger-globalt',
  },
  {
    headline: 'Rentefald åbner døren for omlægning af femprocentslån',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/rentefald-aabner-doren-for-omlaegning-af-femprocentslaan',
  },
  {
    headline: 'Der var pæn fremgang i eksporten i juli',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/okonomi/der-var-paen-fremgang-i-eksporten-i-juli',
  },
  {
    headline:
      'Ikke-vestlige indvandrere kommer meget hurtigere i arbejde nu end tidligere',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/politik/ikkevestlige-indvandrere-kommer-meget-hurtigere-i-arbejde-nu-end-tidligere',
  },
  {
    headline:
      'Økonomisk gulerod virker meget bedre end forventet og gavner især én gruppe',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/okonomi/okonomisk-gulerod-virker-meget-bedre-end-forventet-og-gavner-isaer-en-gruppe',
  },
  {
    headline: 'Ørsted-aktionærer stemmer ja til kæmpe kapitaludvidelse',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/orsted-aktionaerer-stemmer-ja-til-kaempe-kapitaludvidelse',
  },
  {
    headline: 'Ørsted nedjusterer med en milliard på vigtig dag',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/orsted-nedjusterer-med-en-milliard-paa-vigtig-dag',
  },
  {
    headline: 'Virksomheder vil have medarbejdere tilbage på kontoret',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/ledelse/virksomheder-vil-have-medarbejdere-tilbage-paa-kontoret',
  },
  {
    headline: 'Der står færre boliger til salg i hele landet',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/der-staar-faerre-boliger-til-salg-i-hele-landet',
  },
  {
    headline: 'Sådan får du fingre i en andelsbolig i København',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/saadan-faar-du-fingre-i-en-andelsbolig-i-kobenhavn',
  },
  {
    headline:
      'Værelset til over 9.000 kroner på Østerbro forargede ham så meget, at han oprettede en Facebook-gruppe',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/vaerelset-til-over-9000-kroner-paa-osterbro-forargede-ham-saa-meget-at-han-oprettede-en-facebookgruppe',
  },
  {
    headline: 'Andelen af ledige lejeboliger er historisk lav',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/andelen-af-ledige-lejeboliger-er-historisk-lav',
  },
  {
    headline:
      'Nøgletal udgør på samme tid regeringens store forhåbning og store bekymring',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/politik/nogletal-udgor-paa-samme-tid-regeringens-store-forhaabning-og-store-bekymring',
  },
  {
    headline: 'Stephanie Lose ser fremgang i økonomien trods toldtrusler fra USA',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/politik/stephanie-lose-ser-fremgang-i-okonomien-trods-toldtrusler-fra-usa',
  },
  {
    headline: 'Indbetalinger til PFA skyder i vejret og rammer rekordniveau',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/finans/indbetalinger-til-pfa-skyder-i-vejret-og-rammer-rekordniveau',
  },
  {
    headline: 'Time for time:  Sådan er regeringens forslag til en finanslov',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/politik/time-for-time-saadan-er-regeringens-forslag-til-en-finanslov',
  },
  {
    headline: 'Politikerne skændes om de mindst vigtige årsager til de høje madpriser',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/politik/politikerne-skaendes-om-de-mindst-vigtige-aarsager-til-de-hoje-madpriser',
  },
  {
    headline: 'Ældre kan se frem til største stigning i folke­pension i 16 år',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/aeldre-kan-se-frem-til-storste-stigning-i-folkepension-i-16-aar',
  },
  {
    headline: 'Top­politikere i infight om årsagen til de høje madpriser',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/politik/toppolitikere-i-infight-om-aarsagen-til-de-hoje-madpriser',
  },
  {
    headline:
      'Huse fra en bestemt periode er i størst fare for at blive revet med af stormfloden',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/huse-fra-en-bestemt-periode-er-i-storst-fare-for-at-blive-revet-med-af-stormfloden',
  },
  {
    headline: 'Nyt fradrag undrer eksperter:  »I mine øjne er det udtryk for panik«',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/politik/nyt-fradrag-undrer-eksperter-i-mine-ojne-er-det-udtryk-for-panik',
  },
  {
    headline:
      'Ørsted-aktien lukker i laveste niveau nogensinde: 80 procent af værdien er væk',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/orsted-aktien-lukker-i-laveste-niveau-nogensinde-80-procent-af-vaerdien-er-vaek',
  },
  {
    headline: 'Antallet af dårlige betalere sætter bundrekord',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/antallet-af-daarlige-betalere-saetter-bundrekord',
  },
  {
    headline: "USA's regering beordrer pause på Ørsted-projekt",
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/baeredygtig/usas-regering-beordrer-pause-paa-orstedprojekt',
  },
  {
    headline: 'Ørsteds kursfald giver energikoncern underskud på en milliard',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/orsteds-kursfald-giver-energikoncern-underskud-paa-en-milliard',
  },
  {
    headline:
      'Huspriserne i to områder med seks kilometers afstand illustrerer det delte boligmarked',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/huspriserne-i-to-omraader-med-seks-kilometers-afstand-illustrerer-det-delte-boligmarked',
  },
  {
    headline: 'Norlys vil fyre op mod hver 10. i kundeselskab',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/virksomheder/norlys-vil-fyre-op-mod-hver-10-i-kundeselskab',
  },
  {
    headline: 'Dansk biotekkoncerns aktiekurs falder efter melding om aftagende salg',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/dansk-biotekkoncerns-aktiekurs-falder-efter-melding-om-aftagende-salg',
  },
  {
    headline: 'Høje fødevare­priser og usikkerhed giver dyk i forbruger­tilliden',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/okonomi/hoje-fodevarepriser-og-usikkerhed-giver-dyk-i-forbrugertilliden',
  },
  {
    headline: 'Beskæftigelsen fortsætter rekord­stime i juni',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/okonomi/beskaeftigelsen-fortsaetter-rekordstime-i-juni',
  },
  {
    headline: 'Hussalget stiger og sætter rekord i flere landsdele',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/hussalget-stiger-og-saetter-rekord-i-flere-landsdele',
  },
  {
    headline: 'Rockwool falder tungt efter nedjustering',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/rockwool-falder-tungt-efter-nedjustering',
  },
  {
    headline: 'Novo Nordisk indfører globalt stop for ikke-kritiske ansættelser',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/virksomheder/novo-nordisk-indfoerer-globalt-stop-for-ikkekritiske-ansaettelser',
  },
  {
    headline: 'Ekspert:  Rosenkrantz-Theils forslag kan få bolig­priserne til at falde',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/ekspert-rosenkrantztheils-forslag-kan-faa-boligpriserne-til-at-falde',
  },
  {
    headline: 'Finanstilsynet slår ned på Danske Banks hvidvaskkontrol',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/finans/finanstilsynet-slaar-ned-paa-danske-banks-hvidvaskkontrol',
  },
  {
    headline: 'Vestas-aktien stiger med 11 procent ved åbning',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/vestasakties-stiger-med-11-procent-ved-aabning',
  },
  {
    headline:
      'Statsministeren konfronterer høje madpriser: »Vi er jo i en vanvittig situation«',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/politik/statsministeren-konfronterer-hoje-madpriser-vi-er-jo-i-en-vanvittig-situation',
  },
  {
    headline: 'Trumps klapjagt rammer Danmark dobbelt',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/politik/trumps-klapjagt-rammer-danmark-dobbelt',
  },
  {
    headline: 'Ørsted falder voldsomt og lukker i laveste niveau nogensinde',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/orsted-falder-voldsomt-og-lukker-i-laveste-niveau-nogensinde',
  },
  {
    headline:
      '»Nu kan jeg nærmest ikke gå ind i Netto, uden at det koster 200 kroner. Jeg synes, det er absurd«',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/privatokonomi/nu-kan-jeg-naermest-ikke-gaa-ind-i-netto-uden-at-det-koster-200-kroner-jeg-synes-det-er-absurd',
  },
  {
    headline: 'Inflationen er igen over 2 procent',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/okonomi/inflationen-er-igen-over-2-procent',
  },
  {
    headline: 'Danmark får en meget lidt omtalt fordel af klima­forandringerne',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/okonomi/danmark-faar-en-meget-lidt-omtalt-fordel-af-klimaforandringerne',
  },
  {
    headline:
      '»Jeg har aldrig forestillet mig, at jeg skulle være sådan en, der var bange for at gå på arbejde«',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/ledelse/jeg-har-aldrig-forestillet-mig-at-jeg-skulle-vaere-saadan-en-der-var-bange-for-at-gaa-paa-arbejde',
  },
  {
    headline:
      'Ny topchef har fået god start:  Novo stryger til tops i C25 efter stærkt regnskab',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/ny-topchef-har-faaet-god-start-novo-stryger-til-tops-i-c25-efter-staerkt-regnskab',
  },
  {
    headline: 'Skuffende resultat fra konkurrent sender Novo-aktie op efter regnskab',
    newspaper: 'Borsen',
    link: 'https://borsen.dk/nyheder/investor/skuffende-resultat-fra-konkurrent-sender-novoaktie-op-efter-regnskab',
  },
  {
    headline:
      'Vanvittig eksplosion på ammunitionsfabrik i USA. Alt er væk, og ingen tør nærme sig',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/udland/art10398606/Vanvittig-eksplosion-p%C3%A5-ammunitionsfabrik-i-USA.-Alt-er-v%C3%A6k-og-ingen-t%C3%B8r-n%C3%A6rme-sig',
  },
  {
    headline: 'Oscar-vindende skuespiller Diane Keaton er død',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/kultur/art10398638/Oscar-vindende-skuespiller-Diane-Keaton-er-d%C3%B8d',
  },
  {
    headline: 'Boeing 737 er blevet føjet agterud: Her er verdens mest populære flytype',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/rejser/art10397750/Boeing-737-er-blevet-f%C3%B8jet-agterud-Her-er-verdens-mest-popul%C3%A6re-flytype',
  },
  {
    headline: 'USA-udsending til israelske gidsler: I kommer hjem',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/udland/art10398623/USA-udsending-til-israelske-gidsler-I-kommer-hjem',
  },
  {
    headline: 'Trump lover udbetaling af løn til soldater under nedlukning',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/udland/art10398622/Trump-lover-udbetaling-af-l%C3%B8n-til-soldater-under-nedlukning',
  },
  {
    headline: 'For første gang i 200 år er Parthenon fri for stillads',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/udland/art10398492/For-f%C3%B8rste-gang-i-200-%C3%A5r-er-Parthenon-fri-for-stillads',
  },
  {
    headline: 'Eksperter: Anne Linnet bryder loven med privat badeområde',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/danmark/art10398440/Eksperter-Anne-Linnet-bryder-loven-med-privat-badeomr%C3%A5de',
  },
  {
    headline:
      'Præsidenten bliver hevet ud af en sportshal. Nu har han 20 minutter til at forhindre et militærkup',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/kultur/film_og_tv/art10398462/Pr%C3%A6sidenten-bliver-hevet-ud-af-en-sportshal.-Nu-har-han-20-minutter-til-at-forhindre-et-milit%C3%A6rkup',
  },
  {
    headline: 'Norge fortsætter kursen mod VM med ny storsejr',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/sport/fodbold/art10398579/Norge-forts%C3%A6tter-kursen-mod-VM-med-ny-storsejr',
  },
  {
    headline: '20-årig gemmer på en hemmelighed: »Internettet glemmer aldrig«',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/danmark/art10398336/%C2%BBInternettet-glemmer-aldrig%C2%AB',
  },
  {
    headline: 'Skud affyret i tysk by - flere meldes såret',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/udland/art10398561/Skud-affyret-i-tysk-by-flere-meldes-s%C3%A5ret',
  },
  {
    headline:
      'Hun er blevet mor og har skrevet et album om det: Derfor skal man lytte til Oh Land lige nu',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/kultur/musik/art10398547/Hun-er-blevet-mor-og-har-skrevet-et-album-om-det-Derfor-skal-man-lytte-til-Oh-Land-lige-nu',
  },
  {
    headline: 'Gemke taber finsk semifinale mod verdens tredjebedste',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/sport/art10398542/Gemke-taber-finsk-semifinale-mod-verdens-tredjebedste',
  },
  {
    headline: 'Efter 500 dages arbejde: Regeringen vil komme med råd til danskerne',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/danmark/art10398538/Efter-500-dages-arbejde-Regeringen-vil-komme-med-r%C3%A5d-til-danskerne',
  },
  {
    headline: '26-årig er død efter soloulykke i Nordjylland',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/danmark/art10398522/26-%C3%A5rig-er-d%C3%B8d-efter-soloulykke-i-Nordjylland',
  },
  {
    headline: 'Hamas udelukker at overdrage våben som led i fredsplan',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/udland/art10398516/Hamas-udelukker-at-overdrage-v%C3%A5ben-som-led-i-fredsplan',
  },
  {
    headline:
      'Vi ved ikke, hvad dronemilliarder præcis skal gå til - men forsvarsministeren taler om »afgørende« våben',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/indland/art10398502/Vi-ved-ikke-hvad-dronemilliarder-pr%C3%A6cis-skal-g%C3%A5-til-men-forsvarsministeren-taler-om-%C2%BBafg%C3%B8rende%C2%AB-v%C3%A5ben',
  },
  {
    headline:
      '»Det er mit liv,« siger Mathias Bøcker om japanske samlerkort, der kan være en formue værd',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/danmark/art10398327/%C2%BBDet-er-mit-liv%C2%AB-siger-Mathias-B%C3%B8cker-om-japanske-samlerkort-der-kan-v%C3%A6re-en-formue-v%C3%A6rd',
  },
  {
    headline: 'Pogacar cementerer sin status som konge i Lombardiet',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/sport/cykling/art10398495/Pogacar-cementerer-sin-status-som-konge-i-Lombardiet',
  },
  {
    headline: 'Kvinde til hest kommer alvorligt til skade i ulykke ved Herning',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/danmark/art10398493/Kvinde-til-hest-kommer-alvorligt-til-skade-i-ulykke-ved-Herning',
  },
  {
    headline:
      'Er Trumps nyeste træk et taktisk slagnummer eller optakten til den endelige nedsmeltning?',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/udland/art10398491/Er-Trumps-nyeste-tr%C3%A6k-et-taktisk-slagnummer-eller-optakten-til-den-endelige-nedsmeltning',
  },
  {
    headline: 'Mand er død i trafikulykke med letbane',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/danmark/art10398485/Mand-er-d%C3%B8d-i-trafikulykke-med-letbane',
  },
  {
    headline:
      'Dronerne har forstyrret Europas luftrum i årevis. Men pludselig står truslen lysende klar',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/udland/art10398436/Dronerne-har-forstyrret-Europas-luftrum-i-%C3%A5revis.-Men-pludselig-st%C3%A5r-truslen-lysende-klar',
  },
  {
    headline: 'Mindst 60 meldes dræbt i droneangreb på flygtningelejr i Sudan',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/udland/art10398481/Mindst-60-meldes-dr%C3%A6bt-i-droneangreb-p%C3%A5-flygtningelejr-i-Sudan',
  },
  {
    headline:
      'Viceborgmester i Paris forsvarer rotterne: De kan løse et af byens helt store problemer',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/udland/art10398455/Viceborgmester-i-Paris-forsvarer-rotterne-De-kan-l%C3%B8se-et-af-byens-helt-store-problemer',
  },
  {
    headline: 'Runes overraskende overmand nedlægger også Djokovic',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/sport/tennis/art10398454/Runes-overraskende-overmand-nedl%C3%A6gger-ogs%C3%A5-Djokovic',
  },
  {
    headline: 'Mads Würtz vil give landevejsstjerner VM-baghjul på gruset',
    newspaper: 'Politiken',
    link: 'https://politiken.dk/sport/cykling/art10398285/Mads-W%C3%BCrtz-vil-give-landevejsstjerner-VM-baghjul-p%C3%A5-gruset',
  },
  {
    headline:
      'Bundlinjen styrtbløder – men ny topchef er ikke i tvivl: »Det her bliver stort«',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/business/bundlinjen-styrtbloeder-men-ny-topchef-er-ikke-i-tvivl-det-her-bliver',
  },
  {
    headline: 'Hovedvej er fortsat spærret efter aktivister i trætoppe',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/danmark/hovedvej-er-fortsat-spaerret-efter-aktivister-i-traetoppe',
  },
  {
    headline: 'Israelsk luftangreb i Libanon koster én livet',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/internationalt/israelsk-luftangreb-i-libanon-koster-en-livet',
  },
  {
    headline:
      'Hjemmearbejde eller ej:  Danske Bank og Solita sikrer trivsel og engagement',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/annonce/hjemmearbejde-eller-ej-danske-bank-og-solita-sikrer-trivsel-og-engagement',
  },
  {
    headline:
      'Knytnæven i Sofie Gråbøls ansigt har fået generationer til at hade én bestemt filmscene',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/kultur/knytnaeven-i-sofie-graaboels-ansigt-har-faaet-generationer-til-at-hade-en',
  },
  {
    headline: 'Svensk politibetjent sigtes for 22 seksuelle overgreb på børn',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/internationalt/svensk-politibetjent-sigtes-for-22-seksuelle-overgreb-paa-boern',
  },
  {
    headline: 'Folketingsmedlem fortæller om israelske skud og ydmygelser',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/internationalt/folketingsmedlem-fortaeller-om-israelske-skud-og-ydmygelser',
  },
  {
    headline:
      'USA sender 200 soldater til Israel for at følge våbenhvilen – giver Trump æren',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/internationalt/usa-sender-200-soldater-til-israel-for-at-foelge-vaabenhvilen-giver',
  },
  {
    headline: 'Læsø dropper valgplakater til kommunalvalg',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/politik/laesoe-dropper-valgplakater-til-kommunalvalg',
  },
  {
    headline: 'Hvad er det, der får en fornuftig dansk mand til at flytte til Sverige?',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/kommentarer/hvad-er-det-der-faar-en-fornuftig-dansk-mand-til-at-flytte-til',
  },
  {
    headline: 'Charlie Chaplins sidste film bliver nu udgivet',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/kultur/charlie-chaplins-sidste-film-bliver-nu-udgivet',
  },
  {
    headline: 'Æder fuglen uden at lande: Forskere afslører præcist, hvordan den gør det',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/viden/aeder-fuglen-uden-at-lande-forskere-afsloerer-praecist-hvordan-den-goer',
  },
  {
    headline: '45 år som journalist og endnu flere forude',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/navne/45-aar-som-journalist-og-endnu-flere-forude',
  },
  {
    headline: '1000 babyer får tarmbakterie i forskeres jagt på et sundere liv',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/viden/1000-babyer-faar-tarmbakterie-i-forskeres-jagt-paa-et-sundere-liv',
  },
  {
    headline:
      'Præsidenten bliver hevet ud af en sportshal. Nu har han 20 minutter til at forhindre et militærkup',
    newspaper: 'Berlingske',
    link: 'https://www.berlingske.dk/kultur/praesidenten-bliver-hevet-ud-af-en-sportshal-nu-har-han-20-minutter',
  },
  {
    headline:
      'Hjemmearbejde eller ej: Danske Bank og Solita sikrer trivsel og engagement',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/annonce/sponsoreret/ECE18617887/hjemmearbejde-eller-ej-danske-bank-og-solita-sikrer-trivsel-og-engagement/?ctxref=ext',
  },
  {
    headline: 'Anmeldelse: Sådan skaber almindelige mennesker ualmindelige resultater',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/kultur/litteratur/ECE18635834/anmeldelse-saadan-skaber-almindelige-mennesker-ualmindelige-resultater/?ctxref=ext',
  },
  {
    headline: 'Hvis en københavnerlejlighed var en aktie, ville du aldrig købe den',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/debat/blogs/mortenrolighed/ECE18631100/hvis-en-koebenhavnerlejlighed-var-en-aktie-ville-du-aldrig-koebe-den/?ctxref=ext',
  },
  {
    headline: "Vin: 70'ernes danskervin nummer ét er tilbage – nu også som orangevin",
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/livsstil/ECE18632612/vin-70ernes-danskervin-nummer-et-er-tilbage-nu-ogsaa-som-orangevin/?ctxref=ext',
  },
  {
    headline: 'Konkurrent efter historisk Novo-opkøb: Styrker troen på egne muligheder',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18632624/konkurrent-efter-historisk-novoopkoeb-styrker-troen-paa-egne-muligheder/?ctxref=ext',
  },
  {
    headline: 'Trump vil indføre yderligere 100 pct. told på Kina',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/international/ECE18632591/trump-vil-indfoere-yderligere-100-pct-told-paa-kina/?ctxref=ext',
  },
  {
    headline: 'Macron genudnævner Lecornu som Frankrigs premierminister',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/international/ECE18632516/macron-genudnaevner-lecornu-som-frankrigs-premierminister/?ctxref=ext',
  },
  {
    headline: 'Store fald på Wall Street efter Trumps toldtrusler',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18632483/store-fald-paa-wall-street-efter-trumps-toldtrusler/?ctxref=ext',
  },
  {
    headline: 'Endnu en medicinalkæmpe rygtes på vej med prisaftale i USA',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18632450/endnu-en-medicinalkaempe-rygtes-paa-vej-med-prisaftale-i-usa/?ctxref=ext',
  },
  {
    headline: 'Novo-profil stopper: »Det var min egen beslutning«',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18631853/novoprofil-stopper-det-var-min-egen-beslutning/?ctxref=ext',
  },
  {
    headline:
      'Medarbejdere kaldt tilbage på kontoret: Vigtigt nøgletal kan få Nationalbanken til at tøve',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18631988/medarbejdere-kaldt-tilbage-paa-kontoret-vigtigt-noegletal-kan-faa-nationalbanken-til-at-toeve/?ctxref=ext',
  },
  {
    headline: 'Trumps budgetchef: Fyringerne er begyndt',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/international/ECE18631940/trumps-budgetchef-fyringerne-er-begyndt/?ctxref=ext',
  },
  {
    headline: 'Analyse: Novo og rivalerne sværmer om MASH-diagnosen',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18629738/analyse-novo-og-rivalerne-svaermer-om-mashdiagnosen/?ctxref=ext',
  },
  {
    headline: 'Danmark køber 16 F-35-kampfly og investerer i Arktis',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/politik/ECE18629984/danmark-koeber-16-f35kampfly-og-investerer-i-arktis/?ctxref=ext',
  },
  {
    headline: 'Ny toldtrussel fra Trump sender Wall Street brat ned',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18629729/ny-toldtrussel-fra-trump-sender-wall-street-brat-ned/?ctxref=ext',
  },
  {
    headline: 'Europa/lukning: Trump satte trumf på nedtur efter nye toldtrusler',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18629672/europalukning-trump-satte-trumf-paa-nedtur-efter-nye-toldtrusler/?ctxref=ext',
  },
  {
    headline: 'Markedsoversigt: Jyske Banks opjustering lunede hos bankerne',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18629477/markedsoversigt-jyske-banks-opjustering-lunede-hos-bankerne/?ctxref=ext',
  },
  {
    headline: 'Trump truer med massiv øgning af told på kinesiske varer',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/international/ECE18629393/trump-truer-med-massiv-oegning-af-told-paa-kinesiske-varer/?ctxref=ext',
  },
  {
    headline: 'Fredagens aktier: Jyske Bank tog bankerne med i vejret efter opjustering',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18629366/fredagens-aktier-jyske-bank-tog-bankerne-med-i-vejret-efter-opjustering/?ctxref=ext',
  },
  {
    headline:
      'Lars Fruergaard: Trumps angreb på medicinpriserne i USA kan koste Novo dyrt',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18629252/lars-fruergaard-trumps-angreb-paa-medicinpriserne-i-usa-kan-koste-novo-dyrt/?ctxref=ext',
  },
  {
    headline:
      "USA/åbning: AI-appetit bag grøn start - Levi's straffes for skuffende salg",
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18629165/usaabning-aiappetit-bag-groen-start-levis-straffes-for-skuffende-salg/?ctxref=ext',
  },
  {
    headline: 'Novo stopper skelsættende satsning',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18628964/novo-stopper-skelsaettende-satsning/?ctxref=ext',
  },
  {
    headline: 'Søren Linding: Tiltrængt fornyelse i toppen af presset børsgigant',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/investor/ECE18627836/soeren-linding-tiltraengt-fornyelse-i-toppen-af-presset-boersgigant/?ctxref=ext',
  },
  {
    headline: 'Skjern Bank opjusterer forventningerne til 2025',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18628676/skjern-bank-opjusterer-forventningerne-til-2025/?ctxref=ext',
  },
  {
    headline: 'Krise skaber tvivl om mulig første kvindelige japanske premierminister',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/international/ECE18628469/krise-skaber-tvivl-om-mulig-foerste-kvindelige-japanske-premierminister/?ctxref=ext',
  },
  {
    headline: 'Lollands Bank opjusterer betragteligt',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18628373/lollands-bank-opjusterer-betragteligt/?ctxref=ext',
  },
  {
    headline: 'Ejer af dansk modegigant med ny plan: Nu er det nu i USA',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18628287/ejer-af-dansk-modegigant-med-ny-plan-nu-er-det-nu-i-usa/?ctxref=ext',
  },
  {
    headline:
      'Europa/aktier: Jyske Bank anfører stort indeks tæt på tredje rekord i streg',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18628281/europaaktier-jyske-bank-anfoerer-stort-indeks-taet-paa-tredje-rekord-i-streg/?ctxref=ext',
  },
  {
    headline: 'Topchef er bevidst om tendens: Kunderne betaler i dag mere for mindre',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18628245/topchef-er-bevidst-om-tendens-kunderne-betaler-i-dag-mere-for-mindre/?ctxref=ext',
  },
  {
    headline: 'Det nye Novo: Fredag markerer et vendepunkt',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18627797/det-nye-novo-fredag-markerer-et-vendepunkt/?ctxref=ext',
  },
  {
    headline:
      'Aktier/middag: Jyske Bank på rekordkurs efter opjustering og hævet kursmål',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18627680/aktiermiddag-jyske-bank-paa-rekordkurs-efter-opjustering-og-haevet-kursmaal/?ctxref=ext',
  },
  {
    headline:
      'Topchef har lært at værne om sin energi: Engang brændte hun alle sine weekender af',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18627065/topchef-har-laert-at-vaerne-om-sin-energi-engang-braendte-hun-alle-sine-weekender-af/?ctxref=ext',
  },
  {
    headline: 'Tryg-aktien falder efter regnskab: Finanshus ser hår i suppen',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18627443/trygaktien-falder-efter-regnskab-finanshus-ser-haar-i-suppen/?ctxref=ext',
  },
  {
    headline:
      'Kinesiske rederier vil skære halvdelen af sejltiden: Men vestlige konkurrenter står i vejen',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18627341/kinesiske-rederier-vil-skaere-halvdelen-af-sejltiden-men-vestlige-konkurrenter-staar-i-vejen/?ctxref=ext',
  },
  {
    headline: 'Netcompany valgt som digital partner af Hollands udenrigsministerium',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18627191/netcompany-valgt-som-digital-partner-af-hollands-udenrigsministerium/?ctxref=ext',
  },
  {
    headline: 'Søren Linding: Bavarian-aktionærer skal forberede sig på grusomme tal',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/investor/ECE18627092/soeren-linding-bavarianaktionaerer-skal-forberede-sig-paa-grusomme-tal/?ctxref=ext',
  },
  {
    headline:
      'Sydbank: Trygs forsikringsresultat bedre end ventet hjulpet af afløbsgevinster',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18627038/sydbank-trygs-forsikringsresultat-bedre-end-ventet-hjulpet-af-afloebsgevinster/?ctxref=ext',
  },
  {
    headline: 'Aktieåbning: Jyske Bank stiger til rekordhøjde',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18626960/aktieaabning-jyske-bank-stiger-til-rekordhojde/?ctxref=ext',
  },
  {
    headline: 'Mærsk kan se fragtraterne stige efter tre uger med fald',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18626786/maersk-kan-se-fragtraterne-stige-efter-tre-uger-med-fald/?ctxref=ext',
  },
  {
    headline: 'Obligationer: Renten falder efter åbning',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18626927/obligationer-renten-falder-efter-aabning/?ctxref=ext',
  },
  {
    headline: 'Gates-fonden og PAHO vil have billigere vægttabsmedicin til Brasilien',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18626885/gatesfonden-og-paho-vil-have-billigere-vaegttabsmedicin-til-brasilien/?ctxref=ext',
  },
  {
    headline: 'Superliga: Derfor går AGF igen glip af mesterskabet',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/sport/fodbold/superliga/ECE18626243/superliga-derfor-gaar-agf-igen-glip-af-mesterskabet/?ctxref=ext',
  },
  {
    headline: 'Tesla lancerer hidtil billigste bil i Danmark og Europa',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/biler/ECE18626605/tesla-lancerer-hidtil-billigste-bil-i-danmark-og-europa/?ctxref=ext',
  },
  {
    headline: 'Råvarer: Priserne på olie, guld og sølv falder efter våbenhvile',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18626456/raavarer-priserne-paa-olie-guld-og-soelv-falder-efter-vaabenhvile/?ctxref=ext',
  },
  {
    headline: 'Inflationen steg i september',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18626387/inflationen-steg-i-september/?ctxref=ext',
  },
  {
    headline: 'Trods stigende priser: Overskuddet falder hos forsikringskæmpe',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18626354/trods-stigende-priser-overskuddet-falder-hos-forsikringskaempe/?ctxref=ext',
  },
  {
    headline: 'Droner og global uro: Husk at tilpasse porteføljen løbende',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/investor/ECE18617807/droner-og-global-uro-husk-at-tilpasse-portefoeljen-loebende/?ctxref=ext',
  },
  {
    headline: 'Stressboom truer: 4 af 10 danskere mistrives mentalt',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/indland/ECE18626156/stressboom-truer-4-af-10-danskere-mistrives-mentalt/?ctxref=ext',
  },
  {
    headline: 'Hurtigt overblik: Her er morgenens vigtigste erhvervshistorier',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18626147/hurtigt-overblik-her-er-morgenens-vigtigste-erhvervshistorier/?ctxref=ext',
  },
  {
    headline: 'Israels regering godkender våbenhvile i Gaza og løsladelse af 50 gidsler',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/international/ECE18626084/israels-regering-godkender-vaabenhvile-i-gaza-og-losladelse-af-50-gidsler/?ctxref=ext',
  },
  {
    headline: 'Feds Barr varsler forsigtig tilgang til næste rentebeslutning',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18626027/feds-barr-varsler-forsigtig-tilgang-til-naeste-rentebeslutning/?ctxref=ext',
  },
  {
    headline: 'Københavns Lufthavn afventer udbud til indkøb af droneradar',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18625946/koebenhavns-lufthavn-afventer-udbud-til-indkoeb-af-droneradar/?ctxref=ext',
  },
  {
    headline: 'Ny europæisk grænsekontrol kan skabe trængsel i danske lufthavne',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/indland/ECE18625916/ny-europaeisk-graensekontrol-kan-skabe-traengsel-i-danske-lufthavne/?ctxref=ext',
  },
  {
    headline: 'Mærsks japanske rivaler går tilbage fredag',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18625901/maersks-japanske-rivaler-gaar-tilbage-fredag/?ctxref=ext',
  },
  {
    headline: 'Valuta: Euro under pres på baggrund af fortsat uro om fransk økonomi',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18625844/valuta-euro-under-pres-paa-baggrund-af-fortsat-uro-om-fransk-okonomi/?ctxref=ext',
  },
  {
    headline:
      'Kinesisk: Den pekingand er en selvstændig grund til ikke at tage hjem fra Østerbro',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/kultur/anmeldelser/restaurant/ECE18617822/kinesisk-den-pekingand-er-en-selvstaendig-grund-til-ikke-at-tage-hjem-fra-osterbro/?ctxref=ext',
  },
  {
    headline:
      'Asiatiske aktier: Store fald efter uge præget af fredsaftale og toldtrusler',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18625754/asiatiske-aktier-store-fald-efter-uge-praeget-af-fredsaftale-og-toldtrusler/?ctxref=ext',
  },
  {
    headline: 'Reform udskydes: Kryptoinvestorer risikerer skat af gevinst og tab',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18625712/reform-udskydes-kryptoinvestorer-risikerer-skat-af-gevinst-og-tab/?ctxref=ext',
  },
  {
    headline: 'Nu kommer verdens vigtigste regnskaber: Hold øje med disse',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18620894/nu-kommer-verdens-vigtigste-regnskaber-hold-oeje-med-disse/?ctxref=ext',
  },
  {
    headline:
      'Ørsted risikerer medarbejderflugt: »Kan blive et spørgsmål om at redde sig selv«',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18620888/orsted-risikerer-medarbejderflugt-kan-blive-et-spoergsmaal-om-at-redde-sig-selv/?ctxref=ext',
  },
  {
    headline: 'Vi skal gøre cybersikkerhed til Danmarks styrkeposition',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/debat/kronik/ECE18615962/vi-skal-goere-cybersikkerhed-til-danmarks-styrkeposition/?ctxref=ext',
  },
  {
    headline: 'Mandag rullede milliarderne ind - torsdag skulle der fyres',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18614486/mandag-rullede-milliarderne-ind-torsdag-skulle-der-fyres/?ctxref=ext',
  },
  {
    headline: 'USA/lukning: Nervøsitet for bobler fik investorerne til at tøve',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18614399/usalukning-nervositet-for-bobler-fik-investorerne-til-at-tove/?ctxref=ext',
  },
  {
    headline: 'Deutsche Bank ser guld og bitcoin som væsentlige centralbank-reserver',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18614372/deutsche-bank-ser-guld-og-bitcoin-som-vaesentlige-centralbankreserver/?ctxref=ext',
  },
  {
    headline: 'Danskerne optager langt færre banklån',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18614216/danskerne-optager-langt-faerre-banklaan/?ctxref=ext',
  },
  {
    headline: 'Olieprisfald accelererer efter fredsaftale i Mellemøsten',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18614138/olieprisfald-accelererer-efter-fredsaftale-i-mellemosten/?ctxref=ext',
  },
  {
    headline: 'Lars Fruergaard: Jeg skal ikke være topchef igen',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18613862/lars-fruergaard-jeg-skal-ikke-vaere-topchef-igen/?ctxref=ext',
  },
  {
    headline: 'Topchef om kraftig opjustering: »Bankkunderne i Danmark har det godt«',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18613619/topchef-om-kraftig-opjustering-bankkunderne-i-danmark-har-det-godt/?ctxref=ext',
  },
  {
    headline: 'Trump takker Egypten, Qatar og Tyrkiet for hjælp til Gaza-aftale',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/international/ECE18613400/trump-takker-egypten-qatar-og-tyrkiet-for-hjaelp-til-gazaaftale/?ctxref=ext',
  },
  {
    headline: 'Yen svækkes til svageste niveau siden februar',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18613274/yen-svaekkes-til-svageste-niveau-siden-februar/?ctxref=ext',
  },
  {
    headline:
      'Omsætningen hos B&O falder til laveste niveau i fem år – men der er fremgang at spore',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18613253/omsaetningen-hos-bo-falder-til-laveste-niveau-i-fem-aar-men-der-er-fremgang-at-spore/?ctxref=ext',
  },
  {
    headline:
      'Markederne reagerer nærmest ikke: Fredsaftale kan dog få positiv effekt på sigt',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18613247/markederne-reagerer-naermest-ikke-fredsaftale-kan-dog-faa-positiv-effekt-paa-sigt/?ctxref=ext',
  },
  {
    headline: 'Jyske Bank opjusterer kraftigt',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18613148/jyske-bank-opjusterer-kraftigt/?ctxref=ext',
  },
  {
    headline:
      'Torsdagens aktier: Mærsk trak i minus - negativ effekt af mulig fredsaftale i Gaza',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18613136/torsdagens-aktier-maersk-trak-i-minus-negativ-effekt-af-mulig-fredsaftale-i-gaza/?ctxref=ext',
  },
  {
    headline: 'Torsdagens obligationer: Meget marginalt renteplus',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18613133/torsdagens-obligationer-meget-marginalt-renteplus/?ctxref=ext',
  },
  {
    headline: 'SAS-kunder føler sig snydt efter coronaaflyste fly',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18612716/saskunder-foeler-sig-snydt-efter-coronaaflyste-fly/?ctxref=ext',
  },
  {
    headline: 'Ørsteds topchef fik det samme spørgsmål igen og igen efter opjustering',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18612548/orsteds-topchef-fik-det-samme-spoergsmaal-igen-og-igen-efter-opjustering/?ctxref=ext',
  },
  {
    headline: 'Amerikanske aktier: Meget forsigtigt plus uden nye rentesignaler',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18612455/amerikanske-aktier-meget-forsigtigt-plus-uden-nye-rentesignaler/?ctxref=ext',
  },
  {
    headline: 'Ferrari i største fald siden 2016',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18612347/ferrari-i-storste-fald-siden-2016/?ctxref=ext',
  },
  {
    headline: 'Søren Linding: Uden håb er Ørsted mere afvikling end udvikling',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/investor/ECE18611843/soeren-linding-uden-haab-er-orsted-mere-afvikling-end-udvikling/?ctxref=ext',
  },
  {
    headline:
      'Mærsk overvejer at genoptage transport gennem Det Røde Hav ved fredsaftale',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18611816/maersk-overvejer-at-genoptage-transport-gennem-det-rode-hav-ved-fredsaftale/?ctxref=ext',
  },
  {
    headline: 'Pepsico hjulpet af øget efterspørgsel efter Pepsi',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18611685/pepsico-hjulpet-af-oget-eftersporgsel-efter-pepsi/?ctxref=ext',
  },
  {
    headline: 'Obligationer/middag: Renten forbliver i det snævre spænd',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18611658/obligationermiddag-renten-forbliver-i-det-snaevre-spaend/?ctxref=ext',
  },
  {
    headline:
      'Fyringsrunde viser det nye Ørsted:  Et »betydeligt mere vækstorienteret« selskab',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18611597/fyringsrunde-viser-det-nye-orsted-et-betydeligt-mere-vaekstorienteret-selskab/?ctxref=ext',
  },
  {
    headline: 'Djurslands Bank opjusterer forventninger',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/finans/ECE18611564/djurslands-bank-opjusterer-forventninger/?ctxref=ext',
  },
  {
    headline: 'Konkursadvokat i Kasi: Whistleblower krævede 20 mio. for Pandora-tip',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18611504/konkursadvokat-i-kasi-whistleblower-kraevede-20-mio-for-pandoratip/?ctxref=ext',
  },
  {
    headline: 'Vil spare milliardbeløb: Ørsted sætter tal på fyringsrunde',
    newspaper: 'Jyllands-Posten',
    link: 'https://jyllands-posten.dk/erhverv/ECE18611414/vil-spare-milliardbeloeb-orsted-saetter-tal-paa-fyringsrunde/?ctxref=ext',
  },
]
// --- END: Paste the JSON array of articles here ---

async function main() {
  await initializeScriptEnv()
  logger.info(
    `🚀 Backfilling ${ARTICLES_TO_BACKFILL.length} previously assessed articles to prevent reprocessing...`
  )

  try {
    const sourcesResult = await getAllSources({})
    if (!sourcesResult.success) throw new Error(sourcesResult.error)
    const sourceMap = new Map(sourcesResult.data.map((s) => [s.name, s]))

    const bulkOps = ARTICLES_TO_BACKFILL.map((articleData) => {
      const source = sourceMap.get(articleData.newspaper)
      if (!source) {
        logger.warn(
          { article: articleData },
          'Could not find source for backfill article. Skipping.'
        )
        return null
      }
      return {
        updateOne: {
          filter: { link: articleData.link },
          update: {
            $setOnInsert: {
              ...articleData,
              _id: new mongoose.Types.ObjectId(),
              source: source.name,
              country: source.country,
              relevance_headline: 0, // Mark as assessed with low relevance
              assessment_headline: 'Backfilled as noise from previous run.',
              status: 'assessed',
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      }
    }).filter(Boolean)

    if (bulkOps.length > 0) {
      const dbResult = await bulkWriteArticles(bulkOps)
      if (dbResult.success) {
        logger.info(
          colors.green(
            `✅ Backfill complete. Upserted ${dbResult.result.upsertedCount} new article stubs.`
          )
        )
      } else {
        throw new Error(dbResult.error)
      }
    } else {
      logger.info('✅ No valid articles to backfill.')
    }
  } catch (error) {
    logger.fatal({ err: error }, 'A critical error occurred during the backfill script.')
  }
}

main()
