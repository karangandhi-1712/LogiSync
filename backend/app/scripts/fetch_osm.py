import urllib.request
import urllib.parse
import json
import os

OVERPASS_URL = "https://lz4.overpass-api.de/api/interpreter"

BBOX = "8.750,78.110,8.780,78.150" # Thoothukudi SIPCOT approx

QUERY = f"""
[out:json][timeout:25];
(
  way["highway"~"^(primary|secondary|tertiary)$"]({BBOX});
  way["building"~"^(industrial|warehouse)$"]({BBOX});
  way["landuse"="industrial"]({BBOX});
);
out body;
>;
out skel qt;
"""

def fetch_osm_data():
    print("Fetching data from Overpass API...")
    url = OVERPASS_URL + "?" + urllib.parse.urlencode({'data': QUERY})
    req = urllib.request.Request(url, headers={'User-Agent': 'ThoothukudiMMLP-DigitalTwin/1.0'})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def build_geojson(osm_data):
    nodes = {el['id']: [el['lon'], el['lat']] for el in osm_data['elements'] if el['type'] == 'node'}
    
    roads = []
    warehouses = []
    yards = []
    gates = []

    for el in osm_data['elements']:
        if el['type'] == 'node' and el.get('tags', {}).get('barrier') == 'gate':
            gates.append({
                "type": "Feature",
                "properties": {"id": el['id'], "source": "OpenStreetMap", "type": "gate", "simulated_capacity": True},
                "geometry": {"type": "Point", "coordinates": [el['lon'], el['lat']]}
            })

        if el['type'] == 'way':
            if not all(nid in nodes for nid in el['nodes']):
                continue
            coords = [nodes[nid] for nid in el['nodes']]
            tags = el.get('tags', {})
            
            feature = {
                "type": "Feature",
                "properties": {"id": el['id'], "source": "OpenStreetMap", **tags},
                "geometry": {}
            }
            
            if 'highway' in tags:
                feature['geometry'] = {"type": "LineString", "coordinates": coords}
                roads.append(feature)
            elif 'building' in tags:
                # Close the polygon if needed
                if coords[0] != coords[-1]:
                    coords.append(coords[0])
                feature['geometry'] = {"type": "Polygon", "coordinates": [coords]}
                feature['properties']['simulated_capacity'] = True
                warehouses.append(feature)
            elif 'landuse' in tags:
                if coords[0] != coords[-1]:
                    coords.append(coords[0])
                feature['geometry'] = {"type": "Polygon", "coordinates": [coords]}
                feature['properties']['simulated_capacity'] = True
                yards.append(feature)

    return {
        "roads": {"type": "FeatureCollection", "features": roads},
        "warehouses": {"type": "FeatureCollection", "features": warehouses},
        "yards": {"type": "FeatureCollection", "features": yards},
        "gates": {"type": "FeatureCollection", "features": gates}
    }

def main():
    osm_data = fetch_osm_data()
    geojson_data = build_geojson(osm_data)
    
    os.makedirs('data/seed', exist_ok=True)
    
    for key, data in geojson_data.items():
        filename = f'data/seed/real_{key}.geojson'
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Saved {len(data['features'])} features to {filename}")

if __name__ == "__main__":
    main()
