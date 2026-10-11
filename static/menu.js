/* ================= MENU DATA ================= */
// `iso3` is the real country code the actual map game (world_map_webgl.html /
// game.js / country_lookup.json) uses for this nation — required so
// launchGame() can set GameState.playerCountry to something the map game
// actually recognizes. Every entry below was checked against Geo/country_lookup.json.
const COUNTRIES = [
 {id:'usa',name:'USA',iso3:'USA',flag:'🇺🇸',color:'#3b5bdb',lon:-98,lat:39,plays:'177,960'},
 {id:'france',name:'France',iso3:'FRA',flag:'🇫🇷',color:'#3355aa',lon:2,lat:47,plays:'197,655'},
 {id:'turkiye',name:'Turkiye',iso3:'TUR',flag:'🇹🇷',color:'#c0392b',lon:35,lat:39,plays:'166,372'},
 {id:'russia',name:'Russia',iso3:'RUS',flag:'🇷🇺',color:'#7d8b99',lon:60,lat:61,plays:'159,154'},
 {id:'germany',name:'Germany',iso3:'DEU',flag:'🇩🇪',color:'#3d3d3d',lon:10,lat:51,plays:'68,823'},
 {id:'ukraine',name:'Ukraine',iso3:'UKR',flag:'🇺🇦',color:'#ffd43b',lon:31,lat:49,plays:'48,894'},
 {id:'italy',name:'Italy',iso3:'ITA',flag:'🇮🇹',color:'#2f9e44',lon:12.5,lat:42.5,plays:'38,416'},
 {id:'uk',name:'United Kingdom',iso3:'GBR',flag:'🇬🇧',color:'#1864ab',lon:-2,lat:54,plays:'38,092'},
 {id:'brazil',name:'Brazil',iso3:'BRA',flag:'🇧🇷',color:'#2b8a3e',lon:-51,lat:-10,plays:'29,740'},
 {id:'japan',name:'Japan',iso3:'JPN',flag:'🇯🇵',color:'#e03131',lon:138,lat:37,plays:'29,677'},
 {id:'prc',name:"People's Republic",iso3:'CHN',flag:'🇨🇳',color:'#c92a2a',lon:104,lat:35,plays:'28,185'},
 {id:'israel',name:'Israel',iso3:'ISR',flag:'🇮🇱',color:'#1c7ed6',lon:35,lat:31,plays:'22,440'},
 {id:'nkorea',name:'North Korea',iso3:'PRK',flag:'🇰🇵',color:'#c0392b',lon:127,lat:40,plays:'19,272'},
 {id:'poland',name:'Poland',iso3:'POL',flag:'🇵🇱',color:'#e03131',lon:19,lat:52,plays:'17,183'},
 {id:'canada',name:'Canada',iso3:'CAN',flag:'🇨🇦',color:'#e03131',lon:-106,lat:56,plays:'17,169'},
 {id:'iran',name:'Iran',iso3:'IRN',flag:'🇮🇷',color:'#2f9e44',lon:53,lat:32,plays:'16,739'},
 {id:'argentina',name:'Argentina',iso3:'ARG',flag:'🇦🇷',color:'#4dabf7',lon:-64,lat:-34,plays:'15,517'},
 {id:'serbia',name:'Serbia',iso3:'SRB',flag:'🇷🇸',color:'#c0392b',lon:21,lat:44,plays:'13,769'},
 {id:'india',name:'India',iso3:'IND',flag:'🇮🇳',color:'#e8590c',lon:79,lat:22,plays:'13,624'},
 {id:'spain',name:'Spain',iso3:'ESP',flag:'🇪🇸',color:'#f08c00',lon:-3.7,lat:40,plays:'13,351'},
 {id:'belarus',name:'Belarus',iso3:'BLR',flag:'🇧🇾',color:'#2f9e44',lon:28,lat:53,plays:'13,239'},
 {id:'belgium',name:'Belgium',iso3:'BEL',flag:'🇧🇪',color:'#f08c00',lon:4.5,lat:50.6,plays:'12,277'},
 {id:'vatican',name:'Vatican City',iso3:'VAT',flag:'🇻🇦',color:'#ffd43b',lon:12.45,lat:41.9,plays:'11,745'},
 {id:'algeria',name:'Algeria',iso3:'DZA',flag:'🇩🇿',color:'#2f9e44',lon:3,lat:28,plays:'11,424'},
 {id:'greece',name:'Greece',iso3:'GRC',flag:'🇬🇷',color:'#1c7ed6',lon:22,lat:39,plays:'10,355'},
 {id:'morocco',name:'Morocco',iso3:'MAR',flag:'🇲🇦',color:'#c0392b',lon:-7,lat:32,plays:'9,526'},
 {id:'skorea',name:'South Korea',iso3:'KOR',flag:'🇰🇷',color:'#1c7ed6',lon:127.8,lat:36,plays:'9,477'},
 {id:'switzerland',name:'Switzerland',iso3:'CHE',flag:'🇨🇭',color:'#c0392b',lon:8.2,lat:46.8,plays:'9,422'},
 {id:'australia',name:'Australia',iso3:'AUS',flag:'🇦🇺',color:'#1864ab',lon:134,lat:-25,plays:'7,887'},
 {id:'mexico',name:'Mexico',iso3:'MEX',flag:'🇲🇽',color:'#2f9e44',lon:-102,lat:23,plays:'7,754'},
 {id:'saudi',name:'Saudi Arabia',iso3:'SAU',flag:'🇸🇦',color:'#0d7d3f',lon:45,lat:24,plays:'7,923'},
 {id:'vietnam',name:'Vietnam',iso3:'VNM',flag:'🇻🇳',color:'#e03131',lon:106,lat:16,plays:'6,120'},
 {id:'egypt',name:'Egypt',iso3:'EGY',flag:'🇪🇬',color:'#e8590c',lon:30,lat:26,plays:'6,514'},
 {id:'sweden',name:'Sweden',iso3:'SWE',flag:'🇸🇪',color:'#4dabf7',lon:16,lat:62,plays:'5,277'},
 {id:'hungary',name:'Hungary',iso3:'HUN',flag:'🇭🇺',color:'#2f9e44',lon:19,lat:47,plays:'5,010'},
 {id:'iraq',name:'Iraq',iso3:'IRQ',flag:'🇮🇶',color:'#2f9e44',lon:44,lat:33,plays:'4,862'},
 {id:'safrica',name:'South Africa',iso3:'ZAF',flag:'🇿🇦',color:'#2f9e44',lon:24,lat:-29,plays:'4,554'},
 {id:'philippines',name:'Philippines',iso3:'PHL',flag:'🇵🇭',color:'#1c7ed6',lon:122,lat:13,plays:'4,500'},
 {id:'syria',name:'Syria',iso3:'SYR',flag:'🇸🇾',color:'#2f9e44',lon:38,lat:35,plays:'3,933'},
 {id:'indonesia',name:'Indonesia',iso3:'IDN',flag:'🇮🇩',color:'#e03131',lon:113,lat:-2,plays:'3,690'},
 {id:'venezuela',name:'Venezuela',iso3:'VEN',flag:'🇻🇪',color:'#f08c00',lon:-66,lat:8,plays:'3,286'},
 {id:'ghana',name:'Ghana',iso3:'GHA',flag:'🇬🇭',color:'#e8590c',lon:-1,lat:8,plays:'2,410'},
 {id:'namibia',name:'Namibia',iso3:'NAM',flag:'🇳🇦',color:'#4dabf7',lon:17,lat:-22,plays:'1,980'},
 {id:'panama',name:'Panama',iso3:'PAN',flag:'🇵🇦',color:'#1c7ed6',lon:-80,lat:9,plays:'2,880'},
 {id:'burkina',name:'Burkina Faso',iso3:'BFA',flag:'🇧🇫',color:'#2f9e44',lon:-2,lat:12,plays:'1,760'},
];

// Note: "2026 Detailed and More Provinces" preset removed per request.
const PRESET_CATEGORIES = [
  {id:'historical', label:'Historical'},
  {id:'alt_history', label:'Alt-Historical'},
  {id:'sci_fi', label:'Science Fiction'}
];
const BASE_PRESETS = [
 {id:0,title:'Modern Day',category:'historical',by:'Map Painter 1',plays:'1,584,806',rounds:'14,528,029',copies:'59,995',favs:'4,915',start:'January 1st, 2016 AD',startYear:2016,type:'Historical · Modern Day',
   startDate:'2016-01-01', era:'modern',
   img:'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1400&auto=format&fit=crop',
   about:'The world today, frozen at the edge of change. Every currently-recognized state begins with its real 2016 borders, government, and alliances — from there, the timeline is yours to bend.',
   before:'Everything before the start date happened historically, exactly as our world remembers it. No shortcuts, no divergences — the point of departure is today.',
   rules:'Every polity should behave realistically and logically, weighing its real economic capacity, military doctrine, and diplomatic relationships before acting. No polity may act against its own stated interests without in-fiction justification.'},
 {id:4,title:'World War I: The Road to War',category:'historical',by:'Map Painter 1',plays:'0',rounds:'0',copies:'0',favs:'0',start:'January 1st, 1911 AD',startYear:1911,type:'Historical · Total War',
   startDate:'1911-01-01', era:'1911',
   img:'https://images.unsplash.com/photo-1526304760382-3591d3840148?q=80&w=1400&auto=format&fit=crop',
   about:'The old world order is still fully intact - no Balkan Wars, no Italian invasion of Libya, no Moroccan crisis, and the Qing Dynasty still rules the whole of China. Every great-power rivalry that will eventually produce 1914 is already in motion, but nothing has happened yet. This is the widest possible window to reshape the road to the Great War.',
   before:`As of January 1st, 1911, Europe's alliance system - the Triple Entente of France, Russia, and Britain against the Triple Alliance of Germany, Austria-Hungary, and Italy - has been in place for over a decade, and naval rivalry between Britain and Germany continues to intensify. None of the crises that historically reshaped the next three and a half years have occurred yet: Morocco remains a nominally independent Sultanate under loose French and Spanish influence, not yet a formal protectorate; Ottoman Tripolitania (modern Libya) remains under Ottoman control; the Balkans still largely reflect Ottoman rule over Macedonia, Kosovo, and much of Albania, predating the wars that will carve most of that territory away; and the Qing Dynasty governs the whole of China without challenge, its collapse still nine months away. Russian Prime Minister Pyotr Stolypin's reform program is ongoing. Whether any of the crises below unfold as they historically did depends entirely on the choices made from here.`,
   rules:`Every polity should behave according to its real 1911 alliance commitments, military doctrine, and economic capacity, but the player's own actions may still change how or whether historical events unfold - this is a simulation, not a scripted reenactment. The player controls only their own polity; they may influence others through diplomacy, war, or political pressure, but cannot dictate another polity's internal decisions or force its hand directly.

Region transfers follow the size of the region relative to the polity that holds it: if a polity's holding is represented by a single large region (as with most colonial possessions and many smaller European states), that region only changes hands once the invading force has occupied the whole of it, not a partial advance into it. Where a polity is split across several regions (as with the larger powers), transfer each region individually as it falls, and maintain a continuous, logically connected front line rather than isolated territorial jumps - an advancing army should not hold non-contiguous territory unless it arrived there by sea or through a specific airborne/naval operation.

This start predates nearly every crisis that historically led to 1914 - treat each of the following as its own live decision point with a historical default outcome, changeable by any relevant polity's actions:
- Stolypin's assassination: expect Pyotr Stolypin, architect of Russia's land reforms, to be assassinated in Kiev in September 1911 absent a change in Russian internal security or politics; his death historically removed a moderating, reform-minded influence from the Tsar's government and is often read as a contributing factor to Russia's later instability - not automatic here, but a live possibility if Russian internal politics proceed unchanged.
- The Agadir Crisis: expect a diplomatic crisis over Morocco around mid-1911, triggered by French intervention against a local rebellion and a German gunboat's arrival at Agadir in July as a show of force; absent a different resolution, expect this to conclude around November 1911 with Morocco becoming a French protectorate (with a separate Spanish zone in the north) and Germany receiving colonial compensation in French Equatorial Africa. Any party involved may push for a different outcome.
- The Italo-Turkish War: expect Italy to declare war on the Ottoman Empire and invade Ottoman Tripolitania (Libya) around September 1911, seeking colonial territory in North Africa; absent a different outcome, expect an extended, difficult campaign concluding with Ottoman cession of Libya to Italy by October 1912 - but Ottoman resistance, other powers' involvement, or Italian setbacks could all change this.
- The Xinhai Revolution: expect a revolutionary uprising against the Qing Dynasty beginning around October 1911, spreading rapidly through China's southern and central provinces; absent a different outcome, expect a new Republic of China to be proclaimed without the Qing court necessarily dissolving immediately - both may exist as rival claimants for a period, and provincial military leaders (the beginnings of what will become China's warlord era) may act with increasing independence from either government. Mongolia and Tannu Uriankhai (Tuva) are each likely to attempt to break away and declare independence as central control weakens, with Russian encouragement. How this resolves depends entirely on the actual balance of power the game produces.
- The Balkan Wars: expect a coalition of Balkan states (Serbia, Bulgaria, Greece, Montenegro) to go to war against the Ottoman Empire around October 1912, seeking to seize its remaining European territory; absent a different outcome, expect the Ottomans to lose nearly all of their Balkan territory by mid-1913, followed by a second, shorter war among the victors over how to divide the spoils (particularly Macedonia), and the emergence of an independent Albania. This is a downstream consequence of the choices made throughout 1911-1912, not a fixed event.
- Eventual World War I: if the alliance system, the naval race, and Balkan instability all proceed without significant divergence, expect a crisis triggered by an assassination in the Balkans to eventually draw the alliance blocs into general war sometime in 1914 - but every element of that outcome depends on what has actually happened in this specific playthrough by then; nothing about it is scripted to occur regardless of player action.

Newly-declared or reorganized polities without an existing flag should receive one appropriate to their stated government type and origin rather than remaining unflagged.`},
 {id:2,title:'World War I',category:'historical',by:'Map Painter 1',plays:'0',rounds:'0',copies:'0',favs:'0',start:'July 28th, 1914 AD',startYear:1914,type:'Historical · Total War',
   startDate:'1914-07-28', era:'1914',
   img:'https://images.unsplash.com/photo-1526304760382-3591d3840148?q=80&w=1400&auto=format&fit=crop',
   about:'The July Crisis has run its course. Austria-Hungary has declared war on Serbia, the alliance system is locking into motion, and within days the continent\'s great powers will be at war. Command a great power, a small nation caught between them, or a colonial holding about to be drawn into a war not of its making.',
   before:`The assassination of Archduke Franz Ferdinand in Sarajevo on June 28th, 1914 has triggered the July Crisis. Austria-Hungary, backed by Germany's "blank check," has issued an ultimatum to Serbia and declared war on July 28th. The alliance system - the Triple Entente of France, Russia, and Britain against the Triple Alliance of Germany and Austria-Hungary (Italy remains uncommitted and will not honor the alliance, as it was defensive in nature and Austria-Hungary was the aggressor) - is about to pull every major European power into general war within a week. Decades of naval rivalry, colonial competition, and Balkan instability (two prior Balkan Wars in 1912-1913 already redrew the region's borders) have made this escalation nearly inevitable. Colonial holdings across Africa and Asia will be drawn in as extensions of their metropoles regardless of their own populations' involvement in the dispute.`,
   rules:`Every polity should behave according to its real 1914 alliance commitments, military doctrine, and economic capacity, but the player's own actions may still change how or whether historical events unfold - this is a simulation, not a scripted reenactment. The player controls only their own polity; they may influence others through diplomacy, war, or political pressure, but cannot dictate another polity's internal decisions or force its hand directly.

Region transfers follow the size of the region relative to the polity that holds it: if a polity's holding is represented by a single large region (as with most colonial possessions and many smaller European states), that region only changes hands once the invading force has occupied the whole of it, not a partial advance into it. Where a polity is split across several regions (as with the larger powers), transfer each region individually as it falls, and maintain a continuous, logically connected front line rather than isolated territorial jumps - an advancing army should not hold non-contiguous territory unless it arrived there by sea or through a specific airborne/naval operation.

Historical inflection points to track, each with a default historical outcome the player can still divert through their own actions:
- The Eastern Front and Russian collapse: absent player intervention, expect Russia's war effort to deteriorate through 1916-1917 as supply and morale problems mount, culminating in the February 1917 revolution and the Tsar's abdication. A provisional government will attempt to continue the war; if it fails to deliver land reform or peace, expect a second revolution in October 1917 bringing a Bolshevik government to power, followed by a separate peace with the Central Powers (historically the Treaty of Brest-Litovsk, March 1918) that cedes the Baltic region, Ukraine, and Russian Poland. If the player is playing Russia (or a Central Power occupying Russian territory), these defaults may be changed by player action.
- Baltic independence: as Russian imperial authority collapses in 1917-1918 and German forces occupy the region, expect Estonia, Latvia, and Lithuania to each declare independence rather than remaining under Russian or German control once the war's outcome is decided - unless the player, playing Russia or Germany, specifically acts to prevent or reverse this.
- Balkan and South Slav reorganization: if Austria-Hungary's war effort collapses, expect its South Slav territories - Croatia, Slovenia, Bosnia - to seek union with the Kingdom of Serbia rather than remaining under a defeated Habsburg government, forming a new Kingdom of Serbs, Croats and Slovenes. This is contingent on Austria-Hungary's actual collapse, not automatic.
- US entry: expect the United States to remain neutral through 1914-1916 barring a major provocation. Historically, unrestricted German submarine warfare against merchant shipping triggered the April 1917 declaration of war; a different German policy or a different provocation can shift this timeline earlier, later, or not at all.
- Ottoman fronts and the Arab Revolt: expect Ottoman authority to weaken across its Arab provinces as the war continues, particularly if British-backed Arab forces gain ground; whether this produces independent Arab polities, British/French mandates, or continued Ottoman control depends on how the relevant fronts actually play out in-game.

Newly-declared or reorganized polities without an existing flag should receive one appropriate to their stated government type and origin rather than remaining unflagged.`},
 {id:3,title:'World War II: The Road to War',category:'historical',by:'Map Painter 1',plays:'0',rounds:'0',copies:'0',favs:'0',start:'March 7th, 1936 AD',startYear:1936,type:'Historical · Total War',
   startDate:'1936-03-07', era:'1936',
   img:'https://images.unsplash.com/photo-1509023464722-18d996393ca8?q=80&w=1400&auto=format&fit=crop',
   about:'Nazi Germany has just marched troops back into the demilitarized Rhineland - a direct violation of Versailles and Locarno that the Western powers, historically, chose not to contest. Nothing about the next decade is fixed yet: the Spanish Civil War hasn\'t started, the Anschluss hasn\'t happened, Munich hasn\'t been signed, and the invasion of Poland is still three and a half years away. This is the widest window to genuinely rewrite the road to war.',
   before:`Adolf Hitler has been Chancellor of Germany since January 1933 and has spent three years consolidating absolute power, withdrawing from the League of Nations, and openly rearming in violation of Versailles. On March 7th, 1936, German troops have entered the Rhineland, a demilitarized buffer zone under the treaty. France's own military and political leadership is currently unwilling to mobilize over this alone, and Britain is not inclined to support a French intervention - but this restraint is a political choice being made right now, not a fixed outcome. Elsewhere, Fascist Italy's invasion of Ethiopia (begun October 1935) has nearly run its course, with Italian forces closing in on Addis Ababa. Imperial Japan continues to expand its influence in China following the 1931 seizure of Manchuria. The Spanish Republic remains politically unstable but has not yet fractured into civil war.

Ethiopia at this stage still controls the great majority of its territory in the game's opening days, but Italian forces are on the verge of taking the capital - expect this to conclude within the first few rounds absent player intervention (see Simulation Rules).`,
   rules:`Every polity should weigh its actual 1936 military readiness, economic capacity, and internal politics before acting - no polity should act against its own realistic interests without an in-fiction reason. The player controls only their own polity, and may attempt to shape other polities' behavior only through diplomacy, trade, political pressure, or war, never by direct authorial control over another actor.

As with any preset on this granular a map, treat a polity's region as transferring to an invader only once that invader controls the entire region, not a partial incursion into it - this matters especially for polities represented by a single large region rather than many smaller ones. Maintain continuous, geographically logical front lines during any war rather than territorial jumps.

Because this start predates most of the interwar crises, treat each of the following as its own live decision point with a historical default outcome, changeable by any relevant polity's actions:
- Italian East Africa: if Fascist Italy completes its conquest of Ethiopia (on the historical timeline, this concludes within weeks of this preset's start), Italy will merge Eritrea, Ethiopia, and Italian Somaliland into a single polity, "Italian East Africa" - unless the player specifically intervenes to prevent Ethiopia's fall or to keep the territories administered separately.
- The Rhineland crisis itself: absent a French/British response, Germany keeps the remilitarized Rhineland and treats this as proof that further violations of Versailles will go unchallenged, emboldening the pace of subsequent German actions below. A French mobilization or Franco-British ultimatum at this stage is a legitimate divergence with real downstream consequences.
- The Spanish Civil War: expect a military uprising against the Spanish Republic around July 1936, drawing in German and Italian support for the Nationalists and Soviet support for the Republicans as a proxy conflict. Whether, when, and how this happens can shift based on the political situation the game has produced in Spain by that point.
- The Anschluss: expect German pressure on Austria to escalate toward outright annexation around 1938 if Germany's position has strengthened unopposed - not automatic if earlier crises have played out differently.
- Sudetenland and Munich: expect a crisis over the German-speaking Sudetenland region of Czechoslovakia around late 1938, with Britain and France historically choosing to accept German annexation rather than go to war over it - contingent on how German confidence and Franco-British resolve have evolved by that point.
- The road to Poland: absent divergence, expect German pressure on Poland to escalate through 1939, culminating in invasion around September 1st, 1939, and general European war shortly after. Every step of this chain is conditional on what has actually happened earlier in this specific playthrough, not scripted to occur regardless of player action.

Newly-declared or reorganized polities without an existing flag should receive one appropriate to their government type rather than remaining unflagged.`},
 {id:1,title:'World War II',category:'historical',by:'Map Painter 1',plays:'1,100,203',rounds:'11,004,552',copies:'41,220',favs:'3,102',start:'September 1st, 1939 AD',startYear:1939,type:'Historical · Total War',
   startDate:'1939-09-01', era:'1939',
   img:'https://images.unsplash.com/photo-1580130379624-3a069adbffb3?q=80&w=1400&auto=format&fit=crop',
   about:'The opening days of the deadliest conflict in human history. Command a great power - or a small one caught between them - as the front lines are still being drawn.',
   before:`The interwar period played out historically: the Great Depression, Hitler's 1933 rise to power, German rearmament, the 1936 Rhineland remilitarization, the 1938 Anschluss with Austria, the Munich Agreement ceding the Sudetenland, and Germany's occupation of the remainder of Czechoslovakia in March 1939. The Molotov-Ribbentrop Pact (August 1939) has secured German-Soviet non-aggression and secretly divided Eastern Europe into spheres of influence. German forces have just invaded Poland on September 1st; Britain and France have issued ultimatums demanding withdrawal, which Germany has not met, putting both nations on the verge of declaring war. The Soviet Union, per its pact with Germany, is expected to occupy eastern Poland shortly after the German invasion begins.`,
   rules:`Every polity should weigh its real 1939 military readiness, industrial capacity, and diplomatic alignments before acting. Combat should resolve based on supply lines, industrial output, and troop readiness rather than raw territory count. The player controls only their own polity; they may shape others' behavior only through diplomacy, trade, or war, never by direct control over another actor's decisions.

Region transfers follow the same size-dependent logic as any preset on this map: a polity represented by one large region only loses it once an invader controls the whole of it, not a partial advance; polities split across many regions should have each region transferred individually as it actually falls, and any invading force should hold a continuous, geographically logical front rather than jumping to disconnected territory (except where a specific naval or airborne operation legitimately explains an out-of-sequence landing).

Historical inflection points with a default outcome, changeable by in-game action:
- The Soviet invasion of Poland: expect Soviet forces to occupy eastern Poland within roughly two and a half weeks of the German invasion beginning, per the secret protocol of the Molotov-Ribbentrop Pact, absent a change in Soviet policy or a Polish collapse/resistance that alters the timeline.
- The Phoney War and the fall of France: expect a period of limited Western Front activity through the winter of 1939-40, followed by a German invasion of Denmark and Norway (April 1940), then the Low Countries and France (May 1940). Absent divergence, expect France to fall within about six weeks, split into German-occupied northern France and the unoccupied "Free Zone" administered from Vichy - treat Vichy France as its own polity, not a simple continuation of the prior French government, once this occurs.
- The Battle of Britain and the invasion question: expect a German air campaign against Britain in summer/autumn 1940 as a precondition for any cross-Channel invasion; whether Germany actually attempts a landing depends on how the air campaign and Britain's response actually play out in-game.
- Operation Barbarossa: if Germany invades the Soviet Union (historically June 22nd, 1941), maintain a continuous front line across the entire western Soviet frontier rather than isolated advances, and pay particular attention to the Baltic states and Ukraine - both should only transfer to German control region-by-region as actually occupied, not assumed to fall simply because the broader invasion is underway. Whether Barbarossa happens at all, when, and how far it advances are all determined by the actual state of German-Soviet relations and German strategic priorities in this specific playthrough.
- Axis client and puppet states: expect German- or Italian-aligned client governments to form in occupied or allied territory where the underlying occupation or political conditions that produced them actually occur in-game (e.g., a collaborationist government in occupied Serbia, an independent Croatian state, a Slovak Republic aligned with Germany) - these are consequences of in-game events, not scripted certainties.
- US entry: expect the United States to remain formally neutral (while materially supporting Britain via Lend-Lease from March 1941) until a direct attack - historically, Japan's December 7th, 1941 attack on Pearl Harbor, followed by Germany's own declaration of war on the US days later. A different Japanese or German choice at this juncture is a legitimate divergence with real consequences for the timeline.

Newly-declared or reorganized polities without an existing flag should receive one matching their stated government type rather than remaining unflagged.`},
];

// ---- Flags gallery data ---------------------------------------------------
// Two sources feed the Flags screen: real national flags (public-domain,
// sourced from flagcdn.com the same way the in-game Chat/Country Detail
// panels already do) and a small set of ORIGINAL fictional flags built here
// as inline SVG, organized by geographic category tabs, each with a
// description that can include an auto-assign trigger condition.
// Mirrored 1:1 from Map Painter 2's static/menu.js — keep both in sync.

// ISO3 -> ISO2, copied from game.js's own ISO3_TO_ISO2 (menu.html never
// loads game.js, so this can't just be read off window there — duplicated
// here on purpose, same as COUNTRIES' iso3 fields already are).
const ISO3_TO_ISO2 = {'ABW':'aw','AFG':'af','AGO':'ao','AIA':'ai','ALA':'ax','ALB':'al','AND':'ad','ARE':'ae','ARG':'ar','ARM':'am','ASM':'as','ATA':'aq','ATF':'tf','ATG':'ag','AUS':'au','AUT':'at','AZE':'az','BDI':'bi','BEL':'be','BEN':'bj','BES':'bq','BFA':'bf','BGD':'bd','BGR':'bg','BHR':'bh','BHS':'bs','BIH':'ba','BLM':'bl','BLR':'by','BLZ':'bz','BMU':'bm','BOL':'bo','BRA':'br','BRB':'bb','BRN':'bn','BTN':'bt','BVT':'bv','BWA':'bw','CAF':'cf','CAN':'ca','CCK':'cc','CHE':'ch','CHL':'cl','CHN':'cn','CIV':'ci','CMR':'cm','COD':'cd','COG':'cg','COK':'ck','COL':'co','COM':'km','CPV':'cv','CRI':'cr','CUB':'cu','CUW':'cw','CXR':'cx','CYM':'ky','CYP':'cy','CZE':'cz','DEU':'de','DJI':'dj','DMA':'dm','DNK':'dk','DOM':'do','DZA':'dz','ECU':'ec','EGY':'eg','ERI':'er','ESH':'eh','ESP':'es','EST':'ee','ETH':'et','FIN':'fi','FJI':'fj','FLK':'fk','FRA':'fr','FRO':'fo','FSM':'fm','GAB':'ga','GBR':'gb','GEO':'ge','GGY':'gg','GHA':'gh','GIB':'gi','GIN':'gn','GLP':'gp','GMB':'gm','GNB':'gw','GNQ':'gq','GRC':'gr','GRD':'gd','GRL':'gl','GTM':'gt','GUF':'gf','GUM':'gu','GUY':'gy','HKG':'hk','HMD':'hm','HND':'hn','HRV':'hr','HTI':'ht','HUN':'hu','IDN':'id','IMN':'im','IND':'in','IOT':'io','IRL':'ie','IRN':'ir','IRQ':'iq','ISL':'is','ISR':'il','ITA':'it','JAM':'jm','JEY':'je','JOR':'jo','JPN':'jp','KAZ':'kz','KEN':'ke','KGZ':'kg','KHM':'kh','KIR':'ki','KNA':'kn','KOR':'kr','KWT':'kw','LAO':'la','LBN':'lb','LBR':'lr','LBY':'ly','LCA':'lc','LIE':'li','LKA':'lk','LSO':'ls','LTU':'lt','LUX':'lu','LVA':'lv','MAC':'mo','MAF':'mf','MAR':'ma','MCO':'mc','MDA':'md','MDG':'mg','MDV':'mv','MEX':'mx','MHL':'mh','MKD':'mk','MLI':'ml','MLT':'mt','MMR':'mm','MNE':'me','MNG':'mn','MNP':'mp','MOZ':'mz','MRT':'mr','MSR':'ms','MTQ':'mq','MUS':'mu','MWI':'mw','MYS':'my','MYT':'yt','NAM':'na','NCL':'nc','NER':'ne','NFK':'nf','NGA':'ng','NIC':'ni','NIU':'nu','NLD':'nl','NOR':'no','NPL':'np','NRU':'nr','NZL':'nz','OMN':'om','PAK':'pk','PAN':'pa','PCN':'pn','PER':'pe','PHL':'ph','PLW':'pw','PNG':'pg','POL':'pl','PRI':'pr','PRK':'kp','PRT':'pt','PRY':'py','PSE':'ps','PYF':'pf','QAT':'qa','REU':'re','ROU':'ro','RUS':'ru','RWA':'rw','SAU':'sa','SDN':'sd','SEN':'sn','SGP':'sg','SGS':'gs','SHN':'sh','SJM':'sj','SLB':'sb','SLE':'sl','SLV':'sv','SMR':'sm','SOM':'so','SPM':'pm','SRB':'rs','SSD':'ss','STP':'st','SUR':'sr','SVK':'sk','SVN':'si','SWE':'se','SWZ':'sz','SXM':'sx','SYC':'sc','SYR':'sy','TCA':'tc','TCD':'td','TGO':'tg','THA':'th','TJK':'tj','TKL':'tk','TKM':'tm','TLS':'tl','TON':'to','TTO':'tt','TUN':'tn','TUR':'tr','TUV':'tv','TWN':'tw','TZA':'tz','UGA':'ug','UKR':'ua','UMI':'um','URY':'uy','USA':'us','UZB':'uz','VAT':'va','VCT':'vc','VEN':'ve','VGB':'vg','VIR':'vi','VNM':'vn','VUT':'vu','WLF':'wf','WSM':'ws','XKX':'xk','YEM':'ye','ZAF':'za','ZMB':'zm','ZWE':'zw'};

// Real-country ISO3 -> geographic category, covering every entry in
// Geo/country_lookup.json (except the numeric disputed-territory codes and
// Antarctica, which aren't flag-bearing sovereign states). Categories match
// the tabs in the Flags screen.
const COUNTRY_REGIONS = {
  ALB:'europe',AND:'europe',AUT:'europe',BEL:'europe',BGR:'europe',BIH:'europe',BLR:'europe',CHE:'europe',CYP:'europe',CZE:'europe',
  DEU:'europe',DNK:'europe',ESP:'europe',EST:'europe',FIN:'europe',FRA:'europe',GBR:'europe',GRC:'europe',GRL:'north_america',HRV:'europe',
  HUN:'europe',IRL:'europe',ISL:'europe',ITA:'europe',LIE:'europe',LTU:'europe',LUX:'europe',LVA:'europe',MCO:'europe',MDA:'europe',
  MKD:'europe',MLT:'europe',MNE:'europe',NLD:'europe',NOR:'europe',POL:'europe',PRT:'europe',ROU:'europe',RUS:'europe',SMR:'europe',
  SRB:'europe',SVK:'europe',SVN:'europe',SWE:'europe',UKR:'europe',VAT:'europe',XKX:'europe',
  CAN:'north_america',MEX:'north_america',USA:'north_america',
  BLZ:'central_america',CRI:'central_america',GTM:'central_america',HND:'central_america',NIC:'central_america',PAN:'central_america',SLV:'central_america',
  ATG:'caribbean',BHS:'caribbean',BRB:'caribbean',CUB:'caribbean',DMA:'caribbean',DOM:'caribbean',GRD:'caribbean',HTI:'caribbean',
  JAM:'caribbean',KNA:'caribbean',LCA:'caribbean',TTO:'caribbean',VCT:'caribbean',
  ARG:'south_america',BOL:'south_america',BRA:'south_america',CHL:'south_america',COL:'south_america',ECU:'south_america',GUY:'south_america',
  PER:'south_america',PRY:'south_america',SUR:'south_america',URY:'south_america',VEN:'south_america',
  AGO:'africa',BDI:'africa',BEN:'africa',BFA:'africa',BWA:'africa',CAF:'africa',CIV:'africa',CMR:'africa',COD:'africa',COG:'africa',
  COM:'africa',CPV:'africa',DJI:'africa',DZA:'africa',EGY:'africa',ERI:'africa',ESH:'africa',ETH:'africa',GAB:'africa',GHA:'africa',
  GIN:'africa',GMB:'africa',GNB:'africa',GNQ:'africa',KEN:'africa',LBR:'africa',LBY:'africa',LSO:'africa',MAR:'africa',MDG:'africa',
  MLI:'africa',MOZ:'africa',MRT:'africa',MUS:'africa',MWI:'africa',NAM:'africa',NER:'africa',NGA:'africa',RWA:'africa',SDN:'africa',
  SEN:'africa',SLE:'africa',SOM:'africa',SOML:'africa',SSD:'africa',STP:'africa',SWZ:'africa',SYC:'africa',TCD:'africa',TGO:'africa',
  TUN:'africa',TZA:'africa',UGA:'africa',ZAF:'africa',ZMB:'africa',ZWE:'africa',
  AFG:'asia',ARE:'asia',ARM:'asia',AZE:'asia',BGD:'asia',BHR:'asia',BRN:'asia',BTN:'asia',CHN:'asia',GEO:'asia',IDN:'asia',
  IND:'asia',IRN:'asia',IRQ:'asia',ISR:'asia',JOR:'asia',JPN:'asia',KAZ:'asia',KGZ:'asia',KHM:'asia',KOR:'asia',KWT:'asia',
  LAO:'asia',LBN:'asia',LKA:'asia',MDV:'asia',MMR:'asia',MNG:'asia',MYS:'asia',NPL:'asia',OMN:'asia',PAK:'asia',PHL:'asia',
  PRK:'asia',PSE:'asia',QAT:'asia',SAU:'asia',SGP:'asia',SYR:'asia',THA:'asia',TJK:'asia',TKM:'asia',TLS:'asia',TUR:'asia',
  TWN:'asia',UZB:'asia',VNM:'asia',YEM:'asia',
  AUS:'oceania',FJI:'oceania',FSM:'oceania',KIR:'oceania',MHL:'oceania',NRU:'oceania',NZL:'oceania',PLW:'oceania',PNG:'oceania',
  SLB:'oceania',TON:'oceania',TUV:'oceania',VUT:'oceania',WSM:'oceania'
};

const FLAG_CATEGORIES = [
  {id:'all', label:'All'},
  {id:'europe', label:'European Flags'},
  {id:'north_america', label:'North America'},
  {id:'central_america', label:'Central America'},
  {id:'caribbean', label:'Caribbean'},
  {id:'south_america', label:'South America'},
  {id:'africa', label:'African Flags'},
  {id:'asia', label:'Asian Flags'},
  {id:'oceania', label:'Oceania'}
];

// Original fictional/alt-history flags. `trigger` (when present) is an
// "auto-assigned when..." mechanic: it's read by game.js's
// runJumpForward() and, when a brand-new custom country's government
// changes to a matching type, that country's flag is set automatically via
// setCountryFlagOverride() (see FICTIONAL_FLAG_TRIGGERS there — kept as a
// small, separate copy since menu.js and game.js run on different pages and
// don't share scope). Established real nations are never auto-reflagged —
// only newly-minted custom/breakaway countries are eligible.
const FICTIONAL_FLAGS = [
  {id:'fic-eurasia', name:'Union of Eurasian Republics', category:'asia', years:'2026-present',
    spec:{layout:'horizontal', colors:['#1c3f94','#ffffff','#a3252a']}, symbol:null,
    description:'A speculative successor state spanning the former Soviet space, formed if a communist successor government reunifies several ex-Soviet republics under one banner.',
    trigger:{govType:'communist state', note:'a newly-formed country in Central/East Asia adopts a communist state government'}},
  {id:'fic-junta-standard', name:'Junta Standard', category:'south_america', years:'design template',
    spec:{layout:'horizontal', colors:['#2b2b2b','#8a1f1f','#2b2b2b'], symbol:'star', symbolColor:'#e0b84a'},
    description:'A generic military-junta banner: dark bars framing a central command color, with a single command star. Assigned to newly-declared military governments that don\'t yet have their own flag.',
    trigger:{govType:'military junta', note:'a newly-formed country anywhere adopts a military junta government'}},
  {id:'fic-revolutionary-tricolor', name:'Revolutionary Tricolor', category:'europe', years:'design template',
    spec:{layout:'vertical', colors:['#1c3f94','#ffffff','#c0392b']},
    description:'A plain liberal-revolutionary tricolor, evoking the classic 18th/19th-century revolutionary banners. Assigned to newly-declared revolutionary governments that don\'t yet have their own flag.',
    trigger:{govType:'revolutionary government', note:'a newly-formed country anywhere adopts a revolutionary government'}},
  {id:'fic-provisional-banner', name:'Provisional Banner', category:'africa', years:'design template',
    spec:{layout:'horizontal', colors:['#4a4a4a','#ffffff']},
    description:'A deliberately plain, unadorned banner used as a placeholder by governments still in transition. Assigned to newly-declared provisional governments that don\'t yet have their own flag.',
    trigger:{govType:'provisional government', note:'a newly-formed country anywhere adopts a provisional government'}},
  {id:'fic-kingdom-elysia', name:'Kingdom of Elysia', category:'europe', years:'1500-present',
    spec:{layout:'solid', colors:['#5c1a3d'], symbol:'circle', symbolColor:'#d9a441'},
    description:'A fictional continental monarchy used in several community alt-history presets — deep purple field with a gold dynastic roundel.'},
  {id:'fic-ofita', name:'OFITA', category:'africa', years:'2026-present',
    spec:{layout:'solid', colors:['#0d3b2e'], symbol:'star', symbolColor:'#d9a441'},
    description:'A fictional West African federation flag — forest green field with a single gold star of unity.'},
  {id:'fic-surrey', name:'Surrey', category:'europe', years:'2014-present',
    spec:{layout:'vertical', colors:['#f4c400','#1c3f94']},
    description:'A fictional English breakaway county flag — gold and royal blue halves.'},
  {id:'fic-leikovia', name:'Leikovia', category:'europe', years:'2022-present',
    spec:{layout:'diagonal', colors:['#c98a7a','#4a7fc9']},
    description:'A fictional Baltic-adjacent micro-state flag — a clay-pink field split by a cool blue diagonal.'},
  {id:'fic-kolacia', name:'Kolacia', category:'europe', years:'2023-present',
    spec:{layout:'horizontal', colors:['#ffffff','#2f9e44']},
    description:'A fictional Central European republic flag — white over green.'},
  {id:'fic-pink-french', name:'Pink French Republic', category:'europe', years:'2025-present',
    spec:{layout:'vertical', colors:['#c084fc','#ffffff','#c084fc']},
    description:'A fictional alt-history French republic flag, playing on the classic tricolor layout with an unusual palette.'},
  {id:'fic-iron-front', name:'Eiserne Front (Iron Front)', category:'europe', years:'1931-1933',
    spec:{layout:'solid', colors:['#7d1616'], symbol:'circle', symbolColor:'#111111'},
    description:'A fictional anti-fascist paramilitary banner used in several interwar-Europe presets — deep red field with a black roundel.'},
  {id:'fic-krolewiec', name:'Krolewiec', category:'europe', years:'2034-2054',
    spec:{layout:'vertical', colors:['#1c3f94','#c0392b']},
    description:'A fictional near-future Baltic exclave flag — royal blue and crimson halves.'},
  {id:'fic-valantia', name:'Valantia', category:'europe', years:'1209-1530',
    spec:{layout:'solid', colors:['#12203f'], symbol:'circle', symbolColor:'#ffffff'},
    description:'A fictional medieval maritime republic flag — midnight field with a plain white roundel.'},
  {id:'fic-khammouane', name:'Khammouane Province', category:'asia', years:'2024-present',
    spec:{layout:'vertical', colors:['#1c3f94','#c0392b']},
    description:'A fictional breakaway Southeast Asian provincial flag — blue and crimson halves.'}
];

// Renders a flag's SVG art from a compact spec rather than a full markup
// string per flag, so each entry above only needs to describe a layout +
// palette. Kept deliberately simple (stripes/solid/diagonal/canton + one
// optional emblem) — original geometry, not modeled on any specific
// real-world or third-party flag.
function buildFlagSVG(spec){
  if (!spec) return '';
  const W = 300, H = 200;
  let bg = '';
  if (spec.layout === 'horizontal') {
    const n = spec.colors.length, h = H / n;
    bg = spec.colors.map((c,i)=>`<rect x="0" y="${i*h}" width="${W}" height="${h}" fill="${c}"/>`).join('');
  } else if (spec.layout === 'vertical') {
    const n = spec.colors.length, w = W / n;
    bg = spec.colors.map((c,i)=>`<rect x="${i*w}" y="0" width="${w}" height="${H}" fill="${c}"/>`).join('');
  } else if (spec.layout === 'diagonal') {
    bg = `<rect width="${W}" height="${H}" fill="${spec.colors[0]}"/><polygon points="0,0 ${W},0 0,${H}" fill="${spec.colors[1]}"/>`;
  } else {
    bg = `<rect x="0" y="0" width="${W}" height="${H}" fill="${spec.colors[0]}"/>`;
  }
  let symbol = '';
  if (spec.symbol === 'star') {
    symbol = `<text x="${W/2}" y="${H/2+14}" font-size="46" text-anchor="middle" fill="${spec.symbolColor||'#fff'}">★</text>`;
  } else if (spec.symbol === 'circle') {
    symbol = `<circle cx="${W/2}" cy="${H/2}" r="${H*0.22}" fill="${spec.symbolColor||'#fff'}"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">${bg}${symbol}</svg>`;
}

// Real countries are only fetched once (matches the country_lookup.json
// fetch already done elsewhere for custom-entity code minting) then cached,
// since the Flags screen re-filters client-side on every tab/search change.
let REAL_COUNTRY_FLAG_CACHE = null;
async function loadRealCountryFlags(){
  if (REAL_COUNTRY_FLAG_CACHE) return REAL_COUNTRY_FLAG_CACHE;
  try {
    const lookup = await fetch('./Geo/country_lookup.json').then(r=>r.json());
    REAL_COUNTRY_FLAG_CACHE = Object.keys(lookup)
      .filter(code => COUNTRY_REGIONS[code])
      .map(code => ({ id:'real-'+code, kind:'real', code:code, name:lookup[code], category:COUNTRY_REGIONS[code] }));
  } catch (e) { REAL_COUNTRY_FLAG_CACHE = []; }
  return REAL_COUNTRY_FLAG_CACHE;
}

let flagCategory = 'all';
function setFlagCategory(cat){
  flagCategory = cat;
  document.querySelectorAll('#menu-shell .fpill').forEach(p=>p.classList.toggle('active', p.dataset.cat===cat));
  renderFlags();
}
function buildFlagCardHTML(f){
  const art = f.kind === 'real'
    ? `<img src="https://flagcdn.com/w320/${(ISO3_TO_ISO2[f.code]||'').toLowerCase()}.png" loading="lazy" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
    : buildFlagSVG(f.spec);
  const years = f.kind === 'real' ? 'Current' : (f.years || '');
  return `<div class="flag-card" style="cursor:pointer;" onclick="openFlagDetail('${f.id}')">
    <div class="flag-art">${art}</div>
    <div class="flag-card-info"><div class="fname">${f.name}</div><div class="fyear">${years}</div></div>
  </div>`;
}

const SWATCHES = ['#ff6b6b','#ff9f43','#ffd43b','#69db7c','#38d9a9','#4dabf7','#748ffc','#b197fc','#f783ac','#f1f3f5',
'#e8590c','#f08c00','#94d82d','#20c997','#22b8cf','#3b5bdb','#7048e8','#ae3ec9','#868e96','#212529'];

/* Load any locally-edited "Simulation Rules" text over the base presets. */
function loadPresets(){
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem('mp1_preset_rules') || '{}'); } catch(e){}
  return BASE_PRESETS.map(p => overrides[p.id] ? {...p, rules: overrides[p.id]} : {...p});
}
function saveRulesOverride(presetId, text){
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem('mp1_preset_rules') || '{}'); } catch(e){}
  overrides[presetId] = text;
  localStorage.setItem('mp1_preset_rules', JSON.stringify(overrides));
}

let PRESETS = loadPresets();

let mstate = {
  navScreen:'games',
  currentPreset:0,
  pickerTab:'picks',
  selectedCountry:null,
  entityColor:'#ff6b6b',
  customRegions:[],
  difficulty:'Normal',
};
let pickingRegionsFor=null;

/* ================= NAV ================= */
function go(screen){
  document.querySelectorAll('#menu-shell .screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+screen).classList.add('active');
  document.querySelectorAll('#menu-shell .nav-item').forEach(n=>n.classList.toggle('active',n.dataset.screen===screen));
  mstate.navScreen=screen;
  window.scrollTo({top:0,behavior:'instant'});
}

/* ================= GAMES SCREEN ================= */
// Checks the SAME localStorage key the map game itself reads/writes
// (mappainter1_gamestate_v1) rather than the old Flask backend's /api/state
// — there's no server involved anymore, so this just needs to know whether a
// save exists in this browser.
function renderGames(){
  const continueRow = document.getElementById('continue-row');
  let active = null;
  try {
    const raw = localStorage.getItem(GAME_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.playerCountry) active = parsed;
    }
  } catch(e){}

  if (active){
    const code = active.playerCountry;
    const displayName = (active.customCountries && active.customCountries[code]) || code;
    // Save name set by launchGame() ("Map Painter 1 · MM/DD/YY · Nation");
    // saves without one fall back to the game name + nation.
    const saveName = active.saveName || ('Map Painter 1 · ' + displayName);
    continueRow.innerHTML = `
      <div class="game-card" onclick="resumeGame()">
        <div class="game-thumb" style="background:linear-gradient(135deg,#3a3a5e,#0a0e1e)">
          <span class="tag">${displayName}</span>
        </div>
        <div class="game-info"><div class="title">${saveName}</div><div class="meta">Round ${active.round || 1} · ${active.currentDate || '2016-01-01'} · Singleplayer</div></div>
      </div>`;
  } else {
    continueRow.innerHTML = `<div class="empty-card"><span>No active game</span><a onclick="go('presets')">Browse Presets →</a></div>`;
  }
}
function resumeGame(){
  window.location.href = MAP_GAME_URL;
}

/* ================= PRESETS SCREEN ================= */
function renderPresets(){
  document.getElementById('hero-dots').innerHTML = PRESETS.map((_,i)=>`<span class="${i===0?'on':''}"></span>`).join('');
  const first = PRESETS[0];
  document.getElementById('hero-title').textContent = first.title;
  document.getElementById('hero-stats').textContent = `${first.rounds} rounds · ${first.plays} games`;
  document.getElementById('hero-desc').textContent = first.about;
  document.getElementById('hero-banner').style.backgroundImage = `url('${first.img}')`;
  document.getElementById('preset-grid').innerHTML = PRESET_CATEGORIES.map(cat=>{
    const items = PRESETS.filter(p=>p.category===cat.id);
    if (!items.length) return '';
    return `<div style="grid-column:1/-1;">
      <div class="section-title" style="margin-top:8px;">${cat.label}<span class="see-all">See all <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg></span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px;">
        ${items.map((p,i)=>`
          <div class="preset-card" onclick="openPresetDetail(${p.id})">
            <div class="preset-thumb" style="background-image:url('${p.img}')"><span class="rank-badge">${i+1}</span></div>
            <div class="preset-info"><div class="title">${p.title}</div><div class="meta">${p.rounds} rounds · ${p.plays} games</div></div>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

/* ================= PRESET DETAIL ================= */
function renderPresetDetailMap(){
  var svg = document.getElementById('detail-map');
  if (!svg) return;
  var preset = (typeof PRESETS !== 'undefined' && PRESETS.find) ? PRESETS.find(function(pp){ return pp.id === mstate.currentPreset; }) : null;
  var eraKey = (preset && preset.era) || 'modern';
  if (typeof PRESET_MAP_GEO === 'undefined' || !PRESET_MAP_GEO.countries) { drawMap(svg,false); return; }
  var table = (typeof PRESET_MAP_OWNERS !== 'undefined' && PRESET_MAP_OWNERS[eraKey]) || {};
  var colors = (typeof PRESET_MAP_ERA_COLORS !== 'undefined' && PRESET_MAP_ERA_COLORS[eraKey]) || {};
  var html = '<rect width="1000" height="500" fill="#182a63"/><g stroke="#0d1526" stroke-width="0.45" stroke-linejoin="round" fill-opacity="0.92">';
  PRESET_MAP_GEO.countries.forEach(function(entry){
    var code = entry[0], d = entry[1];
    var owner = table[code] || code;
    var fill = colors[owner] || presetMapCountryColor(owner);
    html += '<path d="' + d + '" fill="' + fill + '"/>';
  });
  var carves = (PRESET_MAP_GEO.carves && PRESET_MAP_GEO.carves[eraKey]) || [];
  carves.forEach(function(entry){
    var owner = entry[0], d = entry[1];
    var fill = colors[owner] || presetMapCountryColor(owner);
    html += '<path d="' + d + '" fill="' + fill + '" stroke="none"/>';
  });
  html += '</g>';
  svg.innerHTML = html;
}

function openPresetDetail(id){
  const p=PRESETS.find(x=>x.id===id);
  mstate.currentPreset=id;
  document.getElementById('detail-hero').style.backgroundImage=`url('${p.img}')`;
  document.getElementById('detail-title').textContent=p.title;
  document.getElementById('detail-by').textContent='by '+p.by;
  document.getElementById('detail-start').textContent='Starts '+p.start;
  document.getElementById('detail-type').textContent=p.type;
  document.getElementById('detail-about').textContent=p.about;
  document.getElementById('detail-before').textContent=p.before;
  document.getElementById('detail-rules-view').textContent=p.rules;
  document.getElementById('detail-rules-edit').value=p.rules;
  document.getElementById('detail-rules-view').classList.remove('hidden');
  document.getElementById('detail-rules-box').classList.remove('active');
  document.getElementById('detail-stats').innerHTML=`
    <div class="stat"><div class="n">${p.plays}</div><div class="l">Plays</div></div>
    <div class="stat"><div class="n">${p.rounds}</div><div class="l">Rounds</div></div>
    <div class="stat"><div class="n">${p.copies}</div><div class="l">Copies</div></div>
    <div class="stat"><div class="n">${p.favs}</div><div class="l">Favorites</div></div>`;
  renderPresetDetailMap();
  go('detail');
}
function toggleRulesEdit(on){
  document.getElementById('detail-rules-view').classList.toggle('hidden', on);
  document.getElementById('detail-rules-box').classList.toggle('active', on);
}
function saveRules(){
  const p = PRESETS.find(x=>x.id===mstate.currentPreset);
  const text = document.getElementById('detail-rules-edit').value.trim();
  p.rules = text;
  saveRulesOverride(p.id, text);
  document.getElementById('detail-rules-view').textContent = text;
  toggleRulesEdit(false);
}

/* ================= FLAGS ================= */
async function renderFlags(){
  const real = await loadRealCountryFlags();
  const combined = real.concat(FICTIONAL_FLAGS.map(f=>Object.assign({kind:'fictional'}, f)));
  const q = (document.getElementById('flag-search-input') && document.getElementById('flag-search-input').value || '').toLowerCase();
  const filtered = combined.filter(f => (flagCategory==='all' || f.category===flagCategory) && f.name.toLowerCase().includes(q));
  document.getElementById('flag-grid').innerHTML = filtered.map(buildFlagCardHTML).join('') ||
    `<div style="padding:30px;text-align:center;color:var(--m-text-faint);font-size:13px;grid-column:1/-1;">No flags match this filter.</div>`;
}
function openFlagDetail(id){
  const real = REAL_COUNTRY_FLAG_CACHE || [];
  const f = real.find(x=>x.id===id) || FICTIONAL_FLAGS.find(x=>x.id===id);
  if (!f) return;
  document.getElementById('flag-detail-art').innerHTML = f.spec
    ? buildFlagSVG(f.spec)
    : `<img src="https://flagcdn.com/w320/${(ISO3_TO_ISO2[f.code]||'').toLowerCase()}.png" style="width:100%;height:100%;object-fit:cover;">`;
  document.getElementById('flag-detail-name').textContent = f.name;
  document.getElementById('flag-detail-years').textContent = f.years || 'Current national flag';
  document.getElementById('flag-detail-desc').textContent = f.description || ('The current national flag of ' + f.name + '.');
  const triggerEl = document.getElementById('flag-detail-trigger');
  if (f.trigger) { triggerEl.style.display = 'block'; triggerEl.textContent = 'Auto-assigned when: ' + f.trigger.note + '.'; }
  else { triggerEl.style.display = 'none'; }
  document.getElementById('flag-detail-overlay').classList.add('active');
}
function closeFlagDetail(){ document.getElementById('flag-detail-overlay').classList.remove('active'); }

/* ================= WORLD MAP (real country outlines — Natural Earth 1:110m
   admin-0 countries, public domain, simplified with Douglas-Peucker for a
   small thumbnail footprint) ================= */
const CONTINENTS = [
 "1000.0,294.6 1000.0,296.0 996.5,297.3 996.1,296.2 1000.0,294.6",
 "994.8,298.6 996.4,299.0 996.0,300.4 992.7,300.5 993.5,298.3 994.8,298.6",
 "594.2,252.6 604.7,258.6 604.9,260.2 608.9,263.0 607.6,266.4 609.6,269.0 608.9,273.6 612.0,278.7 609.8,280.3 601.4,282.6 596.0,282.0 593.7,276.2 585.4,273.2 582.3,268.1 581.5,262.5 585.4,259.3 584.5,253.2 594.2,252.6",
 "475.9,173.2 475.9,178.1 466.8,178.0 466.8,185.1 464.2,185.3 464.1,190.8 452.6,191.7 452.7,190.5 459.0,190.3 461.4,184.2 465.3,181.2 468.4,175.3 475.6,174.7 475.9,173.2",
 "158.8,113.9 146.0,108.8 144.9,104.6 141.3,103.5 140.8,101.2 137.5,99.2 138.9,94.7 134.1,92.9 123.7,83.9 118.2,86.4 113.8,83.3 108.3,82.5 108.4,56.4 120.8,58.6 139.5,55.0 141.4,56.2 144.1,54.2 150.7,57.0 154.4,55.1 154.8,57.2 162.6,56.1 179.9,58.6 183.6,60.0 179.7,61.4 194.6,61.2 197.6,62.8 200.6,61.4 197.7,60.2 199.5,59.3 205.1,58.9 218.2,62.1 226.5,61.7 226.2,60.0 228.7,59.5 233.0,60.4 233.0,63.1 234.8,60.9 237.0,60.9 238.2,58.1 232.0,55.3 232.2,52.2 235.5,50.2 242.0,51.9 245.8,55.0 243.3,56.4 248.5,57.0 248.5,59.8 252.2,57.6 255.5,59.4 254.7,61.5 257.4,63.3 262.3,58.9 262.4,55.9 270.5,56.5 274.2,57.9 272.3,60.7 274.3,62.2 273.9,63.6 268.5,65.5 261.8,65.1 257.4,70.1 248.0,73.3 247.9,75.1 244.6,75.5 238.2,80.8 237.0,86.3 241.1,86.7 243.6,91.4 247.5,90.9 263.9,96.4 271.5,96.8 271.9,102.0 278.0,107.8 281.7,104.0 278.3,98.1 282.7,96.8 287.4,93.0 285.3,88.7 281.9,86.7 285.2,83.7 283.0,76.9 294.9,76.5 301.7,80.2 306.7,80.4 307.5,86.2 312.1,88.3 316.1,86.8 320.6,82.4 329.5,91.8 328.3,93.5 340.7,98.3 341.8,100.6 345.1,102.0 345.3,105.1 333.2,110.4 315.6,110.5 302.5,119.9 309.3,115.8 319.3,113.2 321.7,114.6 319.1,116.5 320.9,121.6 329.1,122.5 331.9,119.4 333.9,122.4 318.4,129.0 316.3,128.8 316.2,126.5 321.0,124.2 313.5,124.6 311.7,123.0 311.7,119.3 307.7,118.2 301.4,125.0 292.0,125.0 286.6,128.8 281.3,128.8 280.1,129.3 280.7,130.9 271.0,134.2 269.1,133.4 271.8,129.0 270.7,124.0 254.5,115.8 245.4,116.3 238.0,114.8 236.6,112.8 235.7,113.9 158.8,113.9",
 "266.7,76.5 272.6,75.3 269.3,77.3 266.7,76.5",
 "278.4,47.8 275.3,46.3 276.8,45.1 283.2,45.4 288.2,47.7 278.4,47.8",
 "276.9,77.5 279.8,77.3 278.7,78.8 276.9,77.5",
 "240.0,41.7 238.5,42.8 231.1,41.9 236.5,39.9 240.0,41.7",
 "239.3,34.7 232.1,33.8 239.3,34.7",
 "231.2,31.2 234.6,32.2 229.7,33.7 226.0,30.9 231.2,31.2",
 "255.1,43.4 243.3,42.1 242.0,39.2 239.2,38.0 230.2,36.8 231.3,35.7 245.5,36.7 247.9,37.6 247.3,38.7 252.3,40.0 274.6,39.7 277.6,40.7 278.2,41.9 276.5,42.6 255.1,43.4",
 "190.9,32.9 194.8,33.3 193.9,34.2 184.6,34.1 190.9,32.9",
 "191.8,31.1 195.4,31.7 187.4,32.2 191.8,31.1",
 "345.6,107.5 342.2,111.6 344.0,110.7 345.9,111.3 344.9,112.3 351.5,113.2 350.6,115.2 352.5,114.8 353.8,118.0 352.6,120.4 349.5,120.0 349.3,117.4 346.1,119.8 344.5,119.7 346.4,118.4 343.7,117.7 335.4,117.8 336.7,116.0 335.5,115.2 340.7,109.1 344.8,106.6 345.6,107.5",
 "267.0,69.1 277.5,73.0 275.0,73.9 269.1,71.9 262.4,74.9 261.5,73.2 257.7,73.5 260.1,72.1 261.4,67.4 267.0,69.1",
 "281.2,49.0 283.8,47.9 293.8,50.6 294.2,51.9 299.3,51.2 308.9,54.1 314.0,57.8 308.9,59.1 328.2,64.3 322.4,69.4 314.7,65.6 311.1,65.9 310.7,67.5 318.6,71.2 320.4,73.9 319.4,75.9 308.9,72.9 316.2,78.0 302.7,75.2 292.1,70.3 284.1,71.6 281.8,70.6 283.6,68.6 294.6,68.2 294.6,65.8 298.2,63.1 296.4,60.9 286.5,58.6 288.3,57.9 280.7,55.1 274.2,56.3 253.7,54.4 251.4,53.4 254.3,52.2 250.3,52.2 249.4,49.3 254.4,45.7 261.6,45.0 259.5,46.8 261.7,48.5 264.3,46.3 271.3,45.1 276.1,48.0 275.7,49.8 281.2,49.0",
 "237.5,44.1 248.6,44.8 238.1,49.9 235.0,49.8 233.3,46.0 237.5,44.1",
 "158.7,38.6 169.2,34.7 177.2,34.3 176.8,36.5 174.7,37.4 158.7,38.6",
 "131.4,99.9 134.0,99.7 133.2,102.8 135.6,105.1 130.4,101.6 130.1,99.5 131.4,99.9",
 "207.0,29.7 219.9,31.1 223.1,33.6 207.8,32.3 210.5,31.5 207.0,29.7",
 "156.9,115.2 151.0,114.4 144.3,111.1 143.4,109.0 150.7,110.3 156.9,115.2",
 "162.4,43.2 173.5,43.9 179.1,45.9 168.8,48.6 165.4,51.7 158.1,53.1 150.2,50.4 155.7,45.3 153.0,43.6 162.4,43.2",
 "200.5,39.3 205.9,39.0 206.4,40.3 204.7,41.7 188.3,43.3 183.7,42.4 189.5,41.2 173.0,41.0 179.4,37.6 197.0,40.4 193.1,37.7 195.6,36.7 198.5,37.0 200.5,39.3",
 "204.1,47.0 207.2,48.1 209.8,52.8 219.5,55.5 219.2,56.7 214.6,56.9 216.4,58.0 215.5,59.0 205.7,57.8 185.2,59.6 174.1,55.7 187.7,54.5 172.5,54.1 171.0,53.0 177.5,51.9 168.3,51.2 172.6,48.0 180.0,46.3 182.9,46.9 181.5,48.2 187.7,47.3 191.5,48.7 194.7,47.3 199.5,51.0 200.9,49.8 198.9,47.0 204.1,47.0",
 "221.0,48.0 217.9,46.2 221.2,44.9 229.5,45.1 230.2,45.9 227.6,47.2 231.8,48.4 231.3,50.9 226.8,52.0 215.3,48.6 221.0,48.0",
 "203.9,45.6 209.7,46.1 207.3,47.9 203.9,45.6",
 "226.4,36.9 228.5,38.2 227.3,41.7 215.3,40.1 215.1,38.0 226.4,36.9",
 "233.3,26.1 238.1,25.1 236.8,24.4 243.3,24.3 256.1,26.9 261.6,29.6 252.7,32.5 242.0,32.4 239.0,31.2 241.3,29.5 236.2,29.5 231.4,27.3 233.3,26.1",
 "245.6,22.5 262.5,20.4 268.9,21.3 271.1,19.8 279.7,19.1 328.2,20.5 312.1,23.6 318.1,23.6 302.3,28.3 286.4,29.7 290.2,30.0 288.3,30.5 290.6,31.9 278.4,35.5 283.6,36.7 276.2,38.4 251.4,37.6 251.1,36.2 256.2,35.6 254.8,33.6 264.0,34.6 255.7,32.3 263.6,29.6 258.5,27.1 272.6,26.5 256.7,26.3 245.6,22.5",
 "291.1,62.7 286.1,63.6 285.5,62.3 289.2,60.3 291.3,61.1 291.1,62.7",
 "232.6,57.0 234.3,58.0 232.6,59.0 222.8,57.2 227.2,55.2 232.6,57.0",
 "320.8,111.5 328.3,113.6 320.8,111.5",
 "322.2,119.3 323.2,120.7 327.7,121.0 325.3,122.3 321.8,121.1 322.2,119.3",
 "158.8,113.9 235.7,113.9 236.6,112.8 238.0,114.8 245.4,116.3 254.5,115.8 270.7,124.0 271.8,129.0 269.1,133.1 270.3,134.2 280.7,130.9 280.1,129.3 281.3,128.8 286.6,128.8 292.0,125.0 301.4,125.0 307.7,118.2 311.7,119.3 311.7,123.0 314.0,125.5 305.2,128.7 303.3,132.4 305.7,134.3 295.2,136.3 300.2,136.3 294.6,136.8 291.9,141.8 290.2,140.3 291.5,143.3 289.1,146.6 289.7,144.6 287.9,141.3 288.0,144.2 286.1,143.8 288.1,144.7 289.6,151.2 274.1,162.7 274.1,166.6 277.6,175.3 276.7,180.0 274.5,180.0 273.0,178.1 267.5,166.8 263.6,167.7 260.0,165.6 251.1,166.2 251.6,169.0 241.0,167.3 237.0,168.1 230.2,172.7 230.2,178.1 229.1,178.2 224.9,176.8 219.6,168.4 215.3,167.3 213.6,169.5 211.3,168.7 204.1,161.8 191.6,163.0 181.3,159.1 174.6,159.6 170.8,155.5 164.9,153.9 154.4,138.0 154.1,131.2 155.8,123.5 153.6,116.2 158.0,116.6 159.5,119.2 158.8,113.9",
 "68.3,194.2 70.0,195.8 67.5,197.5 66.5,195.3 67.1,193.7 68.3,194.2",
 "37.6,82.3 40.1,83.6 34.8,82.7 37.6,82.3",
 "74.4,89.0 77.4,90.0 72.2,92.4 70.8,91.7 70.4,90.4 74.4,89.0",
 "108.4,56.4 108.3,82.5 113.8,83.3 118.2,86.4 123.7,83.9 134.1,92.9 138.9,94.7 137.4,97.8 133.4,95.8 127.6,88.5 120.5,88.3 111.5,84.6 91.3,80.9 88.3,81.5 88.8,83.4 78.6,85.7 79.4,81.3 82.4,80.5 81.6,79.8 72.2,85.1 74.2,86.5 71.6,88.5 59.9,94.5 41.8,98.4 59.2,91.6 61.9,90.1 63.8,86.3 58.2,87.7 54.6,85.9 50.1,87.0 50.3,84.4 48.6,83.4 44.9,83.9 40.7,81.9 38.6,79.2 39.6,77.6 42.9,74.6 53.4,72.9 51.3,71.1 53.4,70.0 41.8,71.0 33.0,67.6 43.1,65.1 45.4,65.1 45.0,66.5 50.9,66.3 36.8,60.1 38.3,58.7 43.2,58.6 50.3,54.6 65.1,51.8 71.3,53.6 108.4,56.4",
 "23.0,72.8 31.4,74.2 29.1,75.1 23.5,74.1 23.0,72.8",
 "742.7,113.3 738.2,115.4 736.6,119.4 731.1,118.5 729.1,123.5 722.1,125.2 724.6,130.1 722.7,130.8 722.9,132.4 706.1,129.7 704.1,131.9 697.7,131.4 690.6,137.0 685.3,135.6 684.8,133.4 683.4,133.3 683.6,130.6 680.3,128.5 672.3,129.2 662.5,123.4 655.4,125.0 655.5,135.3 650.2,132.4 645.8,133.9 645.8,131.1 642.6,130.2 639.7,126.1 642.4,126.3 642.5,124.3 647.3,124.3 647.3,119.9 642.2,119.3 636.4,121.1 633.5,117.4 629.1,115.6 632.1,109.8 634.9,111.5 635.3,109.4 641.0,106.4 645.4,106.3 654.8,109.4 657.7,108.2 670.4,108.9 671.1,107.6 666.6,105.7 671.4,102.8 669.4,100.9 670.7,100.0 691.9,96.2 696.8,96.8 697.7,99.6 704.2,99.9 704.0,101.4 713.6,98.6 712.6,99.5 722.3,108.7 723.8,107.3 727.6,108.9 731.6,108.1 742.7,113.3",
 "655.5,135.3 655.4,125.0 662.5,123.4 672.3,129.2 680.3,128.5 683.6,130.6 683.4,133.3 684.8,133.4 685.3,135.6 688.8,135.7 689.6,137.0 697.1,132.6 695.6,134.7 702.9,136.5 699.4,138.5 696.1,138.3 696.3,136.2 692.6,136.9 690.4,140.2 688.1,140.1 687.3,141.3 689.4,141.9 690.0,144.0 688.4,146.8 684.8,146.2 684.9,144.5 678.3,142.0 673.3,138.7 671.9,135.9 668.0,135.5 666.6,132.7 662.9,131.2 658.1,133.8 658.6,135.2 655.5,135.3",
 "891.7,257.2 901.6,260.7 905.5,265.2 910.1,266.9 910.8,268.4 908.3,268.7 908.9,270.5 918.6,279.4 910.9,278.1 905.7,272.4 902.1,271.2 898.0,272.9 898.4,275.0 896.2,275.9 891.8,275.3 891.7,257.2",
 "924.0,260.2 925.4,262.5 924.5,263.2 923.4,260.5 918.5,257.6 924.0,260.2",
 "920.3,266.2 915.9,267.5 912.0,266.0 916.2,265.3 917.1,263.9 917.3,265.4 918.9,265.2 921.2,263.2 920.9,261.6 922.6,261.5 923.1,263.5 920.3,266.2",
 "929.9,264.8 933.0,268.9 931.0,268.2 929.9,264.8",
 "891.7,257.2 891.8,275.3 889.3,273.0 882.3,273.4 885.2,270.3 883.1,265.0 871.3,259.8 869.4,261.4 866.6,257.8 871.4,256.2 867.3,256.1 862.6,252.6 867.7,251.0 872.2,252.2 873.4,257.7 876.3,259.4 881.8,254.7 891.7,257.2",
 "847.1,274.7 845.7,278.2 842.9,278.4 844.4,275.8 847.1,274.7",
 "872.8,269.2 873.6,265.1 874.2,267.3 872.8,269.2",
 "827.5,238.5 825.9,241.0 827.4,244.9 830.5,247.5 827.3,247.8 826.4,252.2 823.8,254.1 822.6,261.1 822.2,260.2 819.1,261.4 814.6,258.7 811.3,259.7 810.3,258.3 806.2,258.2 802.6,248.8 804.6,244.4 807.0,247.9 813.5,245.8 816.1,246.6 818.4,246.0 821.8,238.0 827.5,238.5",
 "859.4,257.8 862.4,258.6 863.4,260.7 855.3,259.4 855.9,257.9 859.4,257.8",
 "852.4,260.5 850.0,258.8 852.8,258.7 852.4,260.5",
 "855.4,244.0 857.5,246.9 855.8,252.5 853.9,247.2 855.4,244.0",
 "841.5,247.6 847.4,245.4 845.7,248.8 833.8,249.3 833.4,251.4 835.9,253.9 842.6,251.7 837.5,255.3 842.1,264.8 839.5,264.7 840.9,262.4 837.5,262.7 836.0,257.3 834.2,258.1 834.5,265.4 832.8,265.8 831.6,264.9 831.9,259.7 829.9,257.8 832.8,249.6 835.8,246.4 841.5,247.6",
 "834.2,278.5 830.5,276.5 833.1,276.0 835.5,277.7 834.2,278.5",
 "837.1,273.7 841.4,272.5 841.0,274.0 836.8,274.8 833.1,273.5 837.1,273.7",
 "828.5,273.2 830.9,274.2 824.3,275.1 827.5,272.5 828.5,273.2",
 "801.4,267.8 812.8,269.3 813.8,271.1 821.4,273.3 818.2,274.3 795.7,270.4 792.7,269.0 794.6,266.4 801.4,267.8",
 "789.9,253.0 791.4,256.5 794.7,258.5 793.9,266.3 790.9,266.3 781.7,257.8 773.9,244.9 764.7,234.8 770.8,235.4 779.6,244.2 784.7,246.1 788.4,249.7 787.3,252.0 789.9,253.0",
 "309.3,396.2 311.8,399.6 319.3,401.9 315.4,403.5 309.4,402.4 309.3,396.2",
 "339.9,333.9 337.5,345.6 341.0,348.0 342.3,352.5 339.6,356.1 335.5,357.6 326.8,357.9 327.4,363.0 325.7,364.0 319.1,364.1 319.5,366.8 322.9,366.8 323.7,368.2 318.9,370.8 317.9,375.1 313.1,376.5 312.3,378.6 317.7,381.2 316.7,383.7 307.9,390.9 310.7,395.4 300.2,394.5 299.1,390.8 296.3,389.9 296.1,387.0 299.1,384.0 300.9,374.9 302.2,374.4 299.6,367.4 301.6,358.1 303.3,357.1 302.4,351.8 304.5,350.0 306.1,345.0 304.1,337.1 306.5,329.1 310.3,324.7 310.0,318.1 313.0,316.7 313.6,313.2 315.9,310.6 319.5,311.3 321.2,313.3 322.3,311.1 325.4,311.2 331.0,316.3 339.5,319.9 337.2,325.3 345.3,326.1 349.6,321.0 351.0,324.8 339.9,333.9",
 "309.3,396.2 309.4,402.4 314.0,402.5 310.7,404.5 302.8,402.9 292.6,396.8 302.5,400.2 304.8,397.0 309.3,396.2",
 "306.7,298.8 309.9,303.9 309.0,306.6 311.6,313.5 313.9,313.9 313.0,316.7 310.0,318.1 310.3,324.7 306.5,329.1 304.1,337.1 306.1,345.0 304.5,350.0 302.4,351.8 303.3,357.1 301.6,358.1 299.6,367.4 302.2,374.4 300.9,374.9 299.1,384.0 296.1,387.0 296.3,389.9 299.1,390.8 300.2,394.5 309.5,395.3 303.2,396.9 301.6,399.6 291.8,395.2 290.0,385.2 294.1,380.4 289.9,379.6 292.5,377.1 293.5,372.5 296.6,373.5 298.0,367.7 296.1,367.0 295.3,370.5 293.5,370.1 296.6,359.1 295.6,353.2 296.8,353.1 301.6,340.1 301.4,330.2 303.0,326.8 305.3,309.4 304.5,301.0 306.7,298.8",
 "581.5,262.5 582.3,268.1 585.4,273.2 579.8,273.7 578.8,282.8 582.3,283.8 582.5,286.8 580.4,286.8 575.5,282.2 573.8,283.1 567.4,280.4 561.5,280.8 560.4,270.3 555.8,269.3 552.8,272.2 548.5,272.4 545.4,266.3 533.8,266.1 537.8,262.5 540.5,263.8 544.5,259.8 545.6,254.8 549.0,251.2 551.5,238.3 554.1,236.0 562.2,238.8 563.4,236.9 571.3,235.4 576.0,235.5 579.0,238.1 582.5,237.2 585.6,240.3 585.5,243.5 586.6,243.9 583.0,248.3 580.6,257.9 581.5,262.5",
 "615.5,254.7 613.9,252.4 613.8,242.3 617.0,238.2 624.9,236.1 635.9,223.7 636.0,218.3 642.0,216.6 640.4,224.4 635.0,235.2 615.5,254.7",
 "608.9,263.0 604.9,260.2 604.7,258.6 594.2,252.6 594.1,249.7 597.3,244.7 594.5,238.2 598.1,234.7 600.4,237.6 605.9,240.0 609.9,240.5 613.2,238.2 616.3,239.1 613.8,242.3 613.9,252.4 615.5,254.7 611.8,257.1 608.9,263.0",
 "568.2,227.1 565.2,225.1 565.4,222.0 560.9,215.0 564.0,206.4 566.4,206.6 566.2,194.4 569.4,194.4 569.4,188.9 602.4,188.9 604.1,198.3 606.7,200.0 602.4,202.9 600.8,212.3 595.2,220.5 594.4,225.9 592.2,216.2 591.0,216.0 589.1,216.7 590.0,219.2 587.1,222.7 583.3,221.4 580.5,223.9 574.3,223.7 571.6,221.1 569.6,221.5 568.2,225.2 566.4,226.1 568.2,227.1",
 "566.2,195.6 566.4,206.6 564.0,206.4 560.9,215.0 563.5,219.0 558.3,223.7 552.3,225.0 549.9,228.1 542.4,229.4 541.6,225.6 538.8,223.5 539.4,222.2 543.0,222.3 540.5,213.0 538.8,212.9 537.6,210.1 538.8,206.4 542.4,203.8 544.2,193.4 541.9,190.8 541.3,186.5 544.1,185.0 566.2,195.6",
 "300.8,195.2 300.8,199.9 293.2,199.0 299.1,198.1 296.7,194.7 300.8,195.2",
 "300.8,199.9 301.1,194.8 305.7,195.4 310.2,198.3 309.2,199.4 303.7,198.8 301.7,201.1 300.8,199.9",
 "996.5,52.5 1000.0,51.3 1000.0,53.2 996.5,52.5",
 "636.4,121.1 629.7,126.1 635.0,133.9 632.8,135.7 626.3,131.9 611.0,129.3 601.9,124.3 606.2,121.6 604.6,120.5 608.7,119.3 606.2,119.2 606.3,117.9 610.4,116.9 611.3,112.2 598.2,109.5 597.3,107.8 595.1,107.6 595.5,106.2 593.8,104.6 588.3,105.3 587.0,102.6 590.8,101.8 585.4,97.7 585.8,95.7 578.3,94.0 575.8,90.3 577.0,89.5 576.2,86.9 580.9,83.3 578.0,81.9 587.5,75.4 583.4,73.5 584.6,71.7 582.1,69.6 583.9,67.2 580.7,64.0 583.3,61.9 579.0,60.1 579.4,58.2 589.3,55.8 614.1,62.6 614.2,64.5 606.6,66.7 592.2,64.9 596.7,66.9 597.1,71.1 602.8,72.6 601.5,70.1 603.3,69.0 610.0,70.8 612.3,70.1 610.5,68.1 616.9,65.3 622.1,66.5 623.7,64.6 621.4,62.9 622.7,61.2 620.7,59.5 628.5,60.4 630.1,62.0 626.5,62.3 626.6,63.9 628.7,64.8 649.2,58.7 651.3,58.9 648.6,60.6 663.3,58.7 666.5,60.3 669.7,58.5 666.8,56.9 668.2,56.0 690.3,60.9 692.2,59.4 685.9,57.1 686.8,55.8 685.3,52.7 694.3,47.1 701.6,47.8 702.2,49.4 699.6,51.6 702.2,54.5 701.6,58.3 704.6,60.0 698.0,65.8 701.2,66.2 708.5,61.8 706.9,60.2 708.2,58.4 705.1,58.1 704.4,56.6 706.7,53.8 703.1,51.5 708.0,49.7 707.4,47.7 710.2,49.2 709.1,51.8 712.1,52.4 710.8,50.3 715.5,49.3 726.4,50.7 723.9,48.4 723.6,45.4 741.2,44.6 738.9,43.2 742.1,41.3 779.9,37.7 783.3,35.3 789.9,34.2 794.6,35.1 790.8,35.8 797.1,36.2 797.9,37.6 808.5,36.9 817.0,39.3 816.3,40.8 803.9,43.9 813.9,44.5 815.4,46.3 821.0,45.1 842.2,47.3 842.4,45.2 852.7,45.7 857.2,47.1 858.5,48.9 856.8,50.1 864.7,53.4 867.4,50.5 871.8,51.7 888.5,51.4 886.5,48.8 890.2,47.6 915.3,49.4 924.9,53.2 941.7,53.1 944.0,54.3 943.6,56.3 947.1,57.1 966.2,56.7 971.0,59.2 974.5,58.3 972.2,56.5 973.5,55.3 988.1,55.9 1000.0,58.4 1000.0,69.5 992.8,70.5 998.3,75.0 997.9,76.9 992.7,76.3 982.4,78.7 973.1,83.7 969.2,81.7 961.9,83.9 960.7,82.9 954.3,83.7 950.0,88.2 953.3,90.0 952.9,94.0 950.4,94.1 949.2,96.4 950.3,97.6 945.5,99.0 944.5,102.2 940.4,102.9 939.5,105.7 935.5,108.3 931.8,96.2 933.1,92.3 935.6,89.4 939.9,88.7 954.6,80.2 956.9,76.2 953.5,76.5 951.8,78.8 944.8,81.8 942.5,78.4 935.3,79.3 928.4,84.0 930.7,85.7 920.2,86.7 920.4,84.7 916.1,84.3 912.6,85.7 895.0,86.0 875.4,98.0 879.7,98.3 883.8,100.7 888.6,99.5 892.6,102.5 889.1,115.4 874.6,129.4 870.9,131.1 867.4,129.8 863.3,132.7 864.0,125.1 869.7,124.6 875.1,115.3 863.9,117.2 862.7,114.6 859.4,112.7 854.6,111.8 849.9,103.4 843.3,101.5 833.8,103.5 835.4,105.7 831.4,110.7 827.4,112.5 817.7,110.4 807.4,113.5 801.3,113.1 796.9,110.3 788.0,110.9 784.0,109.7 783.5,107.6 774.6,105.4 771.7,108.3 772.9,109.9 770.2,111.9 756.2,108.9 742.7,113.3 731.6,108.1 727.6,108.9 723.8,107.3 722.3,108.7 712.6,99.5 713.6,98.6 704.0,101.4 704.2,99.9 697.7,99.6 696.8,96.8 691.9,96.2 670.7,100.0 669.4,100.9 671.4,102.8 666.6,105.7 671.1,107.6 670.4,108.9 657.7,108.2 654.8,109.4 645.4,106.3 641.0,106.4 635.3,109.4 634.9,111.5 632.1,109.8 629.1,115.6 633.5,117.4 636.4,121.1",
 "760.5,24.9 766.5,24.3 778.3,28.4 777.6,30.9 763.8,30.4 753.3,26.8 760.5,24.9",
 "785.7,29.8 792.7,31.4 791.9,32.5 776.2,33.6 781.3,29.9 785.7,29.8",
 "885.6,38.5 903.0,40.1 900.8,42.2 886.0,42.7 880.5,40.9 882.0,39.0 885.6,38.5",
 "911.7,40.7 918.7,41.4 911.0,42.3 905.9,41.2 911.7,40.7",
 "888.5,46.2 894.6,44.8 898.9,46.6 888.5,46.2",
 "624.6,26.1 643.1,25.8 632.2,27.7 629.2,27.1 630.8,26.2 624.6,26.1",
 "563.1,99.1 554.6,98.8 559.1,96.7 563.2,97.6 563.1,99.1",
 "648.6,45.1 655.3,42.7 654.5,41.4 669.9,38.2 689.3,36.3 691.3,37.4 662.4,43.6 653.9,49.0 654.5,51.3 659.8,53.6 649.1,53.4 643.3,51.5 642.9,50.0 645.8,49.4 645.7,47.8 651.2,45.5 648.6,45.1",
 "897.0,100.8 897.9,106.2 901.8,114.0 897.7,113.0 896.0,117.1 898.7,119.9 898.6,121.8 896.5,120.2 894.7,122.3 894.9,108.5 893.3,105.7 893.6,101.9 896.1,100.7 895.0,99.4 896.3,99.0 897.0,100.8",
 "14.1,63.3 13.8,65.0 15.7,65.7 15.1,63.7 22.6,64.1 28.1,66.7 20.7,68.2 19.6,71.5 10.5,68.5 4.6,68.4 3.0,67.4 3.6,66.4 0.3,67.0 1.6,68.3 0.0,69.5 0.0,58.4 14.1,63.3",
 "3.6,53.1 0.0,53.2 0.0,51.3 6.7,52.0 3.6,53.1",
 "592.9,122.3 601.5,123.7 594.1,126.8 592.6,126.2 593.2,124.9 590.2,124.1 592.9,122.3",
 "280.6,175.6 283.8,176.2 280.8,176.6 280.6,175.6",
 "282.8,180.0 284.6,184.0 282.2,181.7 282.8,180.0",
 "330.0,394.0 337.4,391.9 339.6,393.2 335.0,395.0 330.0,394.0",
 "542.1,28.7 547.2,27.6 559.8,30.7 552.9,31.8 547.6,36.6 544.2,36.7 538.2,35.1 540.7,34.1 531.2,30.9 529.0,28.7 542.1,28.7",
 "586.4,56.8 579.4,58.2 580.6,56.2 577.0,55.1 572.7,56.0 568.7,59.3 559.0,57.3 555.6,58.2 555.2,60.0 550.0,59.5 549.2,61.1 546.6,61.1 537.7,70.0 538.7,71.0 537.7,72.1 534.9,72.0 533.1,74.6 533.3,78.3 535.1,79.7 534.2,83.0 530.6,86.5 528.8,84.8 523.3,88.0 519.6,88.7 515.7,87.3 513.9,77.9 529.2,70.9 541.0,61.6 553.3,56.1 564.0,55.0 568.2,52.7 578.2,52.3 586.9,54.3 583.3,55.0 586.4,56.8",
 "576.1,27.6 564.0,29.4 548.2,26.9 563.7,26.0 576.1,27.6",
 "568.7,33.7 557.6,34.2 559.5,33.5 557.8,32.6 563.6,32.1 568.7,33.7",
 "370.1,20.5 392.7,17.9 424.7,18.0 442.1,20.2 412.8,22.2 436.4,22.0 438.7,23.0 435.6,24.6 456.2,22.5 466.1,24.2 444.3,27.3 450.7,27.4 445.3,31.2 445.4,34.3 448.7,36.2 439.8,37.1 444.9,38.6 445.6,41.0 442.6,41.2 446.2,43.6 440.0,43.8 443.2,45.0 442.3,45.9 434.5,46.4 438.1,49.5 431.1,49.1 438.5,51.5 439.6,53.7 434.6,54.2 429.0,51.6 430.0,53.5 426.8,54.9 437.9,55.2 422.9,59.8 411.7,60.8 405.0,64.8 389.4,68.2 385.6,73.7 381.1,75.9 382.2,78.1 379.5,83.1 375.6,83.2 371.5,81.0 365.9,80.9 356.6,73.3 354.8,69.0 350.9,66.4 351.9,64.3 350.1,63.4 352.8,60.1 357.0,59.1 358.7,55.8 351.5,57.5 348.1,56.6 349.0,53.3 357.2,54.0 344.9,51.0 348.0,48.4 337.3,40.2 329.8,38.6 309.7,38.7 301.7,36.1 314.5,35.1 296.4,33.2 296.8,32.1 317.5,29.5 318.5,28.4 311.0,27.5 327.1,24.1 326.0,22.9 341.1,21.7 352.7,22.5 360.0,21.0 376.3,23.2 369.7,21.7 370.1,20.5",
 "691.5,385.1 696.0,386.8 695.2,388.1 691.0,388.3 691.5,385.1",
 "847.1,274.7 853.7,273.3 847.5,276.1 847.1,274.7",
 "545.4,329.4 546.7,328.0 551.3,330.7 555.3,329.1 555.3,318.8 558.0,324.5 560.0,324.2 564.8,320.2 571.3,320.8 575.3,315.5 581.8,311.4 586.6,311.8 588.7,317.7 588.4,321.8 586.2,321.5 585.2,324.3 586.9,325.8 591.2,324.3 589.5,329.9 578.4,341.0 571.6,344.3 562.7,344.1 555.8,346.7 551.0,344.8 549.8,340.6 550.6,337.9 545.4,329.4",
 "580.5,330.4 581.5,331.3 578.1,334.8 575.0,333.0 578.0,330.1 580.5,330.4",
 "174.6,159.6 181.3,159.1 191.6,163.0 204.1,161.8 211.3,168.7 213.6,169.5 215.3,167.3 217.6,167.3 224.9,176.8 230.2,178.1 228.1,187.7 233.6,197.7 237.7,199.6 246.1,197.6 247.9,196.4 249.2,191.7 258.2,190.2 258.8,192.1 256.0,199.3 247.2,200.5 247.2,202.1 246.0,202.1 248.7,205.4 245.1,205.4 243.8,209.6 239.2,205.7 231.8,206.5 212.5,199.2 207.0,194.6 207.6,190.5 205.5,186.7 188.3,169.6 185.7,163.4 181.2,161.7 181.5,166.2 190.0,175.9 192.6,182.5 196.1,185.1 194.4,186.6 188.4,181.3 188.1,177.7 180.4,173.0 182.9,170.6 179.1,167.9 174.6,159.6",
 "339.9,333.9 341.7,333.6 350.6,339.0 352.2,340.9 350.5,345.5 343.8,346.8 337.7,344.2 339.9,333.9",
 "351.7,343.8 351.0,342.2 352.2,340.9 350.6,339.0 341.7,333.6 339.9,333.9 351.0,324.8 351.0,322.6 349.6,321.0 348.3,321.5 349.2,316.7 346.1,316.5 345.0,312.1 339.1,311.4 338.4,306.0 340.3,300.5 338.1,298.0 338.2,295.3 332.9,295.2 331.9,288.3 321.3,284.6 318.3,282.1 318.5,277.1 314.9,277.6 310.4,280.6 304.0,280.6 304.2,276.4 299.5,277.9 296.6,276.3 297.2,275.1 294.5,270.9 296.9,268.4 297.5,264.7 305.9,261.9 307.2,253.1 305.5,248.5 307.7,247.3 306.1,247.0 306.1,245.2 312.4,244.3 313.7,246.9 317.9,247.8 324.0,243.9 321.5,243.1 320.0,238.7 324.7,239.5 330.6,237.4 331.3,235.6 333.4,236.1 334.6,239.0 333.4,242.3 336.0,246.3 344.5,245.0 344.5,243.0 352.9,244.1 357.5,238.3 359.7,244.7 361.2,245.2 359.2,249.4 360.0,250.2 364.9,250.7 365.0,253.4 367.2,251.6 375.3,254.3 376.2,257.5 379.4,256.6 388.9,258.0 396.6,263.4 401.1,264.3 403.5,270.4 402.4,275.0 392.6,286.3 390.9,299.6 386.3,310.9 383.4,313.8 376.0,314.9 367.6,319.1 365.3,321.9 364.2,329.7 351.7,343.8",
 "306.9,280.4 310.4,280.6 314.9,277.6 318.5,277.1 318.3,282.1 321.3,284.6 331.9,288.3 332.9,295.2 338.2,295.3 338.1,298.0 340.3,300.5 339.3,305.5 335.8,303.8 328.4,304.5 325.9,311.8 322.3,311.1 321.2,313.3 319.5,311.3 315.9,310.6 311.6,313.5 309.0,306.6 309.9,303.9 306.7,298.8 308.4,295.8 307.4,291.5 309.3,284.9 306.9,280.4",
 "305.9,261.9 297.5,264.7 296.9,268.4 294.5,270.9 297.2,275.1 296.6,276.3 299.5,277.9 304.2,276.4 304.0,280.6 306.9,280.4 309.3,284.9 307.4,291.5 308.4,295.8 304.5,301.0 288.9,290.7 278.4,270.0 274.3,267.0 275.2,265.8 273.9,263.2 276.9,259.5 276.5,262.3 280.0,263.8 281.6,262.6 283.8,258.3 290.2,254.3 291.4,250.2 297.0,256.4 303.3,256.3 305.4,257.6 303.6,260.4 305.9,261.9",
 "314.2,246.5 312.4,244.3 306.1,245.2 306.1,247.0 307.7,247.3 305.5,248.5 307.2,253.1 305.9,261.9 303.6,260.4 305.4,257.6 303.3,256.3 297.0,256.4 291.4,250.2 284.9,248.9 280.6,245.3 285.8,239.3 283.7,229.9 285.4,228.0 284.8,226.3 289.8,223.8 291.9,219.2 296.1,218.8 301.7,215.6 301.9,217.3 297.5,221.0 296.4,224.6 297.8,224.8 300.1,230.6 305.3,230.7 307.3,233.1 312.9,233.1 311.6,237.5 313.0,240.8 311.6,242.2 314.2,246.5",
 "285.1,225.9 285.4,228.0 283.7,229.9 282.8,226.9 280.2,225.0 276.7,226.9 277.8,229.0 275.3,229.9 273.0,227.5 269.9,227.6 269.6,223.7 273.8,225.6 280.5,223.5 285.1,225.9",
 "270.7,223.4 269.5,227.2 264.0,222.0 263.6,223.5 262.1,222.4 261.3,219.7 267.6,219.6 270.7,223.4",
 "267.6,219.6 261.9,219.2 256.5,214.1 264.1,208.9 269.0,208.3 267.6,219.6",
 "269.0,208.3 264.1,208.9 257.5,213.9 255.9,211.4 251.8,209.9 255.8,205.9 263.9,205.6 269.0,208.3",
 "251.8,209.9 256.3,211.7 255.8,213.5 249.7,211.8 251.8,209.9",
 "243.8,209.6 245.1,205.4 248.7,205.4 246.0,202.1 247.2,202.1 247.2,200.5 252.4,200.5 252.1,205.9 254.9,206.3 251.8,209.9 249.7,211.8 243.8,209.6",
 "252.4,200.5 255.3,199.0 253.0,205.9 252.4,200.5",
 "331.3,235.6 330.6,237.4 324.7,239.5 320.0,238.7 321.5,243.1 324.0,243.9 315.8,248.0 311.6,242.2 313.0,240.8 311.6,237.5 312.9,233.1 307.3,233.1 305.3,230.7 300.1,230.6 297.8,224.8 296.4,224.6 297.5,221.0 301.9,217.3 300.1,218.3 301.0,221.0 299.8,222.6 302.0,224.6 301.7,219.5 305.1,218.4 305.7,216.2 310.6,220.7 316.0,220.4 319.7,222.0 321.3,220.4 328.1,220.2 325.7,221.1 326.7,222.4 334.0,226.8 329.4,233.4 331.3,235.6",
 "342.9,244.7 337.4,246.5 334.3,245.0 333.4,236.1 329.4,233.4 334.0,226.8 341.3,233.4 338.8,238.7 342.9,244.7",
 "348.5,243.6 344.5,243.0 344.5,245.0 342.9,244.7 340.0,240.7 338.8,238.7 341.3,233.4 350.1,234.0 348.7,236.4 350.0,239.9 348.5,243.6",
 "356.5,238.5 352.9,244.1 348.5,243.6 350.0,239.9 348.7,236.4 350.1,234.0 356.5,238.5",
 "517.2,112.6 522.5,113.8 520.7,117.7 516.8,120.2 519.0,122.2 520.7,128.6 518.1,130.2 508.6,130.3 508.3,132.0 505.1,132.4 494.7,129.4 496.7,122.2 491.8,117.9 487.5,116.8 487.2,114.8 495.5,114.9 494.6,111.7 497.3,112.9 503.7,110.8 504.6,108.5 507.0,107.9 511.9,111.4 517.2,112.6",
 "524.3,131.6 526.1,130.5 525.6,135.1 524.3,131.6",
 "290.6,250.4 290.2,254.3 283.8,258.3 281.6,262.6 280.0,263.8 276.5,262.3 278.4,257.4 275.1,256.2 275.2,252.9 277.5,247.9 281.0,246.2 290.6,250.4",
 "315.9,198.6 317.8,199.4 317.1,200.1 313.4,200.1 313.6,198.6 315.9,198.6",
 "284.5,198.6 288.3,200.3 284.0,200.4 282.4,199.4 284.5,198.6",
 "271.5,185.6 282.4,187.5 293.9,193.7 284.0,194.8 285.9,193.3 283.0,192.4 281.3,190.0 272.7,188.4 271.8,187.8 272.8,187.1 264.0,189.2 271.5,185.6",
 "586.6,311.8 577.8,309.7 570.2,299.3 575.1,299.8 580.4,294.6 584.1,293.1 591.2,296.4 590.7,306.4 586.6,311.8",
 "581.8,311.4 575.3,315.5 571.3,320.8 564.8,320.2 560.0,324.2 558.0,324.5 555.3,318.8 555.3,310.7 558.0,310.6 558.1,300.7 570.2,299.3 577.8,309.7 581.8,311.4",
 "555.3,318.8 555.3,329.1 551.3,330.7 546.7,328.0 545.4,329.4 542.3,325.3 539.6,311.4 532.6,298.1 537.4,297.1 539.1,298.4 550.7,298.1 559.4,299.8 566.8,298.0 569.7,298.8 565.5,300.8 564.4,299.6 558.1,300.7 558.0,310.6 555.3,310.7 555.3,318.8",
 "453.6,212.2 451.0,209.1 455.2,204.3 459.5,203.9 466.2,209.4 468.0,215.4 453.7,215.6 453.2,213.5 461.5,212.5 453.6,212.2",
 "468.0,215.4 466.2,209.4 467.6,207.3 484.6,206.9 482.1,180.7 486.3,180.6 508.7,195.3 508.8,197.1 511.9,196.8 511.9,203.2 510.1,206.8 497.0,208.4 488.9,212.6 485.5,217.5 485.0,221.2 477.7,221.6 474.6,215.8 471.8,217.1 468.0,215.4",
 "452.6,191.7 464.1,190.8 464.2,185.3 466.8,185.1 466.8,178.0 475.9,178.1 475.9,173.9 486.3,180.6 482.1,180.7 484.6,206.9 467.6,207.3 466.2,209.4 459.5,203.9 454.3,205.2 454.8,194.2 452.6,191.7",
 "507.5,232.6 505.2,232.9 504.6,224.6 502.1,220.9 504.0,217.9 507.9,216.0 510.5,220.2 507.6,226.4 507.5,232.6",
 "541.3,186.5 541.9,190.8 544.2,193.4 542.4,203.8 538.8,206.4 537.6,210.1 538.8,212.9 540.5,213.0 539.4,215.3 536.3,212.2 534.2,213.8 530.5,212.8 525.0,214.4 515.1,211.5 511.4,212.4 510.0,217.6 507.9,216.0 506.0,216.8 506.0,214.9 502.8,214.3 501.0,208.5 510.1,206.8 511.9,203.2 511.9,196.8 533.3,184.8 539.3,187.5 541.3,186.5",
 "507.5,232.6 507.6,226.4 510.3,222.0 510.2,215.1 512.1,211.8 525.0,214.4 530.5,212.8 534.2,213.8 536.3,212.2 540.5,216.4 532.6,230.6 530.7,231.5 528.1,230.4 525.6,232.1 523.6,236.7 516.4,238.2 512.0,232.6 507.5,232.6",
 "540.3,214.3 543.0,222.3 539.4,222.2 538.8,223.5 542.9,228.6 540.4,232.7 540.2,236.9 544.1,241.6 544.3,245.2 539.8,243.8 526.8,243.7 527.2,241.5 523.6,237.5 524.3,234.8 528.1,230.4 530.7,231.5 532.6,230.6 540.0,217.9 540.3,214.3",
 "502.5,219.5 504.6,224.6 505.2,232.9 502.9,233.5 499.9,220.3 502.5,219.5",
 "500.1,219.4 502.9,233.5 494.5,236.9 492.1,236.1 491.0,232.6 492.9,227.2 491.8,219.5 500.1,219.4",
 "477.7,221.6 482.8,220.8 488.0,223.3 492.1,223.2 492.9,227.2 491.0,232.6 492.1,236.1 487.1,235.6 478.6,237.9 479.0,234.1 476.1,232.0 478.2,226.2 477.7,221.6",
 "461.9,215.0 471.8,217.1 474.6,215.8 477.7,221.6 478.2,226.2 477.0,228.6 474.4,229.7 472.9,226.3 470.8,226.8 469.1,222.1 465.5,222.7 463.2,225.3 458.0,219.3 461.8,217.2 461.9,215.0",
 "453.7,215.6 461.9,215.0 461.8,217.2 458.0,219.3 453.7,215.6",
 "476.6,228.6 476.1,232.0 479.0,234.1 478.6,237.9 468.2,231.2 471.6,226.6 472.9,226.3 474.4,229.7 476.6,228.6",
 "463.2,225.3 465.5,222.7 469.1,222.1 471.6,226.6 468.2,231.2 464.0,228.3 463.2,225.3",
 "485.0,221.2 488.1,213.3 497.0,208.4 501.0,208.5 502.8,214.3 506.0,214.9 505.4,217.7 502.5,219.5 491.8,219.5 492.1,223.2 488.0,223.3 485.0,221.2",
 "576.0,235.5 567.8,235.8 563.4,236.9 562.2,238.8 554.1,236.0 551.3,240.3 547.6,239.6 544.5,243.7 540.2,234.9 542.4,229.4 549.9,228.1 552.3,225.0 558.3,223.7 563.5,219.0 565.4,222.0 565.2,225.1 576.0,235.5",
 "551.3,240.3 549.0,251.2 545.6,254.8 544.5,259.8 540.5,263.8 535.1,262.3 533.1,264.0 530.8,261.1 532.9,259.5 531.9,257.7 534.9,255.4 538.9,256.9 540.1,253.7 538.5,249.9 539.7,246.7 536.9,246.3 536.3,243.7 544.3,245.2 547.6,239.6 551.3,240.3",
 "531.3,243.7 536.0,243.6 536.9,246.3 539.7,246.7 538.5,249.9 540.1,253.7 538.9,256.9 534.9,255.4 531.9,257.7 532.9,259.5 530.8,261.1 524.4,253.1 526.4,247.2 531.3,247.1 531.3,243.7",
 "526.8,243.7 531.3,243.7 531.3,247.1 526.4,247.2 526.8,243.7",
 "585.4,273.2 592.3,276.9 592.5,284.5 590.8,288.1 592.3,288.8 583.8,291.1 584.1,293.1 580.4,294.6 575.1,299.8 564.5,298.7 560.8,294.7 560.9,285.8 566.7,285.9 566.4,280.4 571.5,282.7 575.5,282.2 580.4,286.8 582.5,286.8 582.3,283.8 578.8,282.8 579.0,275.5 580.6,273.4 585.4,273.2",
 "591.0,275.6 593.7,276.2 595.2,278.2 596.0,287.7 599.1,290.6 599.4,294.2 597.3,296.7 595.5,295.0 595.7,290.6 590.8,288.1 593.0,279.2 591.0,275.6",
 "596.0,282.0 604.1,282.1 612.0,278.7 613.3,290.8 609.6,296.4 603.9,298.9 596.6,305.0 598.8,311.4 598.5,317.0 591.7,320.4 590.5,321.5 591.2,324.3 589.1,324.3 586.6,311.8 590.7,306.4 591.2,296.4 584.3,294.1 583.8,291.1 592.3,288.8 595.7,290.6 595.5,295.0 597.3,296.7 599.4,294.2 599.1,290.6 596.0,287.7 596.0,282.0",
 "589.1,324.3 586.9,325.8 585.2,324.3 586.2,321.5 588.4,321.8 589.1,324.3",
 "536.1,263.3 533.8,266.1 533.1,264.0 535.1,262.3 536.1,263.3",
 "534.2,266.9 545.4,266.3 548.5,272.4 552.8,272.2 555.8,269.3 560.4,270.3 561.5,280.8 566.7,281.2 566.7,285.9 560.9,285.8 560.8,294.7 564.5,298.7 559.4,299.8 550.7,298.1 539.1,298.4 537.4,297.1 532.6,298.1 533.8,290.1 538.2,281.4 534.2,266.9",
 "584.6,256.7 585.4,259.3 581.5,262.5 580.6,257.9 584.6,256.7",
 "599.2,159.1 597.2,161.5 598.4,163.6 597.0,168.1 595.2,163.3 597.5,158.1 599.5,157.6 599.2,159.1",
 "599.5,157.6 597.6,158.1 598.6,155.8 601.2,153.9 599.5,157.6",
 "637.6,284.6 639.9,293.6 638.0,293.6 638.3,296.9 630.8,319.3 626.1,321.1 622.3,319.4 620.4,313.3 620.6,309.3 623.5,304.0 622.1,298.4 623.5,295.0 628.6,293.8 632.5,290.5 636.7,283.4 637.6,284.6",
 "598.3,162.5 597.0,162.9 597.7,159.6 598.3,162.5",
 "453.6,212.2 461.5,212.5 453.2,213.5 453.6,212.2",
 "526.3,165.8 525.2,160.8 521.1,157.4 520.9,155.3 522.6,153.7 523.4,147.4 526.4,146.3 528.4,146.6 528.3,148.0 530.6,147.0 529.4,148.9 530.0,153.2 528.2,154.6 531.9,158.0 531.8,160.1 527.6,162.8 527.7,165.2 526.3,165.8",
 "475.9,173.9 475.9,169.9 485.4,166.7 489.7,164.2 489.9,162.1 496.4,160.4 494.0,152.3 496.6,150.8 504.1,148.3 523.4,147.4 522.6,153.7 520.9,155.3 521.1,157.4 525.2,160.8 527.2,168.3 525.9,177.5 528.6,182.3 529.9,181.8 533.3,184.8 515.8,195.6 508.8,197.1 508.7,195.3 475.9,173.9",
 "598.7,160.0 602.3,160.2 607.8,157.3 608.9,160.7 602.8,162.5 605.6,165.3 600.2,168.9 597.0,168.1 598.7,160.0",
 "643.3,182.7 650.0,183.0 655.8,177.6 656.3,178.6 656.7,180.8 655.2,180.8 655.5,183.0 652.8,187.5 644.4,186.1 643.3,182.7",
 "641.1,181.2 642.5,177.5 643.4,180.0 642.7,181.6 641.1,181.2",
 "633.3,166.7 634.5,170.7 629.4,169.2 631.4,166.5 633.3,166.7",
 "608.9,160.7 607.8,157.3 613.9,154.4 614.7,149.0 618.8,146.2 624.4,146.7 628.0,150.9 626.2,155.6 631.5,159.8 634.9,166.9 631.4,166.5 629.4,169.2 624.2,168.9 616.4,163.4 608.9,160.7",
 "653.4,186.9 655.2,180.8 656.7,180.8 666.1,188.0 660.6,193.8 660.3,197.4 652.2,202.9 647.5,203.7 644.4,197.2 652.8,194.4 654.6,188.9 653.4,186.9",
 "963.3,293.5 962.9,290.6 964.6,293.7 963.3,293.5",
 "785.0,216.1 784.3,212.8 786.1,210.5 794.6,211.4 795.8,209.5 798.9,212.4 798.6,215.7 793.9,217.9 795.1,219.6 787.5,220.5 785.0,216.1",
 "792.3,210.4 786.1,210.5 784.3,212.8 785.0,216.1 780.1,214.9 780.5,212.7 778.0,212.8 775.6,224.3 777.4,224.4 779.1,229.4 783.7,232.7 781.0,234.2 772.6,226.8 776.6,217.0 772.8,208.0 774.7,205.1 770.5,198.8 772.9,195.3 778.1,193.3 779.5,195.8 781.3,195.9 780.7,201.4 786.7,199.1 790.9,201.6 791.1,204.3 793.3,206.7 792.3,210.4",
 "798.3,210.5 795.8,209.5 794.6,211.4 792.3,210.4 793.3,206.7 788.8,199.3 780.7,201.4 781.3,195.9 779.5,195.8 778.1,193.3 781.1,190.5 782.8,191.2 782.4,188.0 783.8,187.6 786.7,192.3 790.1,192.3 791.2,194.8 788.6,196.5 791.9,198.1 798.1,205.8 798.3,210.5",
 "778.1,193.3 772.9,195.3 770.5,198.8 774.7,205.1 772.8,208.0 776.6,217.0 773.8,222.4 773.6,213.5 769.9,203.0 764.9,206.3 761.6,205.5 762.0,199.4 760.2,195.2 756.6,192.6 756.4,190.3 758.8,188.1 759.2,183.1 761.4,183.7 764.2,176.2 767.8,174.3 769.8,174.8 770.4,171.5 772.0,171.3 774.1,173.6 774.1,178.0 771.5,180.3 771.1,183.6 774.1,183.2 774.7,185.7 776.5,186.3 775.7,188.6 778.9,190.1 781.0,189.3 778.1,193.3",
 "789.8,220.9 795.1,219.6 793.9,217.9 798.6,215.7 798.8,207.8 791.9,198.1 788.6,196.5 791.2,194.8 790.1,192.3 786.7,192.3 783.8,187.6 792.6,185.1 800.1,190.1 796.4,192.5 793.5,197.1 802.4,207.6 803.3,217.6 792.1,226.1 791.9,222.4 789.8,220.9",
 "862.9,132.2 860.2,134.4 860.3,136.4 854.3,139.6 853.8,141.1 856.1,143.4 848.0,145.4 846.4,144.1 848.3,140.6 845.2,139.1 847.4,137.3 852.4,133.8 856.1,134.8 855.7,133.3 861.1,130.6 862.9,132.2",
 "850.5,145.1 856.5,142.7 859.6,147.8 858.6,152.5 851.3,154.5 850.3,148.0 852.4,147.5 850.5,145.1",
 "743.8,113.1 756.2,108.9 770.2,111.9 772.9,109.9 771.7,108.3 774.6,105.4 783.5,107.6 784.0,109.7 788.0,110.9 796.9,110.3 801.3,113.1 807.4,113.5 817.7,110.4 824.1,111.4 820.8,116.3 821.5,117.4 828.0,116.5 832.7,119.3 826.2,120.4 815.2,125.5 810.8,124.7 809.3,126.5 810.6,128.5 806.7,130.9 791.6,134.5 780.1,131.5 767.6,131.3 764.7,127.1 752.6,124.2 751.6,123.0 752.7,119.8 750.8,117.5 744.5,115.0 743.8,113.1",
 "770.4,171.5 769.8,174.8 767.8,174.3 764.2,176.2 761.4,183.7 759.2,183.1 758.8,188.1 757.4,188.8 756.0,184.4 754.7,186.2 753.2,184.7 756.6,180.6 749.8,179.8 749.5,177.9 746.0,176.5 745.0,178.4 747.0,179.9 744.7,181.9 746.4,182.7 746.9,189.7 741.6,190.3 740.3,194.0 736.3,195.9 728.3,204.0 723.1,205.8 721.8,221.2 715.4,227.9 712.8,225.3 704.3,205.6 701.8,190.7 695.8,192.0 692.1,188.6 693.5,187.6 692.6,186.5 689.4,184.2 691.2,182.3 697.3,182.3 693.1,175.2 696.2,172.3 699.4,172.5 709.1,160.4 706.8,159.0 704.9,154.7 706.2,153.5 713.5,153.7 716.2,151.4 719.2,154.7 720.0,158.3 719.9,159.8 717.9,159.4 718.7,162.5 725.3,166.2 722.5,170.0 731.4,174.0 744.6,176.6 744.8,172.6 746.5,172.0 746.8,174.7 749.3,175.8 755.6,175.4 754.7,172.9 762.7,168.7 767.0,168.2 768.3,169.9 767.4,171.1 770.4,171.5",
 "757.4,188.8 756.6,192.6 753.9,186.8 751.4,186.7 750.8,189.3 747.3,188.7 746.4,182.7 744.7,181.9 747.0,179.9 745.0,178.4 746.0,176.5 749.5,177.9 749.8,179.8 756.6,180.6 753.2,184.7 754.7,186.2 756.0,184.4 757.4,188.8",
 "754.7,172.9 755.6,175.4 746.8,174.7 750.0,171.4 754.7,172.9",
 "744.8,172.6 744.6,176.6 742.3,176.7 722.5,170.0 726.5,165.5 738.4,171.7 744.8,172.6",
 "716.2,151.4 713.5,153.7 706.2,153.5 704.9,154.7 706.8,159.0 709.1,160.4 699.4,172.5 696.2,172.3 693.1,175.2 697.3,182.3 691.2,182.3 689.4,184.2 684.4,179.4 670.8,180.3 671.9,177.1 675.9,175.7 674.2,171.5 669.1,167.1 673.7,168.6 684.3,167.0 685.9,163.0 692.5,161.4 692.4,159.7 695.3,157.3 694.3,155.5 696.9,155.6 698.9,152.4 698.0,149.8 699.6,148.6 708.8,146.9 711.6,150.3 716.2,151.4",
 "684.8,146.2 692.2,146.8 696.7,143.1 699.6,147.9 703.5,145.8 708.8,146.9 698.0,149.8 698.9,152.4 696.9,155.6 694.3,155.5 695.3,157.3 692.4,159.7 692.5,161.4 685.9,163.0 684.3,167.0 673.7,168.6 669.1,167.1 671.6,164.6 668.2,158.4 670.0,151.0 675.0,151.7 679.3,149.1 679.9,146.9 682.6,145.4 684.8,146.2",
 "688.4,146.8 690.0,144.0 689.4,141.9 687.3,141.3 688.1,140.1 690.4,140.2 692.6,136.9 696.3,136.2 695.7,137.5 697.3,138.2 693.2,138.6 693.0,140.2 704.7,140.5 705.4,143.0 708.0,143.4 708.3,146.1 703.5,145.8 699.6,147.9 696.7,143.1 692.2,146.8 688.4,146.8",
 "697.1,132.6 699.6,131.0 704.1,131.9 706.1,129.7 722.9,132.4 713.6,135.9 712.6,137.7 709.6,137.3 704.7,140.5 699.4,140.9 693.0,140.2 693.2,138.6 699.4,138.5 702.9,136.5 695.6,134.7 697.1,132.6",
 "645.8,133.9 650.2,132.4 654.0,135.4 658.6,135.2 658.1,133.8 662.9,131.2 666.6,132.7 668.0,135.5 671.9,135.9 673.3,138.7 678.3,142.0 684.9,144.5 684.8,146.2 682.6,145.4 679.9,146.9 679.3,149.1 672.9,152.0 670.0,151.0 669.8,148.6 659.3,144.4 654.2,144.5 649.8,146.7 649.7,141.8 647.5,140.9 648.2,139.0 646.4,138.8 647.0,136.5 652.0,136.2 649.2,133.0 647.0,133.7 646.7,135.7 645.8,133.9",
 "634.9,166.9 631.5,159.8 626.2,155.6 628.0,150.9 622.8,144.5 622.5,140.5 624.4,139.7 628.2,142.4 633.5,140.0 633.4,142.2 636.7,145.6 645.2,148.1 654.2,144.5 659.3,144.4 669.8,148.6 668.2,158.4 671.6,164.6 669.1,167.1 674.2,171.5 675.9,175.7 671.9,177.1 670.8,180.3 659.4,178.5 658.3,175.1 652.0,176.4 648.6,175.5 643.1,172.6 639.2,166.3 634.9,166.9",
 "599.2,159.1 601.7,155.0 599.7,151.6 602.1,147.7 617.6,146.6 614.7,149.0 613.9,154.4 602.3,160.2 599.2,159.1",
 "629.2,142.3 621.3,138.2 621.1,135.9 626.6,136.6 629.2,142.3",
 "530.6,86.5 534.2,83.0 535.1,79.7 533.3,78.3 533.1,74.6 534.9,72.0 537.7,72.1 538.7,71.0 537.7,70.0 546.6,61.1 549.2,61.1 550.0,59.5 555.2,60.0 555.6,58.2 557.3,58.0 565.4,61.3 566.4,66.6 561.6,67.4 558.9,69.4 559.4,71.1 549.6,75.7 547.6,79.6 552.2,83.1 549.6,86.2 546.7,86.9 544.1,94.2 540.7,93.9 539.2,96.1 536.0,96.2 530.6,86.5",
 "578.3,94.0 585.8,95.7 585.4,97.7 590.8,101.8 587.0,102.6 588.3,105.3 585.9,105.4 584.9,107.4 570.4,105.8 565.4,106.7 565.2,100.2 570.9,99.2 573.6,95.5 578.3,94.0",
 "588.3,105.3 593.8,104.6 595.5,106.2 595.1,107.6 597.3,107.8 598.2,109.5 611.3,112.2 610.4,116.9 597.1,121.5 597.3,123.0 588.0,120.3 585.4,120.6 582.2,124.2 579.7,124.2 578.4,123.6 580.2,121.0 583.4,121.0 579.6,116.3 576.5,115.4 569.1,117.4 563.1,117.0 561.3,115.5 563.3,113.8 562.6,112.6 566.5,109.9 565.4,106.7 570.4,105.8 584.9,107.4 585.9,105.4 588.3,105.3",
 "565.2,100.2 566.1,103.6 564.4,104.2 566.7,109.2 562.6,112.6 563.3,113.8 560.0,112.6 555.1,113.3 548.8,110.1 544.9,109.9 541.7,108.0 539.1,102.8 539.2,100.7 549.0,97.6 565.2,100.2",
 "547.2,116.3 544.5,120.3 540.6,121.0 533.8,119.1 530.7,120.1 526.3,119.2 527.5,117.8 535.9,118.1 535.8,115.9 537.8,114.2 545.8,114.5 547.2,116.3",
 "561.3,115.5 563.1,117.0 558.4,121.3 551.3,122.9 545.0,119.9 547.2,116.3 549.6,117.3 557.8,114.9 561.3,115.5",
 "573.9,116.1 579.6,116.3 583.4,121.0 580.2,121.0 578.4,123.6 578.1,120.0 573.9,116.1",
 "578.4,123.6 582.2,124.2 580.1,125.2 579.3,128.6 575.7,127.3 563.7,128.3 563.1,126.2 559.9,125.6 556.2,121.9 564.3,116.4 569.1,117.4 573.9,116.1 578.1,120.0 578.4,123.6",
 "573.6,95.5 570.9,99.2 565.2,100.2 563.2,97.6 559.1,96.7 558.5,94.4 569.1,93.4 573.6,95.5",
 "575.8,90.3 578.3,94.0 573.6,95.5 569.1,93.4 558.5,94.4 559.9,90.5 562.6,89.6 564.8,91.6 567.0,91.6 567.5,89.5 569.9,89.0 575.8,90.3",
 "577.7,84.8 575.8,90.3 567.5,89.5 567.9,87.8 565.1,87.2 564.8,85.6 577.7,84.8",
 "539.2,100.7 541.7,108.0 534.0,110.4 537.8,114.2 535.8,115.9 535.9,118.1 520.7,117.7 522.5,113.8 518.5,113.3 516.8,110.8 516.6,106.0 519.0,104.9 519.7,100.9 522.6,101.3 524.4,99.9 523.7,97.3 527.6,97.3 530.4,100.0 534.8,98.7 539.2,100.7",
 "562.9,127.1 563.7,128.3 575.7,127.3 579.3,128.6 576.9,131.7 577.8,133.3 572.5,133.8 572.5,135.2 563.8,135.2 562.2,132.4 563.9,130.0 562.9,127.1",
 "573.0,151.9 568.7,153.0 565.3,152.0 565.8,150.8 573.0,151.9",
 "563.8,135.2 573.9,134.5 572.4,136.6 565.9,137.0 567.8,138.5 562.9,138.2 566.8,145.4 564.2,144.7 565.0,146.1 563.3,146.4 564.3,148.8 562.5,148.9 560.2,147.7 556.0,139.9 558.4,136.5 563.8,135.2",
 "624.4,146.7 602.1,147.7 600.4,150.5 599.4,149.2 600.4,148.2 596.4,147.8 594.5,149.4 585.1,148.1 582.5,149.6 576.8,148.2 573.1,143.9 574.5,141.7 572.7,140.4 575.8,137.7 580.1,137.6 581.2,135.5 586.5,135.9 593.1,133.3 597.7,133.2 606.5,136.3 618.4,134.5 624.4,139.7 622.5,140.5 624.4,146.7",
 "572.5,133.8 577.8,133.3 580.5,135.3 573.2,138.5 572.4,136.6 573.9,134.5 572.5,133.8",
 "558.4,136.5 556.0,139.9 553.9,138.2 553.6,132.8 554.8,131.4 557.0,132.7 558.4,136.5",
 "546.0,120.8 552.3,122.5 553.9,124.3 552.8,125.4 544.3,124.4 543.8,125.5 551.3,132.0 544.5,129.1 541.4,124.8 537.9,124.6 542.6,123.7 546.0,120.8",
 "526.7,118.0 526.3,119.2 529.0,119.7 527.6,121.3 520.2,122.8 516.7,121.5 518.7,117.9 526.7,118.0",
 "516.8,110.8 517.2,112.6 515.8,112.4 516.8,110.8",
 "517.1,108.9 515.8,112.4 507.0,107.9 513.8,107.0 517.1,108.9",
 "519.2,101.4 519.0,104.9 516.6,106.0 517.1,108.9 513.8,107.0 509.2,107.4 513.1,102.5 519.2,101.4",
 "474.9,133.7 477.0,132.6 482.3,135.1 479.2,139.9 480.5,144.2 478.2,147.7 475.3,147.6 475.4,143.7 473.5,142.4 475.6,136.8 474.9,133.7",
 "479.3,147.0 480.5,144.2 479.2,139.9 482.3,135.1 477.0,132.6 474.9,133.7 473.9,130.5 477.8,128.5 494.7,129.4 500.9,131.7 508.3,132.0 508.4,133.6 505.8,135.5 502.3,136.1 499.2,140.8 500.3,142.4 494.0,148.1 487.9,148.1 485.1,150.1 479.3,147.0",
 "482.8,100.4 483.2,102.4 481.1,104.8 472.3,106.1 474.5,103.2 473.1,100.3 479.0,96.9 479.0,99.8 482.8,100.4",
 "960.5,308.6 964.2,311.6 961.6,311.5 955.6,305.8 960.5,308.6",
 "949.1,276.7 946.1,273.1 949.1,276.7",
 "946.8,277.4 944.0,277.2 943.6,275.7 946.8,277.4",
 "943.4,272.3 944.2,273.7 939.5,270.6 943.4,272.3",
 "991.3,361.3 988.9,364.7 986.8,365.8 985.1,364.7 986.7,362.4 982.8,359.7 984.9,357.8 985.3,353.8 979.5,345.9 984.2,348.0 988.8,354.3 995.9,354.7 994.4,358.8 992.2,358.7 991.3,361.3",
 "971.3,371.0 980.0,362.5 981.2,364.8 983.2,363.7 984.0,364.9 979.8,370.5 980.8,371.8 976.3,372.9 973.9,377.5 970.4,379.6 962.5,377.4 971.3,371.0",
 "910.2,363.4 911.9,363.5 910.9,370.0 905.7,371.0 902.1,363.1 906.6,364.3 910.2,363.4",
 "850.4,339.5 845.1,341.6 843.5,344.1 833.0,344.4 827.8,347.4 824.0,347.3 819.5,345.0 821.7,339.5 814.8,322.5 816.1,323.7 815.1,321.2 817.3,323.1 815.0,317.7 815.9,312.4 817.1,310.4 817.3,312.5 824.2,307.5 835.7,304.7 841.7,295.6 842.9,298.0 844.1,297.4 843.1,296.1 843.9,294.8 845.2,295.4 849.1,289.5 853.0,288.4 856.6,291.3 860.1,291.6 859.5,290.1 862.8,284.8 868.3,283.7 866.2,281.3 867.7,280.9 875.8,284.0 879.1,282.9 880.4,284.3 877.7,287.0 876.4,291.7 889.5,299.2 892.4,295.5 893.6,284.5 895.9,279.6 899.8,290.4 901.6,289.4 903.8,291.6 906.6,302.7 913.5,306.6 915.8,312.1 918.7,312.2 919.2,315.2 924.6,320.2 926.6,328.1 924.7,337.9 917.6,349.1 916.7,354.0 906.4,358.4 902.4,356.7 902.9,355.3 898.9,357.8 890.7,355.6 887.7,350.4 883.7,348.9 883.9,345.5 880.1,347.9 883.0,343.4 882.8,341.4 877.7,346.9 875.6,345.8 873.0,340.6 864.8,337.5 850.4,339.5",
 "727.2,229.1 726.8,232.0 723.2,233.4 721.4,227.2 722.6,222.7 727.2,229.1",
 "804.1,199.5 801.8,198.6 801.7,196.2 807.7,194.2 806.5,198.1 804.1,199.5",
 "722.9,132.4 722.7,130.8 724.6,130.1 722.1,125.2 729.1,123.5 731.1,118.5 736.6,119.4 738.2,115.4 743.8,113.1 744.5,115.0 750.8,117.5 752.7,119.8 751.6,123.0 752.6,124.2 764.7,127.1 767.6,131.3 780.1,131.5 791.6,134.5 803.5,131.9 810.6,128.5 809.3,126.5 810.8,124.7 815.2,125.5 826.2,120.4 832.4,120.3 828.0,116.5 821.5,117.4 820.8,116.3 824.1,111.4 827.4,112.5 831.4,110.7 835.4,105.7 833.8,103.5 839.6,101.6 849.9,103.4 854.6,111.8 859.4,112.7 862.7,114.6 863.9,117.2 875.1,115.3 869.7,124.6 864.0,125.1 864.3,130.8 862.9,130.8 862.9,132.2 861.1,130.6 855.7,133.3 856.1,134.8 852.4,133.8 845.2,139.1 836.3,142.0 839.4,137.7 837.9,136.3 826.5,142.4 832.5,146.8 835.6,144.8 839.9,146.0 840.3,147.4 836.4,148.2 831.0,153.0 834.0,154.6 838.6,162.0 838.6,164.0 836.8,164.8 839.1,167.1 838.0,171.6 836.5,171.8 829.6,181.8 821.9,186.7 807.7,190.6 806.8,193.5 805.2,193.7 805.2,190.6 797.3,189.4 796.5,186.7 792.6,185.1 782.4,188.0 782.8,191.2 781.3,191.1 781.0,189.3 778.9,190.1 775.7,188.6 776.5,186.3 774.7,185.7 774.1,183.2 771.1,183.6 771.5,180.3 774.1,178.0 774.1,173.6 772.0,171.3 767.4,171.1 768.3,169.9 767.0,168.2 762.7,168.7 757.0,172.5 750.0,171.4 746.7,174.2 746.5,172.0 738.4,171.7 718.7,162.5 717.9,159.4 719.9,159.8 720.0,158.3 719.2,154.7 716.2,151.4 711.6,150.3 708.3,146.1 708.0,143.4 705.4,143.0 704.7,140.5 707.7,137.9 712.6,137.7 713.6,135.9 722.9,132.4",
 "838.3,182.2 835.4,189.0 833.6,184.6 837.5,179.7 838.3,182.2",
 "529.0,119.7 533.8,119.1 538.4,120.8 538.7,123.4 534.2,123.9 535.0,127.5 542.1,133.5 544.2,133.4 544.1,134.6 551.0,137.9 550.8,139.4 546.9,137.7 545.7,139.5 547.7,140.5 547.4,141.9 543.6,144.7 544.7,141.8 542.8,138.8 531.1,132.3 528.3,128.0 524.7,126.8 520.7,128.6 519.0,122.2 524.9,122.1 529.0,119.7",
 "541.0,144.0 543.1,143.8 541.9,148.3 534.5,145.5 534.9,144.1 541.0,144.0",
 "524.2,136.4 525.6,135.5 527.2,137.5 526.9,141.2 524.5,141.9 522.7,136.2 524.2,136.4",
 "527.6,97.3 523.7,97.3 522.5,92.9 529.4,89.6 528.5,92.0 530.3,93.2 526.8,95.9 527.6,97.3",
 "534.4,94.1 535.3,95.5 533.6,97.8 530.7,96.2 530.3,95.1 534.4,94.1",
 "482.8,100.4 479.0,99.8 479.0,96.9 484.3,98.5 482.8,100.4",
 "491.4,101.7 491.8,100.0 489.9,98.3 485.9,97.1 486.0,95.0 484.5,96.4 482.9,92.3 486.1,87.1 491.7,87.1 488.7,90.1 494.6,89.8 491.3,94.5 494.2,94.7 501.3,103.0 504.7,103.5 502.9,106.1 504.0,107.5 501.5,109.0 491.8,109.2 485.4,111.2 484.0,110.7 490.5,107.1 485.4,105.6 488.3,104.7 486.7,103.2 487.3,101.4 491.4,101.7",
 "459.7,65.4 459.1,67.2 462.2,69.1 448.2,73.6 436.8,72.3 439.5,71.1 433.5,69.7 438.3,68.4 432.4,67.7 434.3,65.9 438.5,65.5 442.8,67.4 447.1,65.9 459.7,65.4",
 "628.9,133.7 632.8,135.7 635.0,133.9 640.0,138.2 637.7,138.4 635.8,143.6 633.4,142.2 633.5,140.0 629.2,142.3 629.1,140.4 626.7,139.2 627.5,138.3 624.9,135.4 629.2,135.9 628.9,133.7",
 "628.2,142.4 624.4,139.7 627.1,140.4 628.2,142.4",
 "611.0,129.3 626.3,131.9 629.5,135.6 615.4,134.6 615.1,131.5 611.0,129.3",
 "835.6,214.7 834.2,212.6 837.6,213.7 836.8,216.1 835.6,214.7",
 "840.5,222.3 841.5,219.8 843.1,219.6 842.6,221.5 844.7,218.8 841.7,224.9 840.5,222.3",
 "851.0,226.6 851.5,230.0 850.5,232.6 849.5,229.7 848.2,231.1 848.3,234.5 845.1,232.9 845.1,229.6 843.4,228.2 838.7,230.0 843.0,225.9 844.0,227.1 848.5,225.0 848.4,222.9 850.6,224.2 851.0,226.6",
 "829.2,224.1 825.5,226.8 832.0,218.4 832.5,220.7 829.2,224.1",
 "839.8,199.4 840.3,202.5 838.0,205.7 838.1,210.2 844.3,211.7 844.7,215.2 841.5,212.4 840.8,213.4 839.0,211.7 835.1,211.5 836.1,209.7 834.9,210.0 833.1,207.2 835.3,198.6 839.8,199.4",
 "839.0,218.3 838.6,217.0 842.0,217.8 838.9,221.0 839.0,218.3",
 "848.6,216.2 849.4,219.3 847.3,218.6 848.0,221.2 846.7,221.8 845.3,218.1 846.9,217.2 845.2,215.1 848.6,216.2",
 "778.0,232.0 780.8,232.8 781.0,234.2 783.7,232.7 786.0,234.7 789.5,246.4 787.6,246.6 781.6,242.3 778.0,232.0",
 "827.5,238.5 821.8,238.0 818.4,246.0 807.0,247.9 805.1,246.3 804.6,244.4 808.8,244.9 809.4,242.5 813.9,241.4 817.2,237.4 818.5,238.9 820.4,238.0 820.7,234.9 824.2,230.8 831.1,235.0 827.5,238.5",
 "820.7,234.9 820.4,238.0 818.5,238.9 817.2,237.4 820.7,234.9",
 "538.4,120.8 546.0,120.8 542.6,123.7 538.1,123.6 538.4,120.8",
 "579.4,58.2 579.0,60.1 583.3,61.9 580.7,64.0 583.9,67.2 582.1,69.6 584.6,71.7 583.4,73.5 587.5,75.4 586.5,76.8 578.0,81.9 563.5,83.8 559.2,81.3 559.8,78.6 558.5,76.1 559.8,74.5 570.6,69.1 565.5,65.6 565.4,61.3 557.3,58.0 568.7,59.3 572.7,56.0 577.0,55.1 580.6,56.2 579.4,58.2",
 "562.7,113.7 560.8,115.8 557.8,114.9 549.6,117.3 546.9,115.4 551.5,112.5 562.7,113.7",
 "541.7,108.0 552.4,112.5 547.1,115.0 542.4,113.8 539.8,115.1 534.8,112.4 534.0,110.4 541.7,108.0",
 "601.2,209.9 602.4,202.9 606.7,200.0 609.1,205.8 619.7,214.7 617.6,215.2 611.2,209.7 605.3,208.4 604.4,210.5 601.2,209.9",
 "894.1,141.2 891.6,144.0 889.6,152.4 881.2,153.9 877.2,157.0 875.3,156.0 875.2,153.9 863.9,155.9 866.7,157.9 864.8,162.6 863.0,163.8 861.7,162.7 862.4,160.2 859.5,157.5 868.4,151.6 876.9,151.3 879.8,146.4 881.6,147.7 887.3,143.8 889.7,135.6 892.7,135.1 894.1,141.2",
 "901.7,127.9 903.7,126.7 904.3,129.8 900.2,130.6 897.7,133.3 893.4,131.4 891.9,134.5 888.8,134.5 888.4,131.8 889.8,129.6 892.7,129.5 894.4,123.5 901.7,127.9",
 "867.7,157.0 872.0,154.5 874.4,156.1 872.8,157.8 870.2,157.5 869.5,159.2 867.7,157.0",
 "338.4,306.0 339.1,311.4 345.0,312.1 346.1,316.5 349.2,316.7 347.8,323.9 345.3,326.1 337.2,325.3 339.5,319.9 331.0,316.3 325.9,311.8 328.4,304.5 335.8,303.8 338.4,306.0",
 "644.4,197.2 647.5,203.7 645.5,204.5 644.9,206.7 625.0,214.7 620.8,214.9 618.3,207.7 620.5,201.2 630.6,202.9 636.4,198.3 644.4,197.2",
 "597.1,168.5 600.2,168.9 604.2,166.7 605.6,165.3 602.8,162.5 608.9,160.7 616.4,163.4 624.2,168.9 631.8,169.4 639.3,175.9 639.6,178.9 642.7,181.6 644.4,186.1 653.4,186.9 654.6,188.9 652.8,194.4 636.4,198.3 630.6,202.9 620.5,201.2 618.8,204.6 613.7,195.9 608.7,190.9 606.9,184.2 604.1,182.5 597.6,172.0 596.2,172.1 597.1,168.5",
 "364.8,466.8 370.4,466.2 378.0,468.0 379.6,472.3 359.8,475.1 349.5,474.0 358.4,471.2 364.8,466.8",
 "315.9,472.9 328.1,473.3 331.6,471.2 334.5,472.3 332.9,475.0 320.9,474.8 315.9,472.9",
 "294.7,448.0 299.8,447.8 300.7,443.1 304.9,441.3 310.2,448.4 308.9,450.5 298.9,451.3 300.3,450.3 291.8,450.2 291.6,449.1 294.7,448.0",
 "215.7,449.7 231.1,449.9 232.8,451.4 220.0,451.4 215.7,449.7",
 "159.4,454.6 170.2,454.1 166.0,455.8 159.4,454.6",
 "146.4,454.1 155.5,455.2 146.4,454.1",
 "45.2,468.3 52.1,467.7 57.8,470.8 52.4,471.2 45.2,468.3",
 "1000.0,485.3 1000.0,500.0 0.0,500.0 0.0,485.3 2.6,483.7 15.6,484.8 27.9,483.0 60.9,487.1 87.4,487.8 102.5,486.2 103.1,484.9 73.4,482.5 75.4,477.9 64.3,475.3 81.5,475.9 93.3,473.2 84.6,470.4 68.5,469.6 61.0,466.7 60.1,463.6 79.6,465.0 94.2,462.4 93.9,459.4 97.5,458.9 99.1,459.8 124.4,456.4 167.5,456.9 183.5,454.8 188.1,457.5 220.4,459.2 221.9,458.0 215.2,455.9 212.0,451.7 232.4,454.5 249.8,453.7 252.1,451.6 273.7,455.1 277.0,453.1 292.0,455.2 312.9,451.3 313.2,449.0 309.6,443.7 312.7,439.3 311.8,437.0 323.3,430.3 339.4,425.8 341.0,426.5 340.0,427.4 327.7,430.0 326.0,431.9 327.4,433.9 322.9,434.7 317.6,438.8 324.5,442.3 328.3,446.4 331.0,454.7 321.2,459.1 303.9,462.9 285.4,463.1 295.4,466.4 283.5,467.7 283.3,469.9 290.7,472.9 334.2,478.8 338.3,481.2 361.8,477.0 381.1,478.0 386.7,476.0 420.7,473.2 417.5,470.2 401.0,470.7 400.6,467.6 401.9,467.0 419.8,463.0 451.3,458.7 456.4,456.9 457.2,455.9 454.3,455.2 457.1,453.2 465.9,451.1 471.4,448.0 479.4,449.2 480.9,447.0 487.9,448.5 498.2,447.9 499.4,449.0 521.5,444.1 526.5,444.5 530.0,446.8 537.3,444.4 542.0,445.6 553.5,444.1 562.7,446.4 575.3,445.7 588.9,443.5 594.1,440.3 607.4,443.8 651.5,432.8 656.5,433.3 663.2,436.9 670.6,438.8 677.9,437.2 691.4,438.7 693.5,442.3 688.4,445.3 691.9,446.3 688.7,449.6 694.1,450.7 697.3,450.2 705.2,444.1 715.7,443.0 719.8,439.8 729.9,436.7 741.0,436.5 744.4,433.9 749.1,436.5 766.1,437.2 777.0,436.8 785.6,432.1 794.9,435.9 815.6,433.0 821.1,435.3 832.9,436.9 842.3,434.7 857.8,435.4 874.3,433.9 875.2,431.4 881.8,436.0 904.1,435.9 907.4,438.6 913.4,440.0 923.6,441.3 928.6,440.4 948.8,446.1 964.7,446.8 975.6,449.2 970.2,454.6 961.4,456.6 954.4,461.8 954.1,464.1 957.6,467.2 963.9,468.8 949.4,469.9 943.9,474.8 970.6,482.8 1000.0,485.3",
 "590.9,152.4 596.0,150.9 594.4,152.6 590.9,152.4",
 "590.9,152.4 594.5,152.8 591.6,154.0 589.6,152.5 590.9,152.4",
 "494.0,152.3 496.4,160.4 489.9,162.1 489.7,164.2 485.4,166.7 475.9,169.9 475.6,174.7 468.4,175.3 465.3,181.2 461.4,184.2 459.0,190.3 452.7,190.5 459.9,177.1 473.4,166.9 472.7,163.4 476.0,157.7 480.8,155.2 483.5,150.7 494.0,152.3",
 "602.4,188.9 569.4,188.9 568.6,166.5 569.9,162.3 580.3,164.2 586.0,162.3 588.8,164.1 595.2,163.3 597.0,168.1 594.9,172.7 589.8,167.3 599.1,183.5 598.7,185.8 602.4,188.9",
 "569.4,188.9 569.4,194.4 566.2,194.4 566.2,195.6 544.1,185.0 539.3,187.5 529.9,181.8 528.6,182.3 525.9,177.5 527.6,162.8 531.8,160.1 531.9,158.0 542.3,160.4 543.6,162.8 553.0,165.9 555.7,163.9 555.1,161.8 557.9,159.1 569.2,161.4 569.4,188.9",
 "632.7,227.8 624.9,236.1 621.3,236.2 616.3,239.1 613.2,238.2 609.9,240.5 600.4,237.6 596.4,231.7 591.5,228.4 594.0,226.7 595.2,220.5 599.6,215.1 601.2,209.9 604.4,210.5 605.3,208.4 611.2,209.7 615.6,212.6 617.6,215.2 616.0,219.3 618.8,219.6 618.2,220.6 621.3,224.5 632.7,227.8",
 "617.6,215.2 620.3,215.6 618.8,219.6 616.0,219.3 617.6,215.2",
 "636.0,218.3 635.9,223.7 632.7,227.8 621.3,224.5 618.2,220.6 619.8,218.2 622.5,221.0 636.0,218.3",
 "594.2,252.6 582.2,253.7 583.0,248.3 586.6,243.9 585.5,243.5 586.8,239.5 592.8,239.5 594.5,238.2 595.8,240.1 597.3,244.7 594.1,249.7 594.2,252.6",
 "584.5,253.2 585.4,256.4 580.6,257.9 581.4,254.5 584.5,253.2",
 "551.6,131.5 545.7,127.7 543.8,125.5 544.3,124.4 553.8,125.4 554.0,129.0 551.6,131.5",
 "562.2,132.4 563.8,135.2 557.2,135.9 557.7,133.2 562.2,132.4",
 "552.3,122.5 556.2,121.9 559.9,125.6 563.1,126.2 562.3,127.8 563.9,130.0 562.6,132.1 559.9,132.7 560.5,131.4 557.8,129.8 556.3,131.1 553.4,129.1 554.4,127.7 552.3,122.5",
 "555.8,131.7 553.8,133.7 551.3,132.0 553.4,129.1 556.5,130.8 555.8,131.7",
 "557.2,133.7 555.8,131.7 557.3,130.0 560.5,131.4 557.2,133.7",
 "328.7,220.1 330.8,219.8 330.7,221.9 327.9,222.0 328.7,220.1",
 "585.6,240.3 582.5,237.2 577.7,237.8 566.4,226.1 568.2,225.2 569.6,221.5 571.6,221.1 574.3,223.7 580.5,223.9 583.3,221.4 587.1,222.7 590.0,219.2 589.1,216.7 592.2,216.2 594.4,225.9 591.5,228.4 594.7,229.9 598.1,234.7 592.8,239.5 585.6,240.3"
];
function project(lon,lat){ return [(lon+180)/360*1000,(90-lat)/180*500]; }

function drawMap(svgEl,interactive){
  svgEl.innerHTML='';
  svgEl.setAttribute('viewBox','0 0 1000 500');
  const bg=document.createElementNS('http://www.w3.org/2000/svg','rect');
  bg.setAttribute('width','1000');bg.setAttribute('height','500');bg.setAttribute('fill','#070b14');
  svgEl.appendChild(bg);
  for(let gx=0;gx<=1000;gx+=50){
    const l=document.createElementNS('http://www.w3.org/2000/svg','line');
    l.setAttribute('x1',gx);l.setAttribute('y1',0);l.setAttribute('x2',gx);l.setAttribute('y2',500);
    l.setAttribute('stroke','#0e1420');l.setAttribute('stroke-width','1');svgEl.appendChild(l);
  }
  CONTINENTS.forEach(pts=>{
    const p=document.createElementNS('http://www.w3.org/2000/svg','polygon');
    p.setAttribute('points',pts);p.setAttribute('class','land-poly');svgEl.appendChild(p);
  });
  COUNTRIES.forEach(c=>{
    const [x,y]=project(c.lon,c.lat);
    const g=document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class','country-node'+(mstate.selectedCountry===c.id?' selected':''));
    g.setAttribute('transform',`translate(${x},${y})`);
    g.dataset.id=c.id;
    g.innerHTML=`<circle class="pulse" r="6"></circle><circle class="dot" r="3.6" fill="${c.color}"></circle><text x="8" y="4">${c.name}</text>`;
    if(interactive!==false) g.addEventListener('click',()=>selectCountry(c.id));
    svgEl.appendChild(g);
  });
}

/* ================= COUNTRY PICKER ================= */
// ---- Live map embed --------------------------------------------------------
// The picker's flat SVG dot-map is replaced with the ACTUAL game map
// (world_map_webgl.html) embedded in picker mode (?pickerMode=1): a read-only
// world preview where clicking any of the ~200 countries/territories posts a
// {type:'mp1-picker-select', code, name} message back here. Mounted once and
// kept alive across picker open/close so the ~14MB geometry only loads once
// per menu session. If the iframe can't load (e.g. opened as file:// instead
// of over HTTP), the old drawMap() SVG remains untouched as the fallback —
// mountPickerMap() only swaps it out on successful mount.
let pickerMapMounted = false;
let pickerMapEra = null;
function mountPickerMap(){
  const preset = (typeof PRESETS !== 'undefined' && PRESETS.find) ? PRESETS.find(function(p){ return p.id === mstate.currentPreset; }) : null;
  const era = (preset && preset.era) || '';
  const src = MAP_GAME_URL + '?pickerMode=1' + (era ? ('&era=' + encodeURIComponent(era)) : '');
  const existingFrame = document.getElementById('picker-map-frame');
  if (pickerMapMounted && existingFrame) {
    if (era !== pickerMapEra) { existingFrame.src = src; pickerMapEra = era; }
    return;
  }
  const svg = document.getElementById('worldmap');
  if (!svg) return;
  try {
    const iframe = document.createElement('iframe');
    iframe.id = 'picker-map-frame';
    iframe.src = src;
    iframe.setAttribute('title', 'World map — click a country to select it');
    iframe.style.cssText = 'width:100%;height:100%;min-height:320px;border:0;display:block;border-radius:inherit;background:#182a63;';
    svg.replaceWith(iframe);
    pickerMapMounted = true;
    pickerMapEra = era;
  } catch(e){
    // SVG fallback stays in place; draw it as before.
    drawMap(svg, true);
  }
}

// ISO3 -> display-name lookup for the full ~200-country/territory set the real
// map can select (the curated COUNTRIES array only covers ~44). Fetched once.
let COUNTRY_NAME_LOOKUP = null;
async function ensureCountryNameLookup(){
  if (COUNTRY_NAME_LOOKUP) return COUNTRY_NAME_LOOKUP;
  try { COUNTRY_NAME_LOOKUP = await fetch('./country_lookup.json').then(r=>r.json()); }
  catch(e){ COUNTRY_NAME_LOOKUP = {}; }
  return COUNTRY_NAME_LOOKUP;
}

// Any country the real map can click must be selectable/playable, not just the
// curated 44 — unknown codes get a COUNTRIES entry minted on the fly so every
// downstream flow (selectCountry, banner, confirmPlay, custom-entity region
// chips) keeps working off the same array it always has.
function ensureCountryEntry(iso3, name){
  let c = COUNTRIES.find(x => x.iso3 === iso3);
  if (c) return c;
  c = {
    id: 'map-' + String(iso3).toLowerCase(),
    name: name || iso3,
    iso3: iso3,
    flag: '',
    color: '#c9a05c',
    lon: 0, lat: 0,
    plays: '—'
  };
  COUNTRIES.push(c);
  return c;
}

// Selection messages from the embedded picker-mode map.
window.addEventListener('message', async function(ev){
  const d = ev.data;
  if (!d || d.type !== 'mp1-picker-select' || !d.code) return;
  const lookup = await ensureCountryNameLookup();
  const name = d.name || lookup[d.code] || d.code;
  const entry = ensureCountryEntry(d.code, name);
  selectCountry(entry.id);
});

async function openPicker(){
  document.getElementById('picker-overlay').classList.add('active');
  await loadEraCountryData(getActiveEra());
  setPickerTab('picks');
  mountPickerMap();
  updateBanner();
}
function closePicker(){ document.getElementById('picker-overlay').classList.remove('active'); }
function setPickerTab(tab){
  mstate.pickerTab=tab;
  document.querySelectorAll('#menu-shell .ptab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));
  if(tab==='custom'){
    document.getElementById('picker-list-wrap').style.display='none';
    document.getElementById('custom-wrap').style.display='flex';
    renderSwatches();
    renderRegionChips();
  } else {
    document.getElementById('picker-list-wrap').style.display='block';
    document.getElementById('custom-wrap').style.display='none';
    renderCountryList();
  }
}
// Historical flag SVGs for era-specific entities (Austria-Hungary, Ottoman
// Empire, German Empire in 1914; Soviet Union, Kingdom of Yugoslavia in
// 1936/1939) — mirrors era_1914.json / era_1936.json / era_1939.json's own
// entities{}.flag fields exactly, just with paths normalized to be relative
// to THIS project's root (where menu.html always lives), rather than
// relative to wherever the map engine file itself happens to sit (Geo/ for
// Map Painter 2, project root for Map Painter 1) — those two are not the same
// base path, so the era JSON's own flag strings can't be reused as-is here.
// Without this, the picker had no idea these historical flags existed at
// all: ensureCountryEntry() minted a blank flag for any code it didn't
// already recognize, and real-country entries always fell through to
// flagcdn.com's current-day flag regardless of which era was active — so
// Austria-Hungary, the Ottoman Empire, Imperial Germany, the Soviet Union,
// and the Kingdom of Yugoslavia never showed their actual flag anywhere in
// the picker (list, selected-country banner, or custom-entity region chips),
// even though the artwork existed on disk the whole time.
const ERA_ENTITY_FLAGS = {
  '1911': { AUH: 'assets/flags/AUH/1914.png', OTT: 'assets/flags/OTT/1914.png', DEU: 'assets/flags/DEU/1914.png', RAJ: 'assets/flags/RAJ/1914.png', MAR: 'assets/flags/MAR/1911.png', RUS: 'assets/flags/RUS/1914.png', CHN: 'assets/flags/CHN/1911.png', IRN: 'assets/flags/IRN/1907.png', SAU: 'assets/flags/SAU/1902.png', THA: 'assets/flags/THA/1855.png', ITA: 'assets/flags/ITA/1861.png', ESP: 'assets/flags/ESP/1875.png' },
  '1914': { AUH: 'assets/flags/AUH/1914.png', OTT: 'assets/flags/OTT/1914.png', DEU: 'assets/flags/DEU/1914.png', RAJ: 'assets/flags/RAJ/1914.png', RUS: 'assets/flags/RUS/1914.png', CHN: 'assets/flags/CHN/1912.png', IRN: 'assets/flags/IRN/1907.png', SAU: 'assets/flags/SAU/1902.png', THA: 'assets/flags/THA/1855.png', TIB: 'assets/flags/TIB/1912.png', ITA: 'assets/flags/ITA/1861.png', ESP: 'assets/flags/ESP/1875.png', ROU: 'assets/flags/ROU/1881.png', SRB: 'assets/flags/SRB/1882.png' },
  '1936': { SOV: 'assets/flags/SOV/1939.png', YUG: 'assets/flags/YUG/1939.png', DEU: 'assets/flags/DEU/1939.png', MAN: 'assets/flags/MAN/1932.png', YNW: 'assets/flags/YNW/1927.png', XJW: 'assets/flags/XJW/1934.png', NGM: 'assets/flags/NGM/1930.png', CHN: 'assets/flags/CHN/1928.png', ITA: 'assets/flags/ITA/1861.png', ESP: 'assets/flags/ESP/1931.png', ROU: 'assets/flags/ROU/1881.png', HUN: 'assets/flags/HUN/1920.png', ZAF: 'assets/flags/ZAF/1928.png', DZG: 'assets/flags/DZG/1920.png', TIB: 'assets/flags/TIB/1912.png' },
  '1939': { SOV: 'assets/flags/SOV/1939.png', YUG: 'assets/flags/YUG/1939.png', DEU: 'assets/flags/DEU/1939.png', MAN: 'assets/flags/MAN/1932.png', XJW: 'assets/flags/XJW/1934.png', NGM: 'assets/flags/NGM/1930.png', BOH: 'assets/flags/BOH/1939.png', CHN: 'assets/flags/CHN/1928.png', ITA: 'assets/flags/ITA/1861.png', ESP: 'assets/flags/ESP/1938.png', ROU: 'assets/flags/ROU/1881.png', HUN: 'assets/flags/HUN/1920.png', ZAF: 'assets/flags/ZAF/1928.png', TIB: 'assets/flags/TIB/1912.png' }
};
function getActiveEra(){
  const preset = (typeof PRESETS !== 'undefined' && PRESETS.find) ? PRESETS.find(function(p){ return p.id === mstate.currentPreset; }) : null;
  return (preset && preset.era) || null;
}

// ---- Era-aware country roster -------------------------------------------
// Historical presets fold many real, modern countries into a handful of
// great-power entities (e.g. Ukraine/Poland/Finland -> Russian Empire in
// 1914; Turkey itself -> Ottoman Empire) via era_*.json's own
// countryReassignments table — the SAME table maybeApplyEraOverrides() uses
// in the actual game. Without pulling that into the picker too, "Turkiye"
// played as modern Turkey's own code instead of the Ottoman Empire, and
// countries with no sovereignty at all in that era (Ukraine, Poland) showed
// up as directly playable nations with their modern flag — wrong on both
// counts, since every other part of the game (map borders, in-game Chat/
// Country Detail flags) already treats that era as having no such country.
// era_*.json now lives in a dedicated presets/ folder at the project root
// (moved out of the project root/Geo/ clutter) — both Map Painter 1 and
// Map Painter 2 use this same 'presets/' convention, since menu.html always
// lives at each game's project root regardless of where the map engine
// itself sits.
const ERA_DATA_DIR = 'presets/';
let ERA_DATA_CACHE = {};
async function loadEraCountryData(era){
  if (!era) return null;
  if (ERA_DATA_CACHE[era]) return ERA_DATA_CACHE[era];
  try {
    const data = await fetch(ERA_DATA_DIR + 'era_' + era + '.json?v=1').then(function(r){ return r.json(); });
    ERA_DATA_CACHE[era] = data;
    return data;
  } catch (e) { return null; }
}
// Which real-country code actually governs `code` in the active era — itself,
// unless era_*.json's countryReassignments folds it into someone else.
function resolveEraOwnerCode(code){
  const era = getActiveEra();
  const data = era && ERA_DATA_CACHE[era];
  if (!data) return code;
  return (data.countryReassignments && data.countryReassignments[code]) || code;
}
// The era-specific display name for a code, if era_*.json's entities{}
// overrides it (covers both brand-new codes like AUH/OTT and existing real
// codes that just get renamed, like RUS -> "Russian Empire"); otherwise the
// given fallback (the country's normal, modern name).
function getEraDisplayName(code, fallbackName){
  const era = getActiveEra();
  const data = era && ERA_DATA_CACHE[era];
  const ent = data && data.entities && data.entities[code];
  return (ent && ent.name) || fallbackName;
}
// The great powers/notable playable entities for each historical era's
// "Picks" row, in place of the fixed modern top-8. Resolved through
// ensureCountryEntry() below so AUH/OTT (which don't exist in the curated
// COUNTRIES array at all) get minted with their correct historical name on
// first use, while RUS/GBR/FRA/USA/ITA/etc. reuse their existing entries.
const ERA_PICKS = {
  '1911': ['AUH','OTT','RUS','DEU','GBR','RAJ','FRA','MAR'],
  '1914': ['AUH','OTT','RUS','DEU','GBR','RAJ','FRA','USA'],
  '1936': ['DEU','SOV','GBR','FRA','ITA','JPN','USA','POL'],
  '1939': ['DEU','SOV','GBR','FRA','ITA','JPN','USA','POL']
};
function getPicksList(){
  const era = getActiveEra();
  const codes = era && ERA_PICKS[era];
  if (!codes) return COUNTRIES.slice(0,8);
  return codes.map(function(code){
    const name = getEraDisplayName(code, code);
    return ensureCountryEntry(code, name);
  });
}
// Builds the flag <img>/emoji markup for a country code, preferring a
// historical SVG for the active preset's era over the modern flagcdn.com
// image. `sizeSeg` is the flagcdn width segment already used at each call
// site (w80/w40) so historical and real flags visually match in context.
function buildPickerFlagHTML(code, sizeSeg, fallbackEmoji){
  const era = getActiveEra();
  const historical = era && ERA_ENTITY_FLAGS[era] && ERA_ENTITY_FLAGS[era][code];
  if (historical) return `<img src="${historical}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${fallbackEmoji||''}'">`;
  const iso2 = (ISO3_TO_ISO2[code]||'').toLowerCase();
  if (!iso2) return fallbackEmoji || '';
  return `<img src="https://flagcdn.com/${sizeSeg}/${iso2}.png" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${fallbackEmoji||''}'">`;
}

function renderCountryList(){
  const q=(document.getElementById('country-search').value||'').toLowerCase();
  let list = (mstate.pickerTab==='picks' && !q) ? getPicksList() : COUNTRIES;
  list = list.filter(c=>c.name.toLowerCase().includes(q));
  document.getElementById('country-list').innerHTML = list.map(c=>{
    const ownerCode = resolveEraOwnerCode(c.iso3);
    const isAbsorbed = ownerCode !== c.iso3;
    const displayName = getEraDisplayName(ownerCode, c.name);
    const flagImg = buildPickerFlagHTML(ownerCode, 'w80', c.flag);
    const subtitle = isAbsorbed ? ('Part of ' + displayName) : (c.plays + ' plays');
    return `
    <div class="country-row ${mstate.selectedCountry===c.id?'selected':''}" onclick="selectCountry('${c.id}')">
      <div class="flag">${flagImg}</div>
      <div class="cinfo"><div class="name">${c.name}</div><div class="plays">${subtitle}</div></div>
    </div>`;
  }).join('') || `<div style="padding:30px;text-align:center;color:var(--m-text-faint);font-size:13px;">No polities match "${q}"</div>`;
}
function selectCountry(rawId){
  const raw = COUNTRIES.find(x=>x.id===rawId);
  const ownerCode = raw ? resolveEraOwnerCode(raw.iso3) : null;
  // Absorbed country selected (e.g. clicking "Ukraine" during a WW1 game) —
  // redirect to (or mint) the actual era-effective sovereign so the rest of
  // this function, and everything downstream (banner, Play button, launch),
  // operates on the country that's actually playable, not the modern one
  // that has no sovereignty in this era.
  const id = (raw && ownerCode && ownerCode !== raw.iso3)
    ? ensureCountryEntry(ownerCode, getEraDisplayName(ownerCode, ownerCode)).id
    : rawId;
  mstate.selectedCountry=id;
  renderCountryList();
  document.querySelectorAll('#worldmap .country-node').forEach(n=>n.classList.toggle('selected',n.dataset.id===id));
  updateBanner();
  const cta=document.getElementById('picker-cta');
  const c=COUNTRIES.find(x=>x.id===id);
  cta.disabled=false;
  cta.textContent='Play as '+getEraDisplayName(c.iso3, c.name);
  if(pickingRegionsFor==='custom'){
    if(!mstate.customRegions.includes(id)) mstate.customRegions.push(id);
    pickingRegionsFor=null;
    closePicker();
    setPickerTab('custom');
  }
}
function updateBanner(){
  const banner=document.getElementById('selected-banner');
  if(!mstate.selectedCountry || pickingRegionsFor){banner.classList.remove('show');return;}
  const c=COUNTRIES.find(x=>x.id===mstate.selectedCountry);
  document.getElementById('banner-flag').innerHTML = buildPickerFlagHTML(c.iso3, 'w80', c.flag);
  document.getElementById('banner-name').textContent=getEraDisplayName(c.iso3, c.name);
  banner.classList.add('show');
}

// ---- Launching the REAL map game --------------------------------------
// This menu used to POST to a separate Flask backend (/api/new_game) and
// reveal its own text-only #game-shell (dossier/sitrep feed, no map). That
// was a fully separate prototype. This menu is now the front door to the
// actual game: world_map_webgl.html. "Play" writes straight into the same
// localStorage key game.js reads on load (mappainter1_gamestate_v1) and
// redirects there — no server round-trip needed.
const MAP_GAME_URL = 'world_map_webgl.html';
const GAME_STATE_KEY = 'mappainter1_gamestate_v1';
const PENDING_GRANT_KEY = 'mp1_pending_region_grant';

async function confirmPlay(){
  const c=COUNTRIES.find(x=>x.id===mstate.selectedCountry);
  if(!c) return;
  await launchGame({ iso3: c.iso3, entity_meta:{color:c.color, flag:c.flag, custom:false} });
}
async function confirmCustom(){
  const name=document.getElementById('entity-name').value.trim() || 'Unnamed Entity';
  const regionIso3 = mstate.customRegions.map(id=>{
    const c = COUNTRIES.find(cc=>cc.id===id);
    return c ? c.iso3 : null;
  }).filter(Boolean);
  await launchGame({
    nation: name,
    custom: true,
    color: mstate.entityColor,
    regionIso3: regionIso3,
  });
}
// Generates a fresh 3-letter code for a custom entity the same way game.js's
// own getOrCreateCountryCode() does (base = first 3 letters of the name,
// numeric suffix on collision) — checked against the real country_lookup.json
// so it can never collide with a real nation's code.
async function mintCustomCode(name){
  let base = String(name).toUpperCase().replace(/[^A-Z]/g,'').slice(0,3);
  if (base.length < 3) base = (base + 'XXX').slice(0,3);
  let lookup = {};
  try { lookup = await fetch('./Geo/country_lookup.json').then(r=>r.json()); } catch(e){}
  let code = base, n = 1;
  while (lookup[code]) { code = base.slice(0,2) + n; n++; }
  return code;
}
async function launchGame(opts){
  closePicker();
  if (window.showLoading) window.showLoading('Preparing the map…');
  try {
    let playerCode = opts.iso3 || null;
    const customCountries = {};
    if (opts.custom) {
      playerCode = await mintCustomCode(opts.nation);
      customCountries[playerCode] = opts.nation;
    }
    // A fresh "new game" — wipe any previous save the same way the in-game
    // Settings panel's "Start New Game" button does, so old history/chats
    // from a prior playthrough don't leak into this one.
    try { localStorage.removeItem(GAME_STATE_KEY); } catch(e){}
    // The start date comes from whichever preset is actually open (its own
    // startDate field, e.g. '1914-07-28' for WW1) rather than being hardcoded
    // to the Modern Day default — previously this always wrote 2016-01-01
    // regardless of preset, so a WW1/WW2 game would silently start on the
    // wrong date even though its "World Before"/"Simulation Rules" text was
    // era-correct.
    const activePreset = PRESETS.find(p => p.id === mstate.currentPreset);
    const startDate = (activePreset && activePreset.startDate) || '2016-01-01';
    // Historical presets also carry an `era` tag ('1914' / '1936' / '1939') —
    // the map engine (game.js's maybeApplyEraOverrides()) reads it on load and
    // expands the matching era_<era>.json dataset (project root, next to
    // world_map_webgl.html) into real per-province ownership overrides, so the
    // map underneath actually shows that era's borders instead of the modern
    // 2016 baseline.
    // Save name: game name + the real date this game was started + the
    // nation being played, e.g. "Map Painter 1 · 10/10/26 · Germany".
    const startedAt = new Date();
    const startedLabel = String(startedAt.getMonth() + 1).padStart(2, '0') + '/' +
      String(startedAt.getDate()).padStart(2, '0') + '/' + String(startedAt.getFullYear()).slice(-2);
    const nationName = opts.custom ? opts.nation
      : ((COUNTRIES.find(x => x.iso3 === playerCode) || {}).name || playerCode);
    const freshState = {
      saveName: 'Map Painter 1 · ' + startedLabel + ' · ' + nationName,
      startedAt: startedAt.toISOString(),
      currentDate: startDate,
      round: 1,
      playerCountry: playerCode,
      customCountries: customCountries,
      era: (activePreset && activePreset.era) || null,
      // Seeds GameState.simulationRules — this preset's "Simulation Rules" text
      // (including any local override saved via saveRulesOverride() above),
      // now actually read by game.js's runJumpForward() on every Jump Forward
      // instead of just being displayed on this page. Editable mid-game via
      // the in-game Menu > Prompts panel from here on.
      simulationRules: (activePreset && activePreset.rules) || '',
      // Seeds GameState.worldBefore — this preset's "before" field (shown on
      // this page as "The World Before Start Date"), fed to the same set of
      // AI prompts as simulationRules from here on.
      worldBefore: (activePreset && activePreset.before) || ''
    };
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(freshState));
    // Custom entities with starting regions: the actual province-level
    // territory transfer needs the full ~49k-shape geometry data, which only
    // world_map_webgl.html loads. Leave a note for it to pick up and apply
    // once (see applyPendingCustomEntityGrant() there), then self-delete.
    if (opts.custom && opts.regionIso3 && opts.regionIso3.length) {
      localStorage.setItem(PENDING_GRANT_KEY, JSON.stringify({ code: playerCode, name: opts.nation, countryCodes: opts.regionIso3 }));
    } else {
      try { localStorage.removeItem(PENDING_GRANT_KEY); } catch(e){}
    }
    window.location.href = MAP_GAME_URL;
  } catch(e){
    if (window.hideLoading) window.hideLoading();
    alert('Could not start the game: ' + e.message);
  }
}

/* ---- custom entity ---- */
function renderSwatches(){
  document.getElementById('swatch-grid').innerHTML = SWATCHES.map(sw=>`
    <div class="swatch ${mstate.entityColor===sw?'selected':''}" style="background:${sw}" onclick="pickSwatch('${sw}')"></div>`).join('');
}
function pickSwatch(sw){ mstate.entityColor=sw; renderSwatches(); }
function renderRegionChips(){
  const era = getActiveEra();
  document.getElementById('region-chips').innerHTML = mstate.customRegions.map(id=>{
    const c=COUNTRIES.find(x=>x.id===id);
    const historical = era && ERA_ENTITY_FLAGS[era] && ERA_ENTITY_FLAGS[era][c.iso3];
    const iso2 = (ISO3_TO_ISO2[c.iso3]||'').toLowerCase();
    const flagImg = historical
      ? `<img src="${historical}" style="width:16px;height:12px;object-fit:cover;border-radius:2px;vertical-align:middle;" onerror="this.remove()">`
      : (iso2 ? `<img src="https://flagcdn.com/w40/${iso2}.png" style="width:16px;height:12px;object-fit:cover;border-radius:2px;vertical-align:middle;" onerror="this.remove()">` : '');
    return `<span class="region-chip">${flagImg} ${c.name} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" onclick="removeRegion('${id}')" style="cursor:pointer"><path d="M18 6L6 18M6 6l12 12"/></svg></span>`;
  }).join('') || `<span style="font-size:12px;color:var(--m-text-faint);">No regions selected</span>`;
}
function removeRegion(id){ mstate.customRegions = mstate.customRegions.filter(r=>r!==id); renderRegionChips(); }

/* ================= INIT ================= */
function initMenu(){
  renderGames();
  renderPresets();
  renderFlags();
}
