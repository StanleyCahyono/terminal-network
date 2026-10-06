# Terminal Network Operations

Operations console for the fuel terminal network: network overview, terminal and tank workspace, ship-to-shore transfers, blending, quality, scheduling, inventory and configuration.

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
| `data.js` | Terminal, tank, transfer and quality data |
| `schematic.js` | Terminal schematic renderer |
| `support.js` | Runtime |
| `assets/logo.png` | Logo |

## Live clock

The console runs on the real date and time (WIB, WITA and WIT per terminal). The fictional scenario in `data.js` starts from the moment you open the console, shifted by whole hours. From there `tick()` keeps the network running in real time, refreshing every 3 seconds:

- Transfers pump at their flow rates, tank levels rise and fall, and completion estimates count down.
- New activity is generated continuously in 5-minute steps:
  - vessels (made-up names) are nominated, berth and discharge;
  - trucks load inside the gantry loading windows;
  - airport depots run hydrant supply and pipeline receipts, and FAME arrives by road;
  - blend skids schedule and run new batches.
- Completed receipts and blends are sampled, lab results arrive a few hours later, and batches are released (or held if a test fails).
- Story alarms clear over time (the Biak swell, the Sambu meter), and vessel pump trips occasionally pause a discharge.
- Shifts, "Today", the scheduling horizon and chart time axes follow the real calendar.

Terminal names, tanks and the starting story are unchanged. A run plays out the same however often the page refreshes, and reopening within 24 hours continues the same run. The header shows **Live · simulated data**: values move in real time but are not plant telemetry.

## Connecting live data

All readings come from `data.js`. Replace its contents with values from the terminal data service (same shapes: terminals → tanks, transfers, samples, exceptions) when the sensor feed is available. Then drop the simulation in `tick()` and change the header label back.

Open the files through a web server (GitHub Pages, or `npx serve` locally). Opening them directly from disk blocks the module loading some browsers require.
