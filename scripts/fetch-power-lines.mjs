#!/usr/bin/env node

/**
 * Fetches power line data from the Overpass API for the Illinois region
 * where FTM Battery Mapper sites are located (lat 41.0-42.5, lng -90.0 to -87.5).
 *
 * Outputs a GeoJSON FeatureCollection to frontend/src/data/power-lines.json
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '..', 'frontend', 'src', 'data', 'power-lines.json');
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const BBOX = '41.0,-90.0,42.5,-87.5';

const QUERY = `
[out:json][timeout:60];
(
  way["power"="line"](${BBOX});
  way["power"="minor_line"](${BBOX});
  way["power"="cable"](${BBOX});
);
out body;
>;
out skel qt;
`.trim();

async function fetchOverpassData() {
  console.log('Querying Overpass API...');
  console.log(`Bounding box: ${BBOX}`);

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(QUERY)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass API returned ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  console.log(`Received ${data.elements.length} elements from Overpass API`);
  return data;
}

function convertToGeoJSON(overpassData, simplifyNth = 1) {
  const elements = overpassData.elements;

  // Build a lookup of node id -> [lon, lat]
  const nodeMap = new Map();
  for (const el of elements) {
    if (el.type === 'node') {
      nodeMap.set(el.id, [el.lon, el.lat]);
    }
  }

  // Convert ways to GeoJSON features
  const features = [];
  let totalCoords = 0;

  for (const el of elements) {
    if (el.type !== 'way' || !el.tags?.power) continue;

    // Resolve node references to coordinates
    let coords = [];
    for (const nodeId of el.nodes) {
      const coord = nodeMap.get(nodeId);
      if (coord) coords.push(coord);
    }

    if (coords.length < 2) continue;

    // Simplify by keeping every Nth point (always keep first and last)
    if (simplifyNth > 1) {
      const simplified = [coords[0]];
      for (let i = 1; i < coords.length - 1; i++) {
        if (i % simplifyNth === 0) simplified.push(coords[i]);
      }
      simplified.push(coords[coords.length - 1]);
      coords = simplified;
    }

    totalCoords += coords.length;

    features.push({
      type: 'Feature',
      properties: {
        id: el.id,
        power: el.tags.power,
        voltage: el.tags.voltage || null,
        operator: el.tags.operator || null,
        name: el.tags.name || null,
        cables: el.tags.cables || null,
      },
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
    });
  }

  return {
    geojson: {
      type: 'FeatureCollection',
      features,
    },
    totalCoords,
  };
}

async function main() {
  const overpassData = await fetchOverpassData();

  // First attempt without simplification
  let simplifyNth = 1;
  let { geojson, totalCoords } = convertToGeoJSON(overpassData, simplifyNth);
  let jsonStr = JSON.stringify(geojson);

  // If too large, progressively simplify
  while (jsonStr.length > MAX_FILE_SIZE_BYTES && simplifyNth < 20) {
    simplifyNth++;
    console.log(`File size ${(jsonStr.length / 1024 / 1024).toFixed(2)} MB exceeds 5 MB limit. Simplifying with every ${simplifyNth}th point...`);
    ({ geojson, totalCoords } = convertToGeoJSON(overpassData, simplifyNth));
    jsonStr = JSON.stringify(geojson);
  }

  // Ensure output directory exists
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, jsonStr, 'utf-8');

  // Log stats
  const fileSizeKB = (jsonStr.length / 1024).toFixed(1);
  const fileSizeMB = (jsonStr.length / 1024 / 1024).toFixed(2);
  const lineCount = geojson.features.length;

  const byType = {};
  for (const f of geojson.features) {
    const t = f.properties.power;
    byType[t] = (byType[t] || 0) + 1;
  }

  console.log('\n--- Power Lines Fetch Stats ---');
  console.log(`Total power line features: ${lineCount}`);
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  power=${type}: ${count}`);
  }
  console.log(`Total coordinate points: ${totalCoords}`);
  if (simplifyNth > 1) {
    console.log(`Simplification: kept every ${simplifyNth}th point`);
  }
  console.log(`Output file: ${OUTPUT_PATH}`);
  console.log(`File size: ${fileSizeKB} KB (${fileSizeMB} MB)`);
  console.log('Done!');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
