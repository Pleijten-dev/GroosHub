const fs = require('fs');

// Read current JSON files
const communal = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json', 'utf8'));
const publicSpaces = JSON.parse(fs.readFileSync('/home/user/GroosHub/src/features/location/data/sources/public-spaces.json', 'utf8'));

// CSV data (paste from user)
const csvData = `title,scale,type,category,amount_of_people_needed,min_m2,max_m2,persona_1,persona_2,persona_3,persona_4,persona_5
Gemeenschapsruimte / Gezamenlijke woonkamer,medium,communal,Wellness & Recreatie,50,40,80,De Doorzetter,Senior op Budget,Senioren met Thuiswonende Kinderen,Welvarende Bourgondiërs,Zelfstandige Senior
Logeerkamer,small,communal,Wellness & Recreatie,30,12,18,Jonge Starters,De Groeiers,Senioren met Thuiswonende Kinderen,De Zwitserlevers,Welvarende Bourgondiërs
Keuken (gedeeld),small,communal,Cafés en avond programma,20,25,40,Jonge Starters,De Groeiers,Senior op Budget,Bescheiden Stellen,Hard van Start
Wasruimte / washok,small,communal,Wellness & Recreatie,30,15,30,Jonge Starters,De Doorzetter,Senior op Budget,Bescheiden Stellen,De Groeiers
Voorraadkast / bulkinkopen,small,communal,Wellness & Recreatie,40,8,15,Knusse Gezinnen,De Groeigezinnen,Senioren met Thuiswonende Kinderen,De Groeiers,De Doorzetter
Speelkamer,small,communal,Kinderopvang & Opvang,50,30,50,De Groeigezinnen,Knusse Gezinnen,Hard van Start,Vermogende Gezinnen,Grenzeloos Duo
Werkruimte,small,communal,Wellness & Recreatie,30,20,35,Zelfbewuste Solisten,Samen Starters,Carrièrestarter,Succesvolle Singles,Grenzeloos Duo
Klein terras met zitplek,small,communal,Groen & Recreatie,20,15,30,De Doorzetter,Senior op Budget,Zelfstandige Senior,Bescheiden Stellen,De Zwitserlevers
Muziekruimte,small,communal,Cultuur & Entertainment,80,25,40,Jonge Starters,Ambitieuze Singles,Zelfbewuste Solisten,Carrièrestarter,Laat Bloeiers
Klusruimte,small,communal,Wellness & Recreatie,50,30,50,De Doorzetter,Knusse Gezinnen,Zelfbewuste Solisten,Senioren met Thuiswonende Kinderen,Zelfstandige Senior
Gamekamer met bordspellen,small,communal,Cultuur & Entertainment,60,35,55,Jonge Starters,De Groeigezinnen,Actieve Jonge Gezinnen,Bescheiden Stellen,De Groeiers
Tiny bibliotheek / boekenkast,small,communal,Cultuur & Entertainment,40,6,12,Senior op Budget,De Groeiers,De Doorzetter,Knusse Gezinnen,Welvarende Bourgondiërs
Oppasplek,small,communal,Kinderopvang & Opvang,100,15,25,De Groeigezinnen,Knusse Gezinnen,Hard van Start,Vermogende Gezinnen,De Balanszoekers
Centrale binnentuin of hof,medium,communal,Groen & Recreatie,50,100,300,ALL,ALL,ALL,ALL,ALL
Buurtkamer,medium,communal,Wellness & Recreatie,150,50,80,Senior op Budget,Laat Bloeiers,De Zwitserlevers,Zelfstandige Senior,Welvarende Bourgondiërs
Speeltuin of -veldje,medium,communal,Groen & Recreatie,200,80,150,De Groeigezinnen,Senioren met Thuiswonende Kinderen,Vermogende Gezinnen,Hard van Start,Knusse Gezinnen
Kleine fitnessruimte,medium,communal,Sport faciliteiten,80,40,60,Ambitieuze Singles,Samen Starters,De Balanszoekers,Carrièrestarter,Zelfstandige Senior
Buurtmoestuin,medium,communal,Groen & Recreatie,100,50,100,Zelfstandige Senior,De Groeiers,De Doorzetter,De Groeigezinnen,Welvarende Bourgondiërs
Werkplaats / maker space,medium,communal,Wellness & Recreatie,150,60,100,Zelfbewuste Solisten,De Doorzetter,Carrière Stampers,De Groeiers,Succesvolle Singles
Tool library,medium,communal,Wellness & Recreatie,100,20,40,De Doorzetter,Jonge Starters,Knusse Gezinnen,Senioren met Thuiswonende Kinderen,Bescheiden Stellen
Logeerappartement (zelfstandig),medium,communal,Wellness & Recreatie,100,35,50,Knusse Gezinnen,De Levensgenieters,De Rentenier,Carrièrestarter,Welvarende Bourgondiërs
Ruilhoek,medium,communal,Wellness & Recreatie,100,15,30,De Doorzetter,De Groeigezinnen,Bescheiden Stellen,De Groeiers,Senioren met Thuiswonende Kinderen
Mini bios / projectorruimte,medium,communal,Cultuur & Entertainment,80,40,60,Jonge Starters,Ambitieuze Singles,Samen Starters,Carrièrestarter,Hard van Start
Leeszaal,medium,communal,Cultuur & Entertainment,120,50,80,Zelfstandige Senior,Senior op Budget,Gezellige Nesthouders,De Groeiers,Ambitieuze Singles
Speelkamer / kinderopvang,medium,communal,Kinderopvang & Opvang,150,50,80,De Groeigezinnen,Stabiele Gezinnen,Senioren met Thuiswonende Kinderen,Vermogende Gezinnen,De Groeiers
Fitnessruimte,medium,communal,Sport faciliteiten,150,80,120,Grenzeloos Duo,Hard van Start,Succesvolle Singles,Ambitieuze Singles,De Zwitserlevers
Gedeelde daktuinen,large,communal,Groen & Recreatie,200,100,250,Samen Starters,De Zwitserlevers,De Rentenier,Laat Bloeiers,Gezellige Nesthouders
Buurtmoestuin groot,large,communal,Groen & Recreatie,300,150,300,Senior op Budget,Laat Bloeiers,De Zwitserlevers,Gezellige Nesthouders,Zelfbewuste Solisten
Educatieve tuin,large,communal,Groen & Recreatie,250,100,200,Actieve Jonge Gezinnen,Stabiele Gezinnen,Vermogende Gezinnen,Hard van Start,Senioren met Thuiswonende Kinderen
Spelotheek / speelgoed leenplek,large,communal,Kinderopvang & Opvang,300,40,70,De Groeigezinnen,Knusse Gezinnen,Actieve Jonge Gezinnen,Hard van Start,Vermogende Gezinnen
Zorglogeerkamer,large,communal,Wellness & Recreatie,250,25,40,Senior op Budget,De Levensgenieters,De Rentenier,De Zwitserlevers,Welvarende Bourgondiërs
Senioren Fitness Studio,medium,communal,Sport faciliteiten,150,50,80,Zelfstandige Senior,Senior op Budget,De Levensgenieters,De Zwitserlevers,De Rentenier
Hobby Werkplaats,medium,communal,Wellness & Recreatie,120,40,70,Zelfstandige Senior,De Levensgenieters,De Zwitserlevers,Zelfbewuste Solisten,De Doorzetter
Gemeenschaps Café / Theekamer,medium,communal,Cafés en avond programma,150,50,80,Zelfstandige Senior,Senior op Budget,De Levensgenieters,Senioren met Thuiswonende Kinderen,De Doorzetter
Thuisbioscoop Ruimte,medium,communal,Cultuur & Entertainment,100,40,60,Gezellige Nesthouders,Stabiele Gezinnen,De Levensgenieters,De Rentenier,Carrièrestarter
Wijn/Bier Proeverij Ruimte,medium,communal,Cafés en avond programma,120,35,55,Gezellige Nesthouders,De Levensgenieters,De Balanszoekers,De Zwitserlevers,Carrièrestarter
Meditatie/Mindfulness Ruimte,small,communal,Wellness & Recreatie,60,20,35,De Balanszoekers,Zelfstandige Senior,Zelfbewuste Solisten,Ambitieuze Singles,De Zwitserlevers
Hybride Werk Pods,medium,communal,Wellness & Recreatie,100,30,50,De Balanszoekers,Succesvolle Singles,Carrière Stampers,Ambitieuze Singles,Zelfbewuste Solisten
Kookcursus Keuken,medium,communal,Cafés en avond programma,150,40,65,De Balanszoekers,Gezellige Nesthouders,Samen Starters,Ambitieuze Singles,De Levensgenieters
Privé Eetruimte,medium,communal,Cafés en avond programma,150,35,55,Succesvolle Singles,Carrière Stampers,Vermogende Gezinnen,De Rentenier,Laat Bloeiers
Gezinsspelletjes Avond Ruimte,medium,communal,Cultuur & Entertainment,200,40,65,Knusse Gezinnen,De Groeigezinnen,Actieve Jonge Gezinnen,Gezellige Nesthouders,Senioren met Thuiswonende Kinderen
Knutsel Ruimte,medium,communal,Kinderopvang & Opvang,150,35,60,Knusse Gezinnen,De Groeigezinnen,Actieve Jonge Gezinnen,Gezellige Nesthouders,Senioren met Thuiswonende Kinderen
Kleine Gezins Moestuinen,large,communal,Groen & Recreatie,200,150,300,Knusse Gezinnen,Actieve Jonge Gezinnen,Stabiele Gezinnen,De Groeigezinnen,Gezellige Nesthouders
Kunstgalerij / Expositieruimte,large,communal,Cultuur & Entertainment,300,80,150,De Rentenier,Succesvolle Singles,De Levensgenieters,Carrière Stampers,Laat Bloeiers
Bridge / Kaartspel Ruimte,medium,communal,Cultuur & Entertainment,120,30,50,De Rentenier,De Levensgenieters,Senior op Budget,Welvarende Bourgondiërs,Zelfstandige Senior
Koppel Wellness Studio,medium,communal,Wellness & Recreatie,120,40,65,De Rentenier,Carrière Stampers,Gezellige Nesthouders,De Balanszoekers,Samen Starters
Pakketkamer/pakketpunt,small,communal,Wellness & Recreatie,50,15,30,Jonge Starters,Ambitieuze Singles,Succesvolle Singles,De Groeiers,Carrièrestarter
Hondenuitlaatplaats,medium,communal,Groen & Recreatie,100,50,120,Zelfbewuste Solisten,Gezellige Nesthouders,De Balanszoekers,Stabiele Gezinnen,Welvarende Bourgondiërs
Gezamenlijke BBQ plek/terras,medium,communal,Groen & Recreatie,100,40,80,Samen Starters,Actieve Jonge Gezinnen,Grenzeloos Duo,Gezellige Nesthouders,De Zwitserlevers
Sauna,medium,communal,Wellness & Recreatie,150,25,40,De Balanszoekers,Succesvolle Singles,De Zwitserlevers,De Rentenier,Welvarende Bourgondiërs
Teenager/jeugdruimte,medium,communal,Kinderopvang & Opvang,200,50,80,De Groeigezinnen,Stabiele Gezinnen,Actieve Jonge Gezinnen,Senioren met Thuiswonende Kinderen,Gezellige Nesthouders
Huiswerkruimte/studieruimte,medium,communal,Kinderopvang & Opvang,150,40,70,De Groeigezinnen,Stabiele Gezinnen,Actieve Jonge Gezinnen,Jonge Starters,Ambitieuze Singles
Buurtkas voor voedsel,small,communal,Wellness & Recreatie,50,4,8,De Doorzetter,Senior op Budget,De Groeiers,Bescheiden Stellen,Jonge Starters
Muziekrepetitieruimte (geluiddicht),small,communal,Cultuur & Entertainment,100,20,35,Jonge Starters,Ambitieuze Singles,Zelfbewuste Solisten,Laat Bloeiers,Grenzeloos Duo
Atelier/kunstwerkruimte,medium,communal,Cultuur & Entertainment,100,40,70,Zelfbewuste Solisten,Ambitieuze Singles,De Levensgenieters,Laat Bloeiers,De Rentenier
Filmkamer met console gaming,medium,communal,Cultuur & Entertainment,100,45,70,Jonge Starters,Ambitieuze Singles,Grenzeloos Duo,Carrièrestarter,Hard van Start
Tiny caféhoek / koffiebar,medium,public,Cafés en avond programma,500,30,60,Samen Starters,Bescheiden Stellen,De Zwitserlevers,Welvarende Bourgondiërs,Gezellige Nesthouders
Wijkcentrum (met zalen),large,public,Wellness & Recreatie,2000,300,600,Senior op Budget,De Levensgenieters,De Doorzetter,Bescheiden Stellen,Laat Bloeiers
Culturele voorzieningen,large,public,Cultuur & Entertainment,3000,200,500,Succesvolle Singles,Laat Bloeiers,Vermogende Gezinnen,Ambitieuze Singles,Samen Starters
Arthouse bioscoop,large,public,Cultuur & Entertainment,5000,400,800,Carrièrestarter,Succesvolle Singles,Grenzeloos Duo,Zelfbewuste Solisten,Ambitieuze Singles
Sportgelegenheid groter,large,public,Sport faciliteiten,3000,500,1000,Stabiele Gezinnen,Actieve Jonge Gezinnen,De Balanszoekers,Hard van Start,Vermogende Gezinnen
Werkhub / co-working space,large,public,Wellness & Recreatie,2000,300,800,Ambitieuze Singles,Zelfbewuste Solisten,Grenzeloos Duo,Carrière Stampers,De Groeiers
Bibliotheek (dependence),large,public,Cultuur & Entertainment,3000,400,800,De Levensgenieters,Gezellige Nesthouders,De Rentenier,Laat Bloeiers,Zelfstandige Senior
Studio / atelier voor muziek en dans,large,public,Cultuur & Entertainment,3000,200,400,Jonge Starters,Ambitieuze Singles,Actieve Jonge Gezinnen,Carrièrestarter,Hard van Start
BSO ruimte,large,public,Kinderopvang & Opvang,1000,150,300,Actieve Jonge Gezinnen,Stabiele Gezinnen,Hard van Start,Vermogende Gezinnen,Senioren met Thuiswonende Kinderen
Afvalhub / milieustraatje,large,public,Wellness & Recreatie,2000,200,400,ALL,ALL,ALL,ALL,ALL
Buurtcafé,large,public,Cafés en avond programma,1500,80,150,Samen Starters,De Balanszoekers,Senioren met Thuiswonende Kinderen,Welvarende Bourgondiërs,Gezellige Nesthouders
Huisartsenpost / zorgpunt,large,public,Zorg (Huisarts & Apotheek),2000,150,300,ALL,ALL,ALL,ALL,ALL
Wijkbrede sporthal,large,public,Sport faciliteiten,5000,1000,2000,Stabiele Gezinnen,Actieve Jonge Gezinnen,De Balanszoekers,Hard van Start,Vermogende Gezinnen
Kennis- of innovatiehub,large,public,Wellness & Recreatie,5000,500,1500,Carrièrestarter,Succesvolle Singles,Grenzeloos Duo,Zelfbewuste Solisten,Carrière Stampers
Reparatiecafé,large,public,Wellness & Recreatie,2000,100,200,De Doorzetter,Jonge Starters,Senior op Budget,Bescheiden Stellen,Laat Bloeiers
Supermarkt / buurtsupermarkt,large,public,Winkels (Dagelijkse boodschappen),1500,400,1200,ALL,ALL,ALL,ALL,ALL
Bakkerij / vers brood,medium,public,Winkels (Dagelijkse boodschappen),800,40,80,De Levensgenieters,Welvarende Bourgondiërs,Bescheiden Stellen,Zelfstandige Senior,Stabiele Gezinnen
Restaurant,large,public,Mid-range Restaurants (€€€),2000,120,300,Carrière Stampers,Grenzeloos Duo,Succesvolle Singles,Laat Bloeiers,Stabiele Gezinnen
Drogist / apotheek,medium,public,Zorg (Huisarts & Apotheek),1500,80,150,Zelfstandige Senior,Senior op Budget,Bescheiden Stellen,Stabiele Gezinnen,De Zwitserlevers
Kapperszaak / schoonheidssalon,medium,public,Winkels (Overige retail),1000,50,100,Zelfbewuste Solisten,Succesvolle Singles,Carrière Stampers,De Balanszoekers,Stabiele Gezinnen
Yogastudio / fitnesscentrum commercieel,large,public,Sport faciliteiten,2000,200,400,Carrière Stampers,Grenzeloos Duo,Carrièrestarter,Samen Starters,De Balanszoekers
Peuterspeelzaal commercieel,large,public,Kinderopvang & Opvang,1000,100,200,Actieve Jonge Gezinnen,Stabiele Gezinnen,Vermogende Gezinnen,Hard van Start,De Groeigezinnen
Tandartspraktijk,medium,public,Zorg (Huisarts & Apotheek),1500,60,120,ALL,ALL,ALL,ALL,ALL
Fysiotherapie / paramedisch centrum,medium,public,Zorg (Paramedische voorzieningen),1500,80,150,Zelfstandige Senior,De Balanszoekers,Stabiele Gezinnen,Actieve Jonge Gezinnen,Senior op Budget
Kinderopvang / crèche commercieel,large,public,Kinderopvang & Opvang,1000,150,300,Actieve Jonge Gezinnen,Stabiele Gezinnen,Vermogende Gezinnen,Hard van Start,Bescheiden Stellen
Bloemist,small,public,Winkels (Overige retail),800,30,60,De Levensgenieters,Carrière Stampers,Bescheiden Stellen,Zelfstandige Senior,Stabiele Gezinnen
Concept store / lifestyle winkel,medium,public,Winkels (Overige retail),2000,60,120,Grenzeloos Duo,Succesvolle Singles,Carrièrestarter,De Zwitserlevers,Jonge Starters
Pedicure / nagelsalon,small,public,Wellness & Recreatie,1000,40,70,Zelfbewuste Solisten,Samen Starters,De Levensgenieters,Gezellige Nesthouders,Bescheiden Stellen
Fotostudio,medium,public,Winkels (Overige retail),2000,60,120,Ambitieuze Singles,Grenzeloos Duo,Actieve Jonge Gezinnen,Vermogende Gezinnen,Jonge Starters
Escape room / entertainment,medium,public,Cultuur & Entertainment,3000,100,200,Jonge Starters,Samen Starters,Grenzeloos Duo,Actieve Jonge Gezinnen,Knusse Gezinnen
Wijnbar / Cocktail Lounge,large,public,Upscale Restaurants (€€€€-€€€€€),3000,80,150,Carrière Stampers,Grenzeloos Duo,De Rentenier,Carrièrestarter,Welvarende Bourgondiërs
Champagne Bar / Proeverij Ruimte,large,public,Upscale Restaurants (€€€€-€€€€€),5000,60,120,De Zwitserlevers,De Rentenier,Carrière Stampers,Succesvolle Singles,Samen Starters
Wellness Center,large,public,Wellness & Recreatie,3000,300,600,De Balanszoekers,Succesvolle Singles,Carrière Stampers,Grenzeloos Duo,Laat Bloeiers
Slagerij,medium,public,Winkels (Dagelijkse boodschappen),1500,50,100,De Levensgenieters,Welvarende Bourgondiërs,Stabiele Gezinnen,Gezellige Nesthouders,Knusse Gezinnen
Viswinkel,medium,public,Winkels (Dagelijkse boodschappen),2000,40,80,De Levensgenieters,Welvarende Bourgondiërs,De Zwitserlevers,De Rentenier,Stabiele Gezinnen
Groentewinkel/biowinkel,medium,public,Winkels (Dagelijkse boodschappen),1500,60,120,De Balanszoekers,De Levensgenieters,Zelfbewuste Solisten,Samen Starters,Gezellige Nesthouders
Delicatessenzaak/kaaswinkel,medium,public,Winkels (Dagelijkse boodschappen),2000,50,100,De Levensgenieters,Welvarende Bourgondiërs,De Rentenier,Carrière Stampers,De Zwitserlevers
Slijterij,medium,public,Winkels (Overige retail),2000,60,120,Carrière Stampers,Grenzeloos Duo,Succesvolle Singles,De Zwitserlevers,Welvarende Bourgondiërs
IJssalon,medium,public,Mid-range Restaurants (€€€),1500,40,80,Actieve Jonge Gezinnen,Knusse Gezinnen,Jonge Starters,Samen Starters,Gezellige Nesthouders
Snackbar/cafetaria,medium,public,Budget Restaurants (€),1000,50,100,Jonge Starters,De Groeiers,Actieve Jonge Gezinnen,Bescheiden Stellen,Stabiele Gezinnen
Afhaalrestaurant,medium,public,Budget Restaurants (€),1500,60,120,Samen Starters,Actieve Jonge Gezinnen,Ambitieuze Singles,Carrièrestarter,Stabiele Gezinnen
Lunchroom/broodjeswinkel,medium,public,Mid-range Restaurants (€€€),1500,60,120,Ambitieuze Singles,Samen Starters,Carrièrestarter,Zelfbewuste Solisten,Stabiele Gezinnen
Fietsenmaker,medium,public,Winkels (Overige retail),1500,50,100,ALL,ALL,ALL,ALL,ALL
Schoenmaker,small,public,Winkels (Overige retail),2000,30,60,Senior op Budget,De Doorzetter,Bescheiden Stellen,Zelfstandige Senior,De Levensgenieters
Kringloopwinkel,large,public,Winkels (Overige retail),3000,200,500,De Doorzetter,Jonge Starters,Senior op Budget,Bescheiden Stellen,De Groeiers
Wasserette,medium,public,Winkels (Overige retail),1500,80,150,Jonge Starters,Ambitieuze Singles,De Groeiers,Carrièrestarter,Samen Starters
Stomerij,medium,public,Winkels (Overige retail),2000,50,100,Succesvolle Singles,Carrière Stampers,Carrièrestarter,De Balanszoekers,Ambitieuze Singles
Opticien,medium,public,Zorg (Paramedische voorzieningen),2000,60,120,Zelfstandige Senior,Senior op Budget,De Zwitserlevers,Stabiele Gezinnen,Gezellige Nesthouders
Huisdierenwinkel,medium,public,Winkels (Overige retail),2000,80,150,Gezellige Nesthouders,Stabiele Gezinnen,Zelfbewuste Solisten,De Balanszoekers,Knusse Gezinnen
Postpunt/PostNL punt,medium,public,Winkels (Overige retail),1500,30,60,ALL,ALL,ALL,ALL,ALL
Basisschool,large,public,Onderwijs (Basisschool),1000,1500,3000,ALL,ALL,ALL,ALL,ALL
Peuterspeelzaal (gemeentelijk),large,public,Kinderopvang & Opvang,800,100,200,De Groeigezinnen,Actieve Jonge Gezinnen,Knusse Gezinnen,Bescheiden Stellen,De Groeiers
Muziekschool,large,public,Cultuur & Entertainment,3000,200,400,Actieve Jonge Gezinnen,Vermogende Gezinnen,Ambitieuze Singles,Laat Bloeiers,Stabiele Gezinnen
Dansschool,large,public,Cultuur & Entertainment,2000,150,300,Actieve Jonge Gezinnen,Jonge Starters,Ambitieuze Singles,Grenzeloos Duo,Stabiele Gezinnen
Taalschool,large,public,Cultuur & Entertainment,3000,150,300,Jonge Starters,Ambitieuze Singles,Grenzeloos Duo,Samen Starters,Carrièrestarter
Huiswerkbegeleiding,medium,public,Kinderopvang & Opvang,1500,80,150,De Groeigezinnen,Knusse Gezinnen,Actieve Jonge Gezinnen,Stabiele Gezinnen,Bescheiden Stellen
Zwembad,large,public,Sport faciliteiten,5000,800,1500,Actieve Jonge Gezinnen,Stabiele Gezinnen,Vermogende Gezinnen,De Balanszoekers,Gezellige Nesthouders
Massagepraktijk,medium,public,Wellness & Recreatie,1500,40,80,De Balanszoekers,Succesvolle Singles,Carrière Stampers,De Levensgenieters,De Zwitserlevers
Diëtist,medium,public,Zorg (Paramedische voorzieningen),2000,30,60,De Balanszoekers,Zelfstandige Senior,Actieve Jonge Gezinnen,Stabiele Gezinnen,Ambitieuze Singles
Speelgoedwinkel,medium,public,Winkels (Overige retail),2000,80,150,De Groeigezinnen,Knusse Gezinnen,Actieve Jonge Gezinnen,Vermogende Gezinnen,Gezellige Nesthouders
Boekwinkel,medium,public,Winkels (Overige retail),2000,80,150,De Levensgenieters,Laat Bloeiers,Gezellige Nesthouders,Ambitieuze Singles,Zelfstandige Senior
Board game café,medium,public,Cafés en avond programma,2000,80,150,Jonge Starters,Samen Starters,Ambitieuze Singles,Grenzeloos Duo,Gezellige Nesthouders
Craft beer bar/brouwerij,large,public,Cafés en avond programma,3000,100,200,Grenzeloos Duo,Carrièrestarter,Samen Starters,Ambitieuze Singles,Carrière Stampers
Theater/podium,large,public,Cultuur & Entertainment,5000,300,800,De Levensgenieters,De Rentenier,Laat Bloeiers,Succesvolle Singles,Carrière Stampers
Telefoon/computer reparatie,medium,public,Winkels (Overige retail),1500,40,80,Jonge Starters,Ambitieuze Singles,Carrièrestarter,Zelfbewuste Solisten,Samen Starters
Voortgezet onderwijs (middelbare school),large,public,Onderwijs (Voortgezet onderwijs),3000,3000,6000,ALL,ALL,ALL,ALL,ALL
Hoger onderwijs (dependance),large,public,Onderwijs (Hoger onderwijs),5000,1500,3000,Jonge Starters,De Groeiers,Ambitieuze Singles,Samen Starters,Zelfbewuste Solisten
Buurtpark (met speeltuin),large,public,Groen & Recreatie,1000,500,1500,ALL,ALL,ALL,ALL,ALL
Buiten sportveld (openbaar),medium,public,Sport faciliteiten,800,200,500,Jonge Starters,Ambitieuze Singles,Samen Starters,Knusse Gezinnen,Stabiele Gezinnen
Dierenartspraktijk,medium,public,Winkels (Overige retail),1500,60,120,Gezellige Nesthouders,Stabiele Gezinnen,Zelfbewuste Solisten,De Balanszoekers,Knusse Gezinnen
Consultatiebureau (baby/peuterzorg),medium,public,Zorg (Paramedische voorzieningen),1500,80,150,De Groeigezinnen,Actieve Jonge Gezinnen,Hard van Start,Knusse Gezinnen,Stabiele Gezinnen
Luxe restaurant (hoog segment),large,public,Upscale Restaurants (€€€€-€€€€€),3000,80,150,Carrière Stampers,Welvarende Bourgondiërs,Succesvolle Singles,De Rentenier,Grenzeloos Duo`;

// Parse CSV
const lines = csvData.trim().split('\n');
const headers = lines[0].split(',');
const rows = lines.slice(1).map(line => {
  const values = line.split(',');
  return {
    title: values[0],
    scale: values[1],
    type: values[2],
    category: values[3],
    personas: [values[7], values[8], values[9], values[10], values[11]]
  };
});

console.log('='.repeat(80));
console.log('UPDATING AMENITIES FROM CSV');
console.log('='.repeat(80));

let communalUpdated = 0;
let publicUpdated = 0;
let communalNotFound = [];
let publicNotFound = [];
let newCommunal = [];
let newPublic = [];

// Map scale values
const scaleMap = {
  'small': 'kleinste_schaal',
  'medium': 'middenschaal',
  'large': 'grotere_schaal'
};

rows.forEach(row => {
  // Convert "ALL" to "geschikt voor elke doelgroep"
  const targetGroups = row.personas.map(p =>
    p === 'ALL' ? 'geschikt voor elke doelgroep' : p
  );

  if (row.type === 'communal') {
    const space = communal.nl.spaces.find(s => s.name === row.title);
    if (space) {
      space.target_groups = targetGroups;
      space.scale = scaleMap[row.scale] || row.scale;
      // Note: not updating category as JSON uses different format
      communalUpdated++;
    } else {
      communalNotFound.push(row.title);
      newCommunal.push(row.title);
    }
  } else if (row.type === 'public') {
    const space = publicSpaces.nl.spaces.find(s => s.name === row.title);
    if (space) {
      space.target_groups = targetGroups;
      space.scale = scaleMap[row.scale] || row.scale;
      publicUpdated++;
    } else {
      publicNotFound.push(row.title);
      newPublic.push(row.title);
    }
  }
});

console.log(`\n✅ Communal spaces updated: ${communalUpdated}`);
console.log(`✅ Public spaces updated: ${publicUpdated}`);

if (communalNotFound.length > 0) {
  console.log(`\n⚠️  Communal spaces NOT FOUND (${communalNotFound.length}):`);
  communalNotFound.forEach(name => console.log(`   - ${name}`));
}

if (publicNotFound.length > 0) {
  console.log(`\n⚠️  Public spaces NOT FOUND (${publicNotFound.length}):`);
  publicNotFound.forEach(name => console.log(`   - ${name}`));
}

// Save files
fs.writeFileSync(
  '/home/user/GroosHub/src/features/location/data/sources/communal-spaces.json',
  JSON.stringify(communal, null, 2)
);

fs.writeFileSync(
  '/home/user/GroosHub/src/features/location/data/sources/public-spaces.json',
  JSON.stringify(publicSpaces, null, 2)
);

console.log('\n' + '='.repeat(80));
console.log('✅ FILES SAVED');
console.log('='.repeat(80));

// Verify all have 5 personas
console.log('\nVERIFYING PERSONA COUNTS...\n');

let allCorrect = true;
const allSpaces = [
  ...communal.nl.spaces.map(s => ({...s, type: 'communal'})),
  ...publicSpaces.nl.spaces.map(s => ({...s, type: 'public'}))
];

allSpaces.forEach(space => {
  const groups = space.target_groups.filter(g => g !== 'geschikt voor elke doelgroep');
  if (groups.length !== 5 && !space.target_groups.includes('geschikt voor elke doelgroep')) {
    console.log(`❌ ${space.name} (${space.type}): ${groups.length} personas`);
    allCorrect = false;
  }
});

if (allCorrect) {
  console.log('✅ All spaces have exactly 5 personas (or "geschikt voor elke doelgroep")!');
}

console.log('\n' + '='.repeat(80));
