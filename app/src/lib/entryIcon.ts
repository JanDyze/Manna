// An entry's own icon, from what it says: "Jollibee" gets fried chicken, "Gasoline" the fuel pump, a Shopee
// order whatever was bought. Rules are tried in order and the first one that matches wins, so the specific
// ones (what was bought) come before the general ones (where it was bought). Nothing matches: the
// category's icon, as before.

const RULES: [RegExp, string][] = [
  // fees on their own ("Wise transfer fee", "ATM withdrawal fee"), not a price that happens to include a fee
  [/\b(transfer|withdrawal|atm|bank|service|convenience|processing|late|annual)\s+(fees?|charges?)\b/i, 'percent'],

  // ---- food & drink
  [/jollibee|chickenjoy|mcdo|mcdonald|\bkfc\b|mang inasal|fried chicken|\bchicken\b|popeyes|texas chicken|bonchon/i, 'chicken'],
  [/burger/i, 'burger'],
  [/pizza|greenwich|shakey|yellow cab/i, 'pizza'],
  [/red ribbon|goldilocks|\bcakes?\b|cupcake|conti'?s/i, 'cake'],
  // bread before coffee: "Spinach bread – Sip Coffee" is bread bought at a coffee shop
  [/bread|pandesal|bakery|bakeshop|ensaymada|donut|doughnut|\bbuns?\b/i, 'bread'],
  [/iced coffee|coftea|cold brew|frapp/i, 'icedcoffee'],
  [/milk ?tea|boba|chatime|macao imperial|gong cha|tiger sugar/i, 'milktea'],
  [/coffee|\bkape\b|starbucks|\bcafe\b|café|tim hortons|\blatte\b/i, 'hotcoffee'],
  [/ice ?cream|sorbetes|halo-?halo|dairy queen/i, 'icecream'],
  [/noodle|ramen|pancit|\blomi\b|\bmami\b|\bmiki\b|chowking/i, 'noodles'],
  [/barbecue|\bbbq\b|inihaw|grill|sisig|lechon|liempo|hotdog/i, 'flame'],
  [/breakfast|silog|\beggs?\b|almusal/i, 'egg'],
  [/\bfish\b|seafood|tilapia|bangus|daing|sushi/i, 'fish'],
  [/\brice\b|kanin|lugaw|arroz/i, 'rice'],
  [/fruit|mango|banana|\bbuko\b/i, 'apple'],
  [/pocari|gatorade|softdrink|soft drink|\bsoda\b|\bcoke\b|juice|\bwater\b(?! bill)|\bdrinks?\b/i, 'drink'],

  // ---- things bought
  [/\bshoes?\b|sneakers?|slippers?|sandals?|\bnike\b|adidas|pegasus/i, 'shoe'],
  [/t-?shirts?|\bshirts?\b|\bshorts\b|pants|jeans|\bdress\b|hoodie|jacket|clothes|\bsocks\b/i, 'shirt'],
  // before jewelry, so a swimming ring isn't a ring
  [/swimming|\bpool\b|beach|resort/i, 'beach'],
  [/earrings?|necklace|bracelet|\brings?\b|jewel/i, 'gem'],
  [/\bbible\b/i, 'bible'],
  [/costume|halloween|party/i, 'party'],
  [/\bfan\b/i, 'fan'],
  [/refrigerator|\bref\b|fridge|aircon|washing machine|appliance/i, 'plug'],
  [/\bchairs?\b|\btable\b|\bbed\b|sofa|furniture|cabinet/i, 'sofa'],
  [/deodorant|body wash|shampoo|\bsoap\b|lotion|toothpaste|safeguard|skincare|perfume/i, 'beauty'],
  [/haircut|barber|salon/i, 'scissors'],
  [/medicine|\bmeds?\b|pharmacy|mercury drug|watsons|vitamins?|\bpills?\b/i, 'pill'],
  [/dentist|dental/i, 'tooth'],
  [/doctor|clinic|hospital|check-?up|\blab\b/i, 'health'],
  [/\bgifts?\b|\bpresents?\b|pasalubong/i, 'gift'],
  [/pouch|drawstring|\bbelts?\b/i, 'bag'],

  // ---- getting around
  [/\blpg\b|gasul|gas tank/i, 'flame'],
  [/gasoline|\bgas\b|\bfuel\b|petron|\bshell\b|caltex|seaoil|diesel|unioil/i, 'fuel'],
  [/headlight|\bcar\b|\bgrab\b(?!\s*food)|taxi|angkas|joyride|parking|\btoll\b|autosweep|easytrip/i, 'car'],
  [/burgman|motor|helmet|scooter/i, 'motor'],
  [/jeep/i, 'jeep'],
  [/\bbus\b|victory liner|\bp2p\b/i, 'bus'],
  [/\blrt\b|\bmrt\b|\btrain\b|\bpnr\b/i, 'train'],
  [/ferry|\bboat\b|\broro\b|starlite|\b2go\b|montenegro/i, 'boat'],

  // ---- home & bills
  [/mobile load|\bload\b|\bglobe\b|\bsmart\b|\btnt\b|\bdito\b|\bgomo\b/i, 'phone'],
  [/wi-?fi|internet|pldt|converge|fiber/i, 'wifi'],
  [/meralco|electric|kuryente/i, 'bolt'],
  [/water bill|maynilad|manila water|\btubig\b/i, 'water'],
  [/netflix|youtube|disney|\bhbo\b|\bviu\b|iwantv|\btv\b/i, 'tv'],
  [/spotify|apple music|\bmusic\b/i, 'music'],
  [/cloud|google one|storage/i, 'cloud'],
  [/\brent\b|\bupa\b|landlord/i, 'key'],

  // ---- money moving and people
  [/send money|\bsent to\b|padala|remittance/i, 'send'],
  [/\batm\b|withdraw/i, 'cash'],
  // before sponsorship, so the church's AC sponsorship isn't a child's
  [/church/i, 'church'],
  [/sponsorship|\bchild\b/i, 'baby'],
  [/mother|\bmama\b|\bnanay\b|\bmom\b|father|\bpapa\b|tatay|family/i, 'family'],
  [/\bhome\b|\bhouse\b/i, 'home'],
  [/shopee|lazada|tiktok shop|zalora|\border\b|parcel|delivery/i, 'box'],
  [/groceries|grocery|supermarket|hypermarket|\bmart\b|citimart|puregold|savemore|7-?eleven|alfamart|ministop/i, 'cart'],
  [/salary|payroll|sweldo/i, 'cash'],
]

/** The icon an entry's words point to, or null to use its category's. */
export function iconFromNote(note: string | null | undefined): string | null {
  if (!note) return null
  for (const [re, icon] of RULES) if (re.test(note)) return icon
  return null
}
