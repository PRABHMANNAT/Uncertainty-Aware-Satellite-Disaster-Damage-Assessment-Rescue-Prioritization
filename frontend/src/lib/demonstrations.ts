export type MapView = "before" | "after" | "swipe" | "damage" | "street";
export interface Demonstration {
  id: string;
  title: string;
  location: string;
  hazard: string;
  eventDate: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  zoom: number;
  before: string;
  after: string;
  damage?: string;
  beforeLabel: string;
  afterLabel: string;
  source: string;
  sourceUrl: string;
  notes: string;
  purpose: string;
  kind: "local" | "microsoft" | "historical";
  pairId?: string;
  areas?: {
    id: string;
    label: string;
    before: string;
    after: string;
    bounds: [[number, number], [number, number]];
  }[];
}

const TILES = "https://geospatialvisualizer.z13.web.core.windows.net/tiles/";
export const DEMONSTRATIONS: Demonstration[] = [
  {
    id: "mexico-earthquake",
    title: "Mexico earthquake",
    location: "Mexico City, Mexico",
    hazard: "Earthquake",
    eventDate: "2017",
    center: [19.293, -99.216],
    bounds: [
      [19.286, -99.222],
      [19.3, -99.21],
    ],
    zoom: 16,
    before: "mexico-earthquake_00000076_pre_disaster.png",
    after: "mexico-earthquake_00000076_post_disaster.png",
    beforeLabel: "Pre-event xBD scene",
    afterLabel: "Post-event xBD scene",
    source: "xBD / Maxar Open Data",
    sourceUrl: "https://xview2.org/",
    kind: "local",
    pairId: "mexico-earthquake_00000076",
    purpose:
      "Run the complete damage-analysis workflow, inspect priority zones, and export a field report.",
    notes:
      "The shipped xBD tile does not provide verified capture dates in this interface. Local analysis uses image-change heuristics unless a trained model is configured. xBD imagery: CC BY-NC-SA 4.0; non-commercial use.",
  },
  {
    id: "maui-wildfire",
    title: "Maui wildfires",
    location: "Lahaina, Hawaii",
    hazard: "Wildfire",
    eventDate: "August 2023",
    center: [20.882689, -156.676798],
    bounds: [
      [20.82929, -156.70669],
      [20.91021, -156.55809],
    ],
    zoom: 16,
    before: TILES + "skysat_maui_9_15_2022_rgb_tiles/{z}/{x}/{y}.png",
    after: TILES + "skysat_maui_8_10_2023_rgb_tiles/{z}/{x}/{y}.png",
    damage: TILES + "skysat_maui_8_10_2023_damage_rgb_tiles/{z}/{x}/{y}.png",
    beforeLabel: "15 September 2022",
    afterLabel: "9–10 August 2023 · source dates differ",
    source: "Planet SkySat / Microsoft AI for Good",
    sourceUrl: "https://aka.ms/lahaina_damage",
    kind: "microsoft",
    purpose:
      "Compare the Lahaina urban area and inspect Microsoft's published building-damage overlay.",
    notes:
      "The official viewer caption says 9 August; its tile path says 10 August. Both are retained here as a source discrepancy. The overlay is Microsoft's published assessment, not a new DisasterIQ inference. Imagery is streamed from the original host; no redistribution or commercial-use permission is implied.",
  },
  {
    id: "derna-flood",
    title: "Derna flooding",
    location: "Derna, Libya",
    hazard: "Flood",
    eventDate: "September 2023",
    center: [32.7613917, 22.6410359],
    bounds: [
      [32.69071, 22.60158],
      [32.84983, 22.6777],
    ],
    zoom: 16,
    before: TILES + "derna_libya_pre_rgb_tiles/{z}/{x}/{y}.png",
    after: TILES + "derna_libya_post_rgb_tiles/{z}/{x}/{y}.png",
    damage:
      TILES +
      "libya_derna_change_2_2_predictions_clipped_rgb_tiles/{z}/{x}/{y}.png",
    beforeLabel: "2 September 2023",
    afterLabel: "12–13 September 2023",
    source: "Planet SkySat / Microsoft AI for Good",
    sourceUrl: "https://aka.ms/libya_derna_flooding_2023",
    kind: "microsoft",
    purpose:
      "Inspect the flood corridor, compare dated imagery, and review the published damage layer.",
    notes:
      "The overlay is Microsoft's source-produced change assessment. It is not a verified count of damaged buildings. Imagery is streamed from the original host; no redistribution or commercial-use permission is implied.",
  },
  {
    id: "beryl-hurricane",
    title: "Hurricane Beryl",
    location: "Carriacou, Grenada",
    hazard: "Hurricane",
    eventDate: "July 2024",
    center: [12.47702, -61.45105],
    bounds: [
      [12.36944, -61.51693],
      [12.58461, -61.38517],
    ],
    zoom: 15,
    before:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    after: TILES + "hurricane_beryl_2024_tiles/{z}/{x}/{y}.png?1",
    damage: TILES + "hurricane_beryl_2024_prediction_tiles/{z}/{x}/{y}.png?1",
    beforeLabel: "Esri reference · capture date unspecified",
    afterLabel: "2 & 5 July 2024",
    source: "Planet SkySat / Microsoft AI for Good; Esri reference",
    sourceUrl: "https://aka.ms/grenada_hurricane_beryl_07_02_2024",
    kind: "microsoft",
    purpose:
      "Explore the post-hurricane imagery and Microsoft's published assessment across Carriacou.",
    notes:
      "The left side is an undated Esri reference basemap, exactly as used by the original viewer. It is not a verified pre-hurricane acquisition. The damage overlay is a published Microsoft assessment. Imagery is streamed; provider terms apply.",
  },
  {
    id: "israel-gaza-2023",
    title: "Israel & Gaza · historical comparison",
    location: "Gaza City / Southern Israel",
    hazard: "Historical context",
    eventDate: "7 October 2023 reference date",
    center: [31.52, 34.445],
    bounds: [
      [31.48, 34.405],
      [31.56, 34.485],
    ],
    zoom: 13,
    before: "/historical/gaza-city-before.jpg",
    after: "/historical/gaza-city-after.jpg",
    beforeLabel: "27 September 2023",
    afterLabel: "1 November 2023",
    source: "Copernicus Sentinel-2 L2A / Element 84 Earth Search",
    sourceUrl: "https://registry.opendata.aws/sentinel-2-l2a-cogs/",
    kind: "historical",
    purpose:
      "Compare dated regional observations from before the Hamas-led attacks on Israel on 7 October 2023 and during the subsequent war. Select Gaza City or southern Israel.",
    notes:
      "10 m pixels cannot reliably identify individual damaged buildings. Clouds, shadows, seasonality and illumination affect appearance. This comparison does not establish responsibility, causes, casualties, structural safety or comprehensive damage. These are historical snapshots, not live operational imagery. Contains modified Copernicus Sentinel data (2023), cropped and resampled without synthetic alterations.",
    areas: [
      {
        id: "gaza-city",
        label: "Gaza City",
        before: "/historical/gaza-city-before.jpg",
        after: "/historical/gaza-city-after.jpg",
        bounds: [
          [31.48, 34.405],
          [31.56, 34.485],
        ],
      },
      {
        id: "southern-israel",
        label: "Southern Israel · Sderot area",
        before: "/historical/southern-israel-before.jpg",
        after: "/historical/southern-israel-after.jpg",
        bounds: [
          [31.485, 34.55],
          [31.565, 34.63],
        ],
      },
    ],
  },
];
