"use strict";
// PC system requirements for the 206 games that had an empty minimum and/or
// recommended block. Supplied by hand.
//
// Only the empty side is written: a game that already had a minimum keeps it
// and receives a recommended block, and vice versa.
//
// Usage: node tools/hand-game-specs.js [--dry] [--list]

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");
const LIST = process.argv.includes("--list");

const F = path.join(ROOT, "details", "games.json");

// [folder, minimum | null, recommended | null]
const DATA = [
  ["Alan Wake -", null, { cpu: "Intel Core i5-7600K / AMD Ryzen 5 1600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["Alice Madness Returns", null, { cpu: "Intel Core 2 Quad 2.4 GHz / AMD Phenom II X4 3.0 GHz", gpu: "NVIDIA GeForce GTX 560 أو ATI Radeon HD 6950", ram: "4 جيجابايت" }],
  ["Aliens vs Predator", null, { cpu: "Intel Core 2 Duo E6750 / AMD Athlon 64 X2 6000+", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4870", ram: "2 جيجابايت" }],
  ["Another Crab's Treasure", null, { cpu: "Intel Core i5-8400 / AMD Ryzen 5 2600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["ARK - Survival Evolved", null, { cpu: "Intel Core i5-4670K / AMD Ryzen 5 1500X", gpu: "NVIDIA GeForce GTX 970 أو AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["Astral Chain", { cpu: "Intel Core i5-6600 (محاكي Switch)", gpu: "NVIDIA GeForce GTX 1060", ram: "8 جيجابايت" }, null],
  ["Batman - Arkham City", null, { cpu: "Intel Core i5-750 أو AMD Phenom II X4 965", gpu: "NVIDIA GeForce GTX 570 أو ATI Radeon HD 6950", ram: "4 جيجابايت" }],
  ["Batman - The Enemy Within", null, { cpu: "Intel Core i5-4690 / AMD FX-8350", gpu: "NVIDIA GeForce GTX 970 أو AMD Radeon R9 290", ram: "8 جيجابايت" }],
  ["Batman - The Telltale Series", null, { cpu: "Intel Core i5-750 / AMD FX-8320", gpu: "NVIDIA GeForce GTX 660 أو AMD Radeon HD 7850", ram: "4 جيجابايت" }],
  ["Battlefield 1942", null, { cpu: "Pentium 4 1.5 GHz", gpu: "كارت يدعم Direct3D بذاكرة 64 ميجابايت", ram: "512 ميجابايت" }],
  ["BEAM NG", null, { cpu: "Intel Core i7-6700 / AMD Ryzen 7 1700", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["BlazBlue - Cross Tag Battle", null, { cpu: "Intel Core i5-3470 3.20 GHz", gpu: "NVIDIA GeForce GTX 660", ram: "8 جيجابايت" }],
  ["Borderlands - GotY Enhanced", null, { cpu: "Intel Core i5-3570 / AMD FX-8350", gpu: "NVIDIA GeForce GTX 770 أو AMD Radeon RX 470", ram: "6 جيجابايت" }],
  ["Bloodborne", { cpu: "Intel Core i5-10400 / AMD Ryzen 5 3600 مع كارت GTX 1060 أو RX 580 (محاكي shadPS4)", ram: "16 جيجابايت" }, null],
  ["Call of Duty - MW2CR", null, { cpu: "Intel Core i5-2500K / AMD Ryzen 5 1600X", gpu: "NVIDIA GeForce GTX 970 أو AMD Radeon RX 580", ram: "12 جيجابايت" }],
  ["Call of Duty - World at War", null, { cpu: "Intel Core 2 Duo أو AMD Athlon 64 X2", gpu: "NVIDIA GeForce 8600GT أو ATI Radeon HD 2600XT", ram: "2 جيجابايت" }],
  ["Call Of Duty 2", null, { cpu: "Intel Pentium 4 2.2 GHz", gpu: "NVIDIA GeForce 6600 أو ATI Radeon X700", ram: "512 ميجابايت" }],
  ["Call of Duty Black Ops 3", null, { cpu: "Intel Core i5-2400 / AMD FX-8320", gpu: "NVIDIA GeForce GTX 780 أو AMD Radeon R9 290", ram: "8 جيجابايت" }],
  ["Call Of Duty Black Ops II", null, { cpu: "Intel Core i5-2400 / AMD FX-8320", gpu: "NVIDIA GeForce GTX 780 أو AMD Radeon R9 290", ram: "8 جيجابايت" }],
  ["call of duty black obs1", null, { cpu: "Intel Core i5-2400 / AMD FX-8320", gpu: "NVIDIA GeForce GTX 780 أو AMD Radeon R9 290", ram: "8 جيجابايت" }],
  ["call of duty modern warfare 2 2022", null, { cpu: "Intel Core i5-2500K / AMD Ryzen 5 1600X", gpu: "NVIDIA GeForce GTX 970 أو AMD Radeon RX 580", ram: "12 جيجابايت" }],
  ["call of duty modern warfare 2019", null, { cpu: "Intel Core i5-2500K / AMD Ryzen 5 1600X", gpu: "NVIDIA GeForce GTX 970 أو AMD Radeon RX 580", ram: "12 جيجابايت" }],
  ["Call Of Juarez - Bound In Blood", null, { cpu: "Intel Core 2 Duo 2.6 GHz أو AMD Athlon 64 X2 5200+", gpu: "NVIDIA GeForce 9800 GTX أو ATI Radeon HD 4850", ram: "2 جيجابايت" }],
  ["Call to Arms - GoH - Ostfront", null, { cpu: "معالج رباعي النواة 3.5 GHz", gpu: "NVIDIA GeForce GTX 970 أو AMD Radeon RX 480", ram: "8 جيجابايت" }],
  ["Castlevania - Lords of Shadow UE", null, { cpu: "معالج رباعي النواة 2.5 GHz", gpu: "NVIDIA GeForce GTX 470", ram: "2 جيجابايت" }],
  ["Castlevania - LoS - Mirror of Fate HD", null, { cpu: "Intel Core i5", gpu: "NVIDIA GeForce GTX 560", ram: "4 جيجابايت" }],
  ["Celeste", null, { cpu: "Intel Core i5", gpu: "Intel HD 4000 أو أعلى، أو كارت منفصل بسيط", ram: "4 جيجابايت" }],
  ["Command & Conquer  - Red Alert 3", null, { cpu: "Intel Core 2 Duo 2.6 GHz أو AMD Athlon 64 X2 5200+", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 4850", ram: "2 جيجابايت" }],
  ["Command And Conquer 3 Kanes Wrath  7.6GB_1", null, { cpu: "Intel Core 2 Duo 2.2 GHz", gpu: "NVIDIA GeForce 6800 أو ATI Radeon X1800", ram: "2 جيجابايت" }],
  ["Crash Team Racing Nitro", { cpu: "Intel Core i5 (محاكي Switch)", gpu: "NVIDIA GeForce GTX 960", ram: "8 جيجابايت" }, null],
  ["Crash.Bandicoot.N.Sane.Trilogy-CODEX -", null, { cpu: "Intel Core i5-2300 / AMD FX-8350", gpu: "NVIDIA GeForce GTX 960 أو AMD Radeon RX 480", ram: "8 جيجابايت" }],
  ["Dark Souls - Prepare to Die Edition", null, { cpu: "Intel Core i5 2.6 GHz أو AMD Phenom II X4 3.2 GHz", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4870", ram: "4 جيجابايت" }],
  ["DCG - Aladdin & The Lion King", null, { cpu: "Intel Core i3 أو AMD Ryzen 3", gpu: "NVIDIA GeForce GTX 660", ram: "4 جيجابايت" }],
  ["Dead Space 1", { cpu: "Intel Pentium 4 2.8 GHz أو AMD Athlon 64 3500+", gpu: "NVIDIA GeForce 6800 أو ATI Radeon X1600 Pro", ram: "1 جيجابايت" }, null],
  ["Dead Space 2", null, { cpu: "Intel Core i5 أو AMD Phenom II X4", gpu: "NVIDIA GeForce GTX 560 أو ATI Radeon HD 6950", ram: "3 جيجابايت" }],
  ["Dead Space 3", null, { cpu: "Intel Core i5 أو AMD Phenom II X4", gpu: "NVIDIA GeForce GTX 560 أو ATI Radeon HD 6950", ram: "4 جيجابايت" }],
  ["Dead Space Remake", { cpu: "Intel Core i5-8600 / AMD Ryzen 5 2600", gpu: "NVIDIA GeForce GTX 1070 أو AMD Radeon RX 5700", ram: "16 جيجابايت" }, { cpu: "Intel Core i5-11600K / AMD Ryzen 5 5600X", gpu: "NVIDIA GeForce RTX 2070 أو AMD Radeon RX 6700 XT", ram: "16 جيجابايت" }],
  ["Deadpool", null, { cpu: "Intel Core 2 Quad Q9400 2.66 GHz أو AMD Phenom II X4 940", gpu: "NVIDIA GeForce GTX 450 أو ATI Radeon HD 5770", ram: "2 جيجابايت" }],
  ["Demon Slayer", null, { cpu: "Intel Core i5-3470 / AMD Ryzen 3 1200", gpu: "NVIDIA GeForce GTX 970 أو AMD Radeon RX 570", ram: "8 جيجابايت" }],
  ["Demon's Souls", { cpu: "Intel Core i5-4670 / AMD Ryzen 5 1500X مع كارت GTX 970 (محاكي RPCS3)", ram: "8 جيجابايت" }, null],
  ["Dragonball Xenoverse", null, { cpu: "Intel Core i3-530 2.93 GHz أو AMD Phenom II X4 810", gpu: "NVIDIA GeForce GTX 560", ram: "4 جيجابايت" }],
  ["Earthfall.Invasion", null, { cpu: "Intel Core i5-6600K / AMD Ryzen 5 1600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "8 جيجابايت" }],
  ["Enslaved - Odyssey to the West", null, { cpu: "معالج رباعي النواة 2.66 GHz", gpu: "NVIDIA GeForce GTX 560", ram: "4 جيجابايت" }],
  ["Erica", null, { cpu: "Intel Core i5-4570 / AMD Ryzen 5 1400", gpu: "NVIDIA GeForce GTX 970 أو AMD Radeon RX 470", ram: "4 جيجابايت" }],
  ["F.E.A.R. Platinum Collection", null, { cpu: "Pentium 4 3.0 GHz", gpu: "NVIDIA GeForce 6600 أو ATI Radeon X700", ram: "1 جيجابايت" }],
  ["F1 22 Champions Edition", null, { cpu: "Intel Core i5-9600K / AMD Ryzen 5 2600X", gpu: "NVIDIA GeForce GTX 1660 Ti أو AMD Radeon RX 590", ram: "16 جيجابايت" }],
  ["Fallout.new.vegas.ultimate.edition.GOG", null, { cpu: "Intel Core i5 أو AMD Phenom II X4", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4850", ram: "4 جيجابايت" }],
  ["Fast & Furious Showdown", null, { cpu: "Intel Core i3 أو AMD FX-6300", gpu: "NVIDIA GeForce GTX 660 أو AMD Radeon HD 7850", ram: "4 جيجابايت" }],
  ["Fast and Furious - Crossroads", null, { cpu: "Intel Core i3 أو AMD FX-6300", gpu: "NVIDIA GeForce GTX 660 أو AMD Radeon HD 7850", ram: "8 جيجابايت" }],
  ["Fifa 2013", null, { cpu: "Intel Core 2 Quad 2.4 GHz", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 4850", ram: "2 جيجابايت" }],
  ["Firewatch", null, { cpu: "Intel Core i5 3.0 GHz", gpu: "NVIDIA GeForce GTX 570", ram: "8 جيجابايت" }],
  ["FNAF-Help-Wanted", null, { cpu: "Intel Core i7-6700K أو AMD Ryzen 5 3600", gpu: "NVIDIA GeForce GTX 1070 أو AMD Radeon RX 5700 XT", ram: "16 جيجابايت" }],
  ["FNAF-Security-Breach", null, { cpu: "Intel Core i7-6700K أو AMD Ryzen 5 3600", gpu: "NVIDIA GeForce GTX 1070 أو AMD Radeon RX 5700 XT", ram: "16 جيجابايت" }],
  ["FNAF.Help.Wanted.2", null, { cpu: "Intel Core i7-6700K أو AMD Ryzen 5 3600", gpu: "NVIDIA GeForce GTX 1070 أو AMD Radeon RX 5700 XT", ram: "16 جيجابايت" }],
  ["Football Manager 2023", null, { cpu: "Intel Core 2 Duo أو AMD Athlon 64 X2", gpu: "Intel GMA X4500 أو NVIDIA GeForce 9600M GT", ram: "4-8 جيجابايت", directx: "DirectX 11" }],
  ["Game Of Thrones", null, { cpu: "معالج رباعي النواة 2.8 GHz", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4870", ram: "3 جيجابايت" }],
  ["Generals-Zero Hour - Last Stand", { cpu: "Pentium 4 1.8 GHz", gpu: "كارت يدعم DirectX 8.1 بذاكرة 64 ميجابايت", ram: "512 ميجابايت" }, null],
  ["Ghost Of Recon", null, { cpu: "Intel Core i7-3770 أو AMD Ryzen 5 1600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 480", ram: "8 جيجابايت" }],
  ["God of War - Ghost of Sparta", { cpu: "معالج ثنائي النواة يدعم OpenGL 2.0 (محاكي PPSSPP)", ram: "2 جيجابايت" }, null],
  ["Grand Theft Auto IV Complete Edition", null, { cpu: "Intel Core 2 Quad 2.4 GHz أو AMD Phenom X3 2.1 GHz", gpu: "NVIDIA GeForce 8600 GT أو ATI Radeon HD 3870", ram: "2 جيجابايت" }],
  ["GTA - The Original Trilogy", null, { cpu: "Pentium III 800 MHz", gpu: "كارت يدعم Direct3D بذاكرة 32 ميجابايت", ram: "256 ميجابايت" }],
  ["GTA Trilogy - DE-BSE", null, { cpu: "Pentium III 800 MHz", gpu: "كارت يدعم Direct3D بذاكرة 32 ميجابايت", ram: "256 ميجابايت" }],
  ["gta vice city", null, { cpu: "Intel Core 2 Quad 2.4 GHz أو AMD Phenom X3 2.1 GHz", gpu: "NVIDIA GeForce 8600 GT أو ATI Radeon HD 3870", ram: "2 جيجابايت" }],
  ["GTA VICE CITY NEXT GEN", { cpu: "Intel Core i3-6100 / AMD FX-4350", gpu: "NVIDIA GeForce GTX 960 أو AMD Radeon R9 280", ram: "8 جيجابايت" }, null],
  ["Guilty Gear Xrd Sign", null, { cpu: "Intel Core i5 2.8 GHz", gpu: "NVIDIA GeForce GTX 770", ram: "4 جيجابايت" }],
  ["Half-Life - Source Quadrilogy", null, { cpu: "Pentium 4 2.4 GHz", gpu: "كارت بذاكرة 128 ميجابايت", ram: "512 ميجابايت" }],
  ["Harry Potter And The Deathly Hallows Part 1", null, { cpu: "Intel Core 2 Duo 2.4 GHz", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 3850", ram: "2 جيجابايت" }],
  ["Harry Potter And The Deathly Hallows Part 2", null, { cpu: "Intel Core 2 Duo 2.4 GHz", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 3850", ram: "2 جيجابايت" }],
  ["Harry Potter And The Half Blood Prince", null, { cpu: "Intel Core 2 Duo 2.4 GHz", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 3850", ram: "2 جيجابايت" }],
  ["Hellblade", null, { cpu: "Intel Core i7-4770K أو AMD Ryzen 5 1600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 480", ram: "8 جيجابايت" }],
  ["HITMAN 2", null, { cpu: "Intel Core i7-4770 أو AMD Ryzen 5 1600X", gpu: "NVIDIA GeForce GTX 1070 أو AMD Radeon RX Vega 56", ram: "8 جيجابايت" }],
  ["Horizon - Zero Dawn CE", null, { cpu: "Intel Core i7-4770K أو AMD Ryzen 5 1500X", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["I Am Alive", null, { cpu: "Intel Core 2 Quad 2.4 GHz", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4870", ram: "4 جيجابايت" }],
  ["IGI", null, { cpu: "Pentium III 1.0 GHz", gpu: "كارت سريعات سريعة بذاكرة 64 ميجابايت", ram: "256 ميجابايت" }],
  ["IGI2", null, { cpu: "Pentium III 1.0 GHz", gpu: "كارت سريعات سريعة بذاكرة 64 ميجابايت", ram: "256 ميجابايت" }],
  ["Injustice 2 Legendary Edition", null, { cpu: "Intel Core i3-2100 3.10 GHz أو AMD FX-6300", gpu: "NVIDIA GeForce GTX 780 أو AMD Radeon R9 290", ram: "8 جيجابايت" }],
  ["Inversion", null, { cpu: "Intel Core 2 Quad 2.6 GHz أو AMD Phenom II X4 3.0 GHz", gpu: "NVIDIA GeForce GTX 460 أو ATI Radeon HD 6850", ram: "3 جيجابايت" }],
  ["James Bond 007 Legends", null, { cpu: "Intel Core 2 Quad 2.6 GHz أو AMD Phenom II X4 3.0 GHz", gpu: "NVIDIA GeForce GTX 560 أو ATI Radeon HD 6950", ram: "4 جيجابايت" }],
  ["Journey to the Savage Planet", null, { cpu: "Intel Core i5-750 / AMD FX-6300", gpu: "NVIDIA GeForce GTX 970 أو AMD Radeon RX 480", ram: "8 جيجابايت" }],
  ["Kane & Lynch 2 Dog Days", null, { cpu: "Intel Core 2 Duo 2.6 GHz أو AMD Athlon 64 X2 3800+", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 3850", ram: "2 جيجابايت" }],
  ["Kingdom Hearts 3 and Re-Mind", null, { cpu: "Intel Core i5-7500 / AMD Ryzen 3 3100", gpu: "NVIDIA GeForce GTX 1070 أو AMD Radeon RX Vega 56", ram: "8 جيجابايت" }],
  ["Kunitsu", null, { cpu: "Intel Core i7-8700 / AMD Ryzen 5 3600", gpu: "NVIDIA GeForce GTX 1070 أو AMD Radeon RX 5700 XT", ram: "16 جيجابايت" }],
  ["LA Noire -", null, { cpu: "معالج رباعي النواة 3.2 GHz", gpu: "NVIDIA GeForce GTX 580 أو ATI Radeon HD 6850", ram: "8 جيجابايت" }],
  ["Lantern", null, { cpu: "Intel Core i5", gpu: "NVIDIA GeForce GTX 770", ram: "8 جيجابايت" }],
  ["Legacy of Kain Defiance", null, { cpu: "Pentium 4 1.5 GHz", gpu: "كارت بذاكرة 64 ميجابايت", ram: "256 ميجابايت" }],
  ["Life is Strange - BtS Remastered", null, { cpu: "Intel Core i5-3470 / AMD FX-8350", gpu: "NVIDIA GeForce GTX 970 أو AMD Radeon R9 285", ram: "8 جيجابايت" }],
  ["LIMBO", null, { cpu: "Intel Core 2 Duo", gpu: "كارت رسومات مخصص", ram: "1 جيجابايت" }],
  ["Manhunt", null, { cpu: "Pentium 4 2.0 GHz", gpu: "كارت يدعم DirectX 9 بذاكرة 64 ميجابايت", ram: "512 ميجابايت" }],
  ["Manhunt 2", null, { cpu: "Pentium 4 2.0 GHz", gpu: "كارت يدعم DirectX 9 بذاكرة 64 ميجابايت", ram: "512 ميجابايت" }],
  ["Mario vs. Donkey Kong", { cpu: "Intel Core i5 (محاكي Switch)", gpu: "NVIDIA GeForce GTX 1060", ram: "8 جيجابايت" }, null],
  ["Marvel - Ultimate Alliance Bundle 2016  7.39GB_1", null, { cpu: "Intel Core i3 أو AMD FX-6300", gpu: "NVIDIA GeForce GTX 560", ram: "4 جيجابايت" }],
  ["Marvels Avengers Full unlocked  87GB_3", null, { cpu: "Intel Core i7-8700K أو AMD Ryzen 5 3600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 590", ram: "16 جيجابايت" }],
  ["Maseylia - Echoes of the Past", null, { cpu: "Intel Core i7", gpu: "NVIDIA GeForce GTX 1060", ram: "16 جيجابايت" }],
  ["Max Payne 3", null, { cpu: "معالج رباعي النواة 3 GHz أو AMD FX-8150", gpu: "NVIDIA GeForce GTX 680 أو AMD Radeon HD 7970", ram: "16 جيجابايت" }],
  ["MAXPYNE 2", null, { cpu: "Intel Core i5-4570 أو AMD Ryzen 3 3200", gpu: "NVIDIA GeForce GTX 960 أو AMD Radeon RX 580", ram: "8 جيجابايت" }],
  ["Medal of Honor", null, { cpu: "Intel Core 2 Duo 3.0 GHz", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4870", ram: "2 جيجابايت" }],
  ["Men of War - Assault Squad 2", null, { cpu: "معالج رباعي النواة 3.0 GHz", gpu: "NVIDIA GeForce GTX 560 أو ATI Radeon HD 6950", ram: "4 جيجابايت" }],
  ["MGS MASTER COLLECTION Vol.1 BONUS CONTENT", null, { cpu: "Intel Core i7-8700 / AMD Ryzen 5 3600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["MGS Peace Walker", null, { cpu: "Intel Core i7-8700 / AMD Ryzen 5 3600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["MGS2 Sons of Liberty Master Collection Version", null, { cpu: "Intel Core i7-8700 / AMD Ryzen 5 3600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["MGS3 Snake Eater Master Collection Version", null, { cpu: "Intel Core i7-8700 / AMD Ryzen 5 3600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["Middle-earth - Shadow of War DE", null, { cpu: "Intel Core i7-6700K / AMD Ryzen 5 1600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["Mirror's Edge", null, { cpu: "Intel Core 2 Duo 3.0 GHz", gpu: "NVIDIA GeForce 9800 GTX أو ATI Radeon HD 4850", ram: "2 جيجابايت" }],
  ["Mortal Shell II", null, { cpu: "Intel Core i7-6700 / AMD Ryzen 5 3600", gpu: "NVIDIA GeForce GTX 1070 أو AMD Radeon RX Vega 56", ram: "16 جيجابايت" }],
  ["Naruto Shippuden - Ultimate Ninja Storm 3", null, { cpu: "Intel Core i3-530 أو AMD Phenom II X4 940", gpu: "NVIDIA GeForce GTX 560 أو ATI Radeon HD 6950", ram: "4 جيجابايت" }],
  ["NARUTO X BORUTO - UNSC", null, { cpu: "Intel Core i3-530 أو AMD Phenom II X4 940", gpu: "NVIDIA GeForce GTX 560 أو ATI Radeon HD 6950", ram: "4 جيجابايت" }],
  ["Need for Spee  3.3gbd  ProStreet", null, { cpu: "Intel Core 2 Duo 2.6 GHz", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 3870", ram: "2 جيجابايت" }],
  ["Need for Speed Undercover Remastered", null, { cpu: "Intel Core 2 Duo 2.6 GHz", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 3870", ram: "2 جيجابايت" }],
  ["Need for Speed Underground – Definitive Edition", null, { cpu: "Intel Core 2 Duo 2.6 GHz", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 3870", ram: "2 جيجابايت" }],
  ["Neighbours from Hell - Revenge Is a Sweet Game", null, { cpu: "Pentium III 500 MHz", gpu: "كارت بذاكرة 16 ميجابايت", ram: "128 ميجابايت" }],
  ["Neighbours from Hell 2 - On Vacation", null, { cpu: "Pentium III 500 MHz", gpu: "كارت بذاكرة 16 ميجابايت", ram: "128 ميجابايت" }],
  ["NFS Hot Pursuit Remastered", null, { cpu: "Intel Core 2 Duo 2.6 GHz", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 3870", ram: "2 جيجابايت" }],
  ["NFS Most Wanted Unofficial Remake", null, { cpu: "Intel Core 2 Duo 2.6 GHz", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 3870", ram: "4 جيجابايت" }],
  ["NieR Replicant", null, { cpu: "Intel Core i5-6400 أو AMD Ryzen 3 1300X", gpu: "NVIDIA GeForce GTX 1660 أو AMD Radeon RX 590", ram: "16 جيجابايت" }],
  ["Nikoderiko - The Magical World DC", null, { cpu: "Intel Core i5-8400", gpu: "NVIDIA GeForce GTX 1060", ram: "16 جيجابايت" }],
  ["Olympic Games Tokyo 2020", null, { cpu: "Intel Core i5-4460 / AMD Ryzen 5 1600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "8 جيجابايت" }],
  ["Origament - A Paper Adventure", null, { cpu: "Intel Core i5-8400 / AMD Ryzen 5 2600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "8 جيجابايت" }],
  ["Planet_Coaster_Alpha", null, { cpu: "Intel Core i7-4770 / AMD FX-8350", gpu: "NVIDIA GeForce GTX 980 أو AMD Radeon R9 390", ram: "12 جيجابايت" }],
  ["Prince of Persia - The Forgotten Sands", null, { cpu: "Intel Core 2 Duo 2.2 GHz أو AMD Athlon 64 X2 4400+", gpu: "NVIDIA GeForce 9800 GTX أو ATI Radeon HD 4850", ram: "2 جيجابايت" }],
  ["Prince of Persia Trilogy", null, { cpu: "Intel Core 2 Duo 2.2 GHz أو AMD Athlon 64 X2 4400+", gpu: "NVIDIA GeForce 9800 GTX أو ATI Radeon HD 4850", ram: "2 جيجابايت" }],
  ["Prototype1 5.06 GB_1", null, { cpu: "Intel Core 2 Quad 2.7 GHz أو AMD Phenom II X4 3 GHz", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4870", ram: "2 جيجابايت" }],
  ["ptototype2", null, { cpu: "Intel Core 2 Quad 2.7 GHz أو AMD Phenom II X4 3 GHz", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4870", ram: "4 جيجابايت" }],
  ["Rabbids - Party of Legends [HV]", null, { cpu: "Intel Core i5-8400 / AMD Ryzen 5 2600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["Rage Anarchy Edition", null, { cpu: "معالج رباعي النواة", gpu: "NVIDIA GeForce GTX 570 أو ATI Radeon HD 5550", ram: "4 جيجابايت" }],
  ["Red Alert 2", null, { cpu: "Pentium II 450 MHz", gpu: "كارت بذاكرة 4 ميجابايت", ram: "128 ميجابايت" }],
  ["REPLACED", null, { cpu: "Intel Core i7-8700K أو AMD Ryzen 5 3600", gpu: "NVIDIA GeForce RTX 2060 أو AMD Radeon RX 5700 XT", ram: "16 جيجابايت" }],
  ["ResidentEvil4UltimateHD", null, { cpu: "Intel Core 2 Quad 2.7 GHz أو AMD Phenom II X4 3.0 GHz", gpu: "NVIDIA GeForce GTX 560 أو ATI Radeon HD 6950", ram: "4 جيجابايت" }],
  ["Ridge Racer Unbounded", null, { cpu: "Intel Core 2 Quad 2.6 GHz أو AMD Phenom II X4 3.0 GHz", gpu: "NVIDIA GeForce GTX 460 أو ATI Radeon HD 6850", ram: "4 جيجابايت" }],
  ["rock of age 3", null, { cpu: "Intel Core i5-7500 / AMD Ryzen 5 1600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "8 جيجابايت" }],
  ["Shank 1 [2010]", null, { cpu: "Intel Pentium 4 3.0 GHz", gpu: "NVIDIA GeForce 7900 أو ATI Radeon HD 2600", ram: "1.5 جيجابايت" }],
  ["Shank 2 [2012]", null, { cpu: "Intel Pentium 4 3.0 GHz", gpu: "NVIDIA GeForce 7900 أو ATI Radeon HD 2600", ram: "1.5 جيجابايت" }],
  ["Silent Hill Downpour PC", { cpu: "Intel Core i5 حديث مع كارت GTX 970 (محاكي)", ram: "8 جيجابايت" }, null],
  ["SILENT.HILL.3", null, { cpu: "Pentium 4 1.5 GHz", gpu: "كارت بذاكرة 64 ميجابايت", ram: "512 ميجابايت" }],
  ["Silent.Hill.4.New.Edition", null, { cpu: "Pentium 4 1.5 GHz", gpu: "كارت بذاكرة 64 ميجابايت", ram: "512 ميجابايت" }],
  ["Sim Digital Combat World", null, { cpu: "Intel Core i5 3.5 GHz", gpu: "NVIDIA GeForce GTX 1070 أو AMD Radeon RX Vega 56", ram: "16 جيجابايت" }],
  ["Sniper Elite 2  2.87GB_1", null, { cpu: "Intel Core i7-2600 أو AMD FX-8350", gpu: "NVIDIA GeForce GTX 760 أو AMD Radeon HD 7870", ram: "6 جيجابايت" }],
  ["Sniper Elite 3", null, { cpu: "Intel Core i7-2600 أو AMD FX-8350", gpu: "NVIDIA GeForce GTX 760 أو AMD Radeon HD 7870", ram: "6 جيجابايت" }],
  ["snow runner", null, { cpu: "Intel Core i7-8700 / AMD Ryzen 7 2700", gpu: "NVIDIA GeForce GTX 970 أو AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["Sonic Forces", null, { cpu: "Intel Core i5-6600 أو AMD Ryzen 5 1600", gpu: "NVIDIA GeForce GTX 1060 أو AMD Radeon RX 580", ram: "8 جيجابايت" }],
  ["Sonic Heroes", null, { cpu: "Intel Core i5-5500 أو AMD Phenom II X4", gpu: "NVIDIA GeForce GTX 750 أو AMD Radeon HD 7790", ram: "4 جيجابايت" }],
  ["Sonic Unleashed", null, { cpu: "Intel Core i5-5500 أو AMD Phenom II X4", gpu: "NVIDIA GeForce GTX 750 أو AMD Radeon HD 7790", ram: "4 جيجابايت" }],
  ["Spider-Man Web of Shadows", null, { cpu: "Intel Core 2 Quad 2.4 GHz", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4870", ram: "2 جيجابايت" }],
  ["Splinter Cell Blacklist", null, { cpu: "Intel Core 2 Quad 2.4 GHz أو AMD Athlon X4", gpu: "NVIDIA GeForce GTX 570 أو AMD Radeon HD 6950", ram: "2 جيجابايت" }],
  ["Splinter Cell Conviction", null, { cpu: "Intel Core 2 Quad 2.4 GHz أو AMD Athlon X4", gpu: "NVIDIA GeForce GTX 570 أو AMD Radeon HD 6950", ram: "4 جيجابايت" }],
  ["Split Second", null, { cpu: "Intel Core 2 Duo 2.6 GHz أو AMD Athlon 64 X2 5200+", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4870", ram: "2.5 جيجابايت" }],
  ["StarCraft 2 - The Trilogy", null, { cpu: "Intel Core 2 Duo 2.4 GHz أو AMD Athlon 64 X2 5600+", gpu: "NVIDIA GeForce 9800 GTX أو ATI Radeon HD 4850", ram: "4 جيجابايت" }],
  ["Stardew.Valley", null, { cpu: "Intel Core i3", gpu: "كارت رسومات مخصص بذاكرة 256 ميجابايت", ram: "4 جيجابايت" }],
  ["Stranger of Paradise - FFO", null, { cpu: "Intel Core i7-8700 أو AMD Ryzen 5 3600", gpu: "NVIDIA GeForce GTX 1660 Super أو AMD Radeon RX 5700 XT", ram: "16 جيجابايت" }],
  ["Stranglehold", null, { cpu: "Intel Core 2 Duo 2.6 GHz", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 2900 XT", ram: "2 جيجابايت" }],
  ["Styx - Master of Darkness", null, { cpu: "معالج رباعي النواة 3.0 GHz", gpu: "NVIDIA GeForce GTX 760 أو ATI Radeon HD 7870", ram: "4 جيجابايت" }],
  ["Super Mario 3D World + Bowser's Fury", null, { cpu: "Intel Core i5-8400 (محاكي Cemu)", gpu: "NVIDIA GeForce GTX 1060", ram: "16 جيجابايت" }],
  ["TABS", null, { cpu: "Intel Core i5-7500 أو AMD Ryzen 5 1600", gpu: "NVIDIA GeForce GTX 970 أو AMD Radeon RX 480", ram: "8 جيجابايت" }],
  ["TDPA - The Devil in Me", null, { cpu: "Intel Core i5-8400 أو AMD Ryzen 5 1600X", gpu: "NVIDIA GeForce RTX 2060 أو AMD Radeon RX 5700 XT", ram: "8 جيجابايت" }],
  ["The Amazing Spid  er Man 1", null, { cpu: "Intel Core 2 Quad 2.4 GHz أو AMD Phenom II X4 3.0 GHz", gpu: "NVIDIA GeForce GTX 285 أو ATI Radeon HD 4870", ram: "4 جيجابايت" }],
  ["The Crew unlimited", null, { cpu: "Intel Core i5-750 أو AMD FX-4100", gpu: "NVIDIA GeForce GTX 580 أو AMD Radeon HD 6870", ram: "8 جيجابايت" }],
  ["The Elder Tracker".replace("The Elder Tracker", "The Elder Scrolls oblivian REMAKE  108GB_1"), null, { cpu: "Intel Core i5-2300 أو AMD FX-8320", gpu: "NVIDIA GeForce GTX 760 أو AMD Radeon R9 280", ram: "8 جيجابايت" }],
  ["The Elder Scrolls V - Skyrim - Legendary Edition", null, { cpu: "معالج رباعي النواة", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4850", ram: "4 جيجابايت" }],
  ["The Exit", null, { cpu: "Intel Core i7-6700", gpu: "NVIDIA GeForce GTX 1060", ram: "8 جيجابايت" }],
  ["The Godfather II", null, { cpu: "Intel Core 2 Duo 2.2 GHz أو AMD Athlon 64 X2 4400+", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 3850", ram: "2 جيجابايت" }],
  ["The Incredibles [2004]   840MB_2", null, { cpu: "Pentium 4 1.5 GHz", gpu: "كارت بذاكرة 64 ميجابايت", ram: "512 ميجابايت" }],
  ["The Last Of US Part 2", { cpu: "Intel Core i3-8100 أو AMD Ryzen 3 3100 مع كارت GTX 970 أو RX 470", ram: "16 جيجابايت" }, null],
  ["The Legend Of Korra", null, { cpu: "Intel Core 2 Quad 2.7 GHz أو AMD Phenom II X4 3.0 GHz", gpu: "NVIDIA GeForce GTX 560 أو ATI Radeon HD 6950", ram: "4 جيجابايت" }],
  ["The Legend of Zelda - Skyward Sword HD", { cpu: "Intel Core i5 (محاكي Cemu)", gpu: "NVIDIA GeForce GTX 750 Ti", ram: "8 جيجابايت" }, null],
  ["The Legend of Zelda Breath of Wild", { cpu: "Intel Core i5 (محاكي Cemu)", gpu: "NVIDIA GeForce GTX 750 Ti", ram: "8 جيجابايت" }, null],
  ["The Mortuary Assistant", null, { cpu: "Intel Core i7 أو AMD Ryzen 5", gpu: "NVIDIA GeForce GTX 1060", ram: "8 جيجابايت" }],
  ["The Outer Worlds - SCE", null, { cpu: "Intel Core i7-7700K أو AMD Ryzen 5 1600", gpu: "NVIDIA GeForce GTX 1060 6GB أو AMD Radeon RX 470", ram: "8 جيجابايت" }],
  ["The Technomancer", null, { cpu: "Intel Core i5-6600 / AMD FX-8350", gpu: "NVIDIA GeForce GTX 970 / AMD Radeon R9 390", ram: "8 جيجابايت" }],
  ["The Walking Dead - A New Frontier", null, { cpu: "Intel Core i5 أو AMD Phenom II X4", gpu: "NVIDIA GeForce GTX 460 أو ATI Radeon HD 6850", ram: "4 جيجابايت" }],
  ["The Walking Dead - Definitive Series  2019  16.4GB_1", null, { cpu: "Intel Core i5 أو AMD Phenom II X4", gpu: "NVIDIA GeForce GTX 460 أو ATI Radeon HD 6850", ram: "4 جيجابايت" }],
  ["The Walking Dead - Michonne", null, { cpu: "Intel Core i5 أو AMD Phenom II X4", gpu: "NVIDIA GeForce GTX 460 أو ATI Radeon HD 6850", ram: "4 جيجابايت" }],
  ["The Walking Dead - Season 2", { cpu: "Intel Core 2 Duo 2.0 GHz", gpu: "NVIDIA GeForce 8800 GT أو ATI Radeon HD 3850", ram: "3 جيجابايت" }, null],
  ["Thief", null, { cpu: "Intel Core i7-2600K أو AMD FX-8350", gpu: "NVIDIA GeForce GTX 660 أو AMD Radeon HD 7870", ram: "4 جيجابايت" }],
  ["TLotR War in the North", null, { cpu: "Intel Core 2 Quad 2.4 GHz أو AMD Phenom II X4 3.0 GHz", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4870", ram: "2 جيجابايت" }],
  ["TMNT - Shredder's Revenge", null, { cpu: "Intel Core i5", gpu: "NVIDIA GeForce GTX 660", ram: "4 جيجابايت" }],
  ["Tomb Raider Anniversary", null, { cpu: "Intel Core 2 Duo 2.2 GHz أو AMD Athlon 64 X2 4400+", gpu: "NVIDIA GeForce 7900 أو ATI Radeon X1800", ram: "2 جيجابايت" }],
  ["Tomb Raider Legend", null, { cpu: "Intel Core 2 Duo 2.2 GHz أو AMD Athlon 64 X2 4400+", gpu: "NVIDIA GeForce 7900 أو ATI Radeon X1800", ram: "1 جيجابايت" }],
  ["Tony Hawk's Pro Skater 1 plus 2", null, { cpu: "Intel Core i5-2500K / AMD Ryzen 5 1600X", gpu: "NVIDIA GeForce GTX 970 / AMD Radeon RX 570", ram: "16 جيجابايت" }],
  ["Toy Story 3", null, { cpu: "Intel Core 2 Quad 2.6 GHz", gpu: "NVIDIA GeForce GTX 260", ram: "4 جيجابايت" }],
  ["Transformers Rise Of The Dark Spark", null, { cpu: "Intel Core 2 Quad 2.6 GHz / AMD Phenom II X4 940", gpu: "NVIDIA GeForce GTX 460 / ATI Radeon HD 5770", ram: "4 جيجابايت" }],
  ["Ultimate Spiderman  1.71GB_1", null, { cpu: "Pentium 4 2.4 GHz", gpu: "NVIDIA GeForce 6600 / ATI Radeon X1300", ram: "512 ميجابايت" }],
  ["Uncharted - Golden Abyss", { cpu: "Intel Core i5 مع كارت GTX 750 Ti (محاكي Vita3K)", ram: "4 جيجابايت" }, null],
  ["Uncharted Trilogy", { cpu: "Intel Core i5-4670 / AMD Ryzen 5 1500X مع كارت GTX 970 (محاكي RPCS3)", ram: "8 جيجابايت" }, null],
  ["X-Men Origins Wolverine", null, { cpu: "Intel Core 2 Duo 3.0 GHz أو AMD Phenom II X3 720", gpu: "NVIDIA GeForce GTX 260 أو ATI Radeon HD 4870", ram: "2 جيجابايت" }],
  ["Yakuza 0", null, { cpu: "Intel Core i7-3770 / AMD FX-8350", gpu: "NVIDIA GeForce GTX 760 / AMD Radeon HD 7950", ram: "8 جيجابايت" }],
  ["Yakuza Like a Dragon - Infinite Wealth 30GB   {HV{", null, { cpu: "Intel Core i5-8400 / AMD Ryzen 5 2600", gpu: "NVIDIA GeForce GTX 1060 / AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["Yakuza Like a Dragon - Ishin [HV]", null, { cpu: "Intel Core i5-8400 / AMD Ryzen 5 2600", gpu: "NVIDIA GeForce GTX 1060 / AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["Yakuza Like a Dragon Gaiden  {HV]", null, { cpu: "Intel Core i5-8400 / AMD Ryzen 5 2600", gpu: "NVIDIA GeForce GTX 1060 / AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["Yakuza Lost Judgment {HV}", null, { cpu: "Intel Core i5-8400 / AMD Ryzen 5 2600", gpu: "NVIDIA GeForce GTX 1060 / AMD Radeon RX 580", ram: "16 جيجابايت" }],
  ["Zombie Army Trilogy", null, { cpu: "Intel Core i5-2400 أو AMD FX-8320", gpu: "NVIDIA GeForce GTX 760 أو AMD Radeon HD 7870", ram: "6 جيجابايت" }],
];

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data.json"), "utf8"));
const cat = data.categories.find((c) => c.id === "games");
const byTitle = new Map(cat.items.map((i) => [i.title, i]));

if (LIST) {
  for (const [t] of DATA) console.log(`${byTitle.has(t) ? "ok  " : "MISS"}  ${t}`);
  process.exit(0);
}

const parsed = JSON.parse(fs.readFileSync(F, "utf8"));
let min = 0;
let rec = 0;
const miss = [];

for (const [folder, minimum, recommended] of DATA) {
  const item = byTitle.get(folder);
  if (!item) { miss.push(folder); continue; }
  const r = parsed.items[item.id];
  if (!r) { miss.push(folder); continue; }
  if (!r.requirements || typeof r.requirements !== "object") r.requirements = {};
  const has = (v) => v && typeof v === "object" && Object.keys(v).length > 0;

  if (minimum && !has(r.requirements.minimum)) { r.requirements.minimum = minimum; min++; }
  if (recommended && !has(r.requirements.recommended)) { r.requirements.recommended = recommended; rec++; }
}

if (!DRY) fs.writeFileSync(F, JSON.stringify(parsed, null, 2) + "\n");
console.log(`\nحد أدنى: ${min} · موصى به: ${rec} · لم يُطبّق: ${miss.length} ${DRY ? "(dry run)" : ""}`);
for (const m of miss) console.log(`  no folder: ${m}`);
