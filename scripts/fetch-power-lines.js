const https = require('https');
const fs = require('fs');
const path = require('path');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OUTPUT_PATH = path.join(__dirname, '..', 'frontend', 'src', 'data', 'power-lines.json');

// Bounding box covering Illinois ComEd/Ameren service territory
const SOUTH = 40.5;
const WEST = -90.5;
const NORTH = 42.5;
const EAST = -87.0;

const query = `
[out:json][timeout:120];
(
  way["power"="line"](${SOUTH},${WEST},${NORTH},${EAST});
  way["power"="minor_line"](${SOUTH},${WEST},${NORTH},${EAST});
  way["power"="cable"](${SOUTH},${WEST},${NORTH},${EAST});
);
(._;>;);
out body;
`;

function fetchOverpass(queryStr) {
  return new Promise((resolve, reject) => {
    const postData = `data=${encodeURIComponent(queryStr)}`;

    const options = {
      hostname: 'overpass-api.de',
      path: '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Overpass API returned status ${res.statusCode}: ${data.slice(0, 500)}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    });

    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('Request timed out after 120 seconds'));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function convertToGeoJSON(overpassData) {
  const elements = overpassData.elements;

  // Build a lookup of node id -> {lat, lon}
  const nodes = {};
  for (const el of elements) {
    if (el.type === 'node') {
      nodes[el.id] = { lat: el.lat, lon: el.lon };
    }
  }

  // Convert ways to GeoJSON features
  const features = [];
  for (const el of elements) {
    if (el.type !== 'way') continue;
    if (!el.tags || !el.tags.power) continue;

    const coords = [];
    for (const nodeId of el.nodes) {
      const node = nodes[nodeId];
      if (node) {
        coords.push([node.lon, node.lat]);
      }
    }

    if (coords.length < 2) continue;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
      properties: {
        osm_id: el.id,
        voltage: el.tags.voltage || null,
        cables: el.tags.cables || null,
        operator: el.tags.operator || null,
        name: el.tags.name || null,
        power_type: el.tags.power,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

async function main() {
  console.log('Fetching power lines from Overpass API...');
  console.log(`Bounding box: S=${SOUTH}, W=${WEST}, N=${NORTH}, E=${EAST}`);
  console.log('');

  const data = await fetchOverpass(query);
  console.log(`Received ${data.elements.length} elements from Overpass API`);

  const geojson = convertToGeoJSON(data);
  console.log(`Converted to ${geojson.features.length} GeoJSON LineString features`);
  console.log('');

  // Print statistics
  const breakdown = {};
  for (const feature of geojson.features) {
    const pt = feature.properties.power_type;
    breakdown[pt] = (breakdown[pt] || 0) + 1;
  }

  console.log('=== Statistics ===');
  console.log(`Total power lines: ${geojson.features.length}`);
  console.log('Breakdown by power type:');
  for (const [type, count] of Object.entries(breakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  // Ensure output directory exists
  const outDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(geojson, null, 2));
  console.log(`\nSaved to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
