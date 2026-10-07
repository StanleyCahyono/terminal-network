# Terminal Network Operations

Operations console for the fuel terminal network and the lubricant superhub: network overview, terminal and tank workspace, ship-to-shore transfers, blending, quality, scheduling, inventory and configuration.

## Publish with GitHub Pages

1. Create a new repository on GitHub (for example `terminal-network`).
2. Upload **all files in this folder** to the repository root, keeping `assets/` as a folder.
3. In the repository go to **Settings → Pages**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, then **Save**.
4. After about a minute the console is live at `https://<your-username>.github.io/terminal-network/`.

`index.html` forwards to `Terminal Network.dc.html`, the entry screen.

## Files

| File | Purpose |
| --- | --- |
| `Terminal Network.dc.html` | Shell: navigation, top bar, alarm centre, roles |
| `Network.dc.html` | Network overview and terminal registry |
| `Terminal Workspace.dc.html` | Terminal schematic, tank table and inspector |
| `Transfers.dc.html` | Ship-to-shore and other transfers |
| `Blending.dc.html` | Blend planner, monitor and release |
| `Quality.dc.html` | Samples, results and traceability |
| `Inventory.dc.html` | Inventory reconciliation |
| `Scheduling.dc.html` | Scheduling board and conflicts |
| `Configuration.dc.html` | Terminal capabilities and tank register |
| `Superhub.dc.html` | Workspace of the lubricant superhub (site plan, plant tabs, detail drawer) |
| `superhub-ui.js` | Views of the superhub workspace |
| `superhub.js` | Lubricant superhub: product catalogue, plant layout and live simulation |
| `app/` | Mobile app (installable): `index.html`, `app.css`, `shell.js` (navigation), `screens.js`, `hub.js`, `kit.js`, `sw.js` (offline cache), `manifest.webmanifest`, icons |
| `data.js` | Terminal, tank, transfer and quality data |
| `login.html`, `auth.js`, `accounts.js` | Sign-in page for the console, sign-in and session logic, and the accounts (salted password hashes) |
| `tools/password.html` | Makes an `accounts.js` line for a new person or a new password |
| `schematic.js` | Terminal schematic renderer |
| `support.js` | Runtime |
| `assets/logo.png` | Logo |

## Live clock

The console runs on the real date and time (WIB, WITA and WIT per terminal). The fictional scenario in `data.js` starts from the moment you open the console, shifted by whole hours. From there `tick()` keeps the network running in real time, refreshing every 3 seconds:

- Transfers pump at their flow rates, tank levels rise and fall, and completion estimates count down.
- New activity is generated continuously in 5-minute steps:
  - vessels (made-up names) are nominated, berth and discharge, with up to two more ships waiting at every berth;
  - every gantry bay loads trucks, round the clock;
  - airport depots run hydrant supply and pipeline receipts, and FAME and HEFA arrive by road;
  - every terminal's blend skid schedules and runs new batches.
- Completed receipts and blends are sampled, lab results arrive a few hours later, and batches are released (or held if a test fails).
- Story alarms clear over time (the swell at FT Biak, the meter at FT Pulau Sambu). Vessel pump trips occasionally pause a discharge, and loading arm faults take a gantry bay out of service for a while.
- Shifts, "Today", the scheduling horizon and chart time axes follow the real calendar.

The starting story is unchanged.

## Terminal names

Sites carry Pertamina Patra Niaga's formal unit names: Integrated Terminal (IT), Fuel Terminal (FT) and Aviation Fuel Terminal (AFT). Screens with room show the full name and tight spots the short form. Internal ids (PLM, CGK and so on) are unchanged, so saved views and links keep working.

| Id | Name | Short form | Formerly |
|---|---|---|---|
| PLM | Integrated Terminal Jakarta (Plumpang) | IT Jakarta | TBBM Plumpang |
| SBY | Integrated Terminal Surabaya (Tanjung Perak) | IT Surabaya | TBBM Surabaya |
| UPG | Integrated Terminal Makassar | IT Makassar | TBBM Ujung Pandang |
| BIK | Fuel Terminal Biak | FT Biak | TBBM Biak |
| BOY | Fuel Terminal Boyolali | FT Boyolali | TBBM Boyolali |
| SMB | Fuel Terminal Pulau Sambu | FT Pulau Sambu | TBBM Strategis Pulau Sambu |
| PLJ | Integrated Terminal Palembang | IT Palembang | TBBM Plaju |
| PNJ | Integrated Terminal Panjang | IT Panjang | TBBM Lampung - Panjang |
| JUA | Aviation Fuel Terminal Juanda | AFT Juanda | AFT Juanda |
| CGK | Aviation Fuel Terminal Soekarno-Hatta | AFT Soekarno-Hatta | AFT soetta CGK |
| DPS | Aviation Fuel Terminal Ngurah Rai | AFT Ngurah Rai | AFT Ngurah Rai DPS |
| KNO | Aviation Fuel Terminal Kualanamu | AFT Kualanamu | AFT Kualanamu KNO |
| BLG | Integrated Terminal Balongan | IT Balongan | TBBM Strategis (Jet A-1) Avtur Balongan |
| VPK | Vopak Terminal Jakarta (PT Jakarta Tank Terminal) | Vopak Jakarta | unchanged |
| MLB | Lubricant Superhub Maiza Lubrika | Maiza Lubrika | Terminal Lubricant Superhub Maiza Lubrika |

Cross-dock pallets at the superhub come from Pertamina Lubricants' Production Units Jakarta, Cilacap and Gresik.

## Blending at every terminal

Every terminal has a blend skid. Terminals that had no blend components got component tanks, appended so that existing tanks keep their numbers and values:

- **Diesel B40 (B0 + FAME):** a FAME tank at IT Makassar, FT Pulau Sambu, IT Panjang and Vopak Jakarta; B0 and FAME tanks at FT Biak and FT Boyolali.
- **Jet A-1 (5.3% bio):** made at the airport depots from Jet A-1 (2% bio) topped up with HEFA, 96.6% / 3.4%. AFT Juanda, AFT Soekarno-Hatta, AFT Ngurah Rai and AFT Kualanamu got a HEFA tank, and AFT Juanda and AFT Kualanamu also got a Jet A-1 (5.3%) tank.
- **RON 95:** IT Jakarta, IT Surabaya and Vopak Jakarta can also make RON 95 from RON 92 and RON 98, 50 / 50.

## All ongoing transfers

**Transfers → All terminals** lists every running, paused and scheduled transfer across the network on one live board. It shows progress, quantities, flow, finish or start time and state. You can filter it by state or type and sort it by terminal, finish time, progress or flow. Click a row to open that transfer, or that blend on the Blending screen. A run plays out the same however often the page refreshes, and reopening within 24 hours continues the same run. The header shows **Live** and the time of the last update. Values move in real time but are simulated, not plant telemetry.

## Mobile app

`app/` is a phone app for the same live network, designed for one-handed use rather than squeezed from the console. How to open it:

- **On a phone:** open the site address (`https://<your-username>.github.io/terminal-network/`) or the console's own address; phones are sent to the app automatically. Add `?console` to either address to get the full console instead.
- **On a computer:** press **Phone view** in the console's top bar, or open `…/terminal-network/app/`. The app opens in a phone-sized frame, with a link back to the desktop console.
- **Install:** on Android use the install prompt; on iPhone use Share → Add to Home Screen (More → Add to Home Screen shows the steps).

- **Overview**: alarm status, live transfers, ships, truck loading, stock by product, a terminal carousel, the superhub's output against plan, and live activity.
- **Terminals**: every site with its stock, tanks (level, high-level mark, receiving or dispatching), live and next transfers, berths, blends, samples and equipment. Each tank has a 24-hour level chart you can scrub with a finger.
- **Transfers**: live, scheduled and finished transfers by type and terminal, each with progress, flow, finish time and route.
- **Alarms**: open and resolved alarms by severity. Acknowledge and resolve them according to your role. A banner slides in when a new alarm is raised.
- **More**: quality samples with results and release or hold, blending batches with their recipe, the superhub (areas, ships, tanks, blenders, lines, trucks, trains and ISO tanks), settings (light, dark or match the phone; motion; alarm banners) and your role.

It behaves like a native app: each tab keeps its own history, screens slide in and out, the phone's back button and an edge swipe go back, sheets drag down to close, and lists refresh with a pull. Add it to the home screen (Share → Add to Home Screen on iPhone, Install on Android) and it opens full screen and works offline.

## Sign-in

Everyone signs in before they see the console or the app. One sign-in covers both on the same browser. Without "Keep me signed in" a session lasts 12 hours (one shift); with it, 30 days. After five wrong passwords in a row, sign-in pauses for 30 seconds. **Sign out** is in the console's user menu (top right) and in the app under More → your name.

Each account has one role, and the role decides what that person can do:

| Role | Can |
|---|---|
| Shift supervisor | acknowledge and resolve alarms, operate transfers |
| Terminal operator | acknowledge alarms, operate transfers |
| Quality officer | acknowledge alarms, release or hold batches |
| Configuration admin | edit terminal configuration in the console |
| Viewer | view only |

Starting accounts: `r.hakim` (shift supervisor), `a.nugroho` (operator), `s.wulandari` (quality officer), `t.prasetyo` (configuration admin) and `headoffice` (viewer). Their passwords were handed over separately and are not in this repository.

**Add a person or change a password.** Open `tools/password.html` on the site (for example `https://<your-username>.github.io/terminal-network/tools/password.html`), fill in the name, username, role and password, and copy the line it makes into `accounts.js` on GitHub (replace the person's old line to change a password; delete a line to remove someone). Commit, and the change is live in about a minute. `accounts.js` keeps only a random salt and a PBKDF2-SHA-256 hash (600,000 rounds) per person, never the password.

**What this protects, and what it does not.** The site is static files on GitHub Pages with no server, so the password check runs in the browser. It keeps people out of the screens, but anyone technical can still read the files directly, and while the repository is public its code is visible on GitHub. The data here is simulated, so that is fine for a demonstration. Before connecting real operational data, put the site behind real access control, for example:

- **Cloudflare Access** (free for small teams): serve the site on your own domain through Cloudflare and allow only listed email addresses; Cloudflare checks every request before any file is sent.
- **A private host with sign-in**, such as Netlify or Vercel password protection, or an internal web server behind the company's single sign-on.
- Make the repository **private** so the code and the accounts file are not public (GitHub Pages from a private repository needs a paid GitHub plan, and the published site is still public unless you use GitHub Enterprise).

## Lubricant superhub

**Lubricant Superhub Maiza Lubrika** (Kendal, Jawa Tengah) is a simulated lubricant plant. Choose it in the terminal selector, or on the Network map, to open its own workspace instead of the tank schematic. Blending and Quality also open the superhub tabs for this terminal.

**Plant.** 2.0 Mt per year nameplate, planned at full capacity (5,479 t a day). It makes 84 products in 169 grades and 13 families, from engine oils to turbine, hydraulic and gear oils and greases. Everything is blended in house. The site is also a base-oil hub: about 6,000 t a day of base oil is re-exported by tanker, barge, ISO tank and road tanker, and about 3,000 t a day of packed lubricants from other plants passes through its cross-dock.

The site has:

- 9 jetties, for import, coastal and re-export tankers, an additive berth, barges and two container-feeder quays;
- base-oil, additive and finished-product tank farms with 153 tanks;
- 3 in-line blenders, 10 automated and 10 simple batch blenders, and a grease plant with contactors, kettles and hoppers;
- 18 packaging lines, 14 drum-filling lines and 2 IBC lines (34 in all), with blow moulding for bottles and cans;
- a high-bay warehouse and a drum store, 140 truck bays and a gate with a 220-truck park;
- 18 ISO-tank crane positions, 4 wash bays and a 250-slot ISO yard with heating points; every ISO tank is an IMO T11 portable tank coded SJIU with a random serial and its ISO 6346 check digit;
- 4 rail cranes on three tracks and seven trains a day (three Jakarta and three Surabaya liners and a base-oil ISO shuttle), a container yard and a container-stuffing hall;
- a QC laboratory with 24 test streams.

**Simulation.** Input and output run around the clock in 5-minute steps:

- ships, trains, ISO tanks and road tankers bring in base oils and additives (Group I also comes by road tanker from the refinery);
- receipts are sampled and released;
- blends start when stock runs low, pass in-process and release tests, and fill dedicated tanks or swing tanks;
- filling lines run work orders by warehouse cover, with changeovers, breaks, jams and faults;
- product and re-exported base oil leave by road, rail, feeder, coastal tanker and barge, seven days a week.

Weather, grid outages and equipment faults raise alarms in the alarm centre. The run is deterministic: the plant is in the same state however often the page refreshes.

**Workspace.** The tabs are Site plan, Marine, Tank farms, Blending, Filling, Warehouse & gate, ISO & rail, Quality lab, Products and Events. Press any box on the site plan to open its details: a tank, blender, kettle, hopper, filling line, stacker crane, truck bay, ISO crane, ISO tank or yard slot, wash bay, rail track or crane, jetty or ship. Press a zone for a summary of that area, or any tile, row or equipment chip in the tabs. These include tank level history, batch steps and recipe, line OEE and work orders, lab results, truck and ISO-tank status, and product stock and cover.

Recipes, additive treat rates and test results are assumptions made for the simulation. They are not product disclosures or plant data.

## Connecting live data

All readings come from `data.js`. Replace its contents with values from the terminal data service (same shapes: terminals → tanks, transfers, samples, exceptions) when the sensor feed is available. Then drop the simulation in `tick()`.

Open the files through a web server (GitHub Pages, or `npx serve` locally). Opening them directly from disk blocks the module loading some browsers require.
