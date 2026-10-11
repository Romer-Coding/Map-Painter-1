"""
Preset Data Audit — dumps, for each of MP1's four historical presets
(1911 / 1914 / 1936 / 1939), exactly what the real client-side engine
(game.js's maybeApplyEraOverrides()) computes: which country ends up
owning every province, and which provinces were never touched by any
reassignment and are keeping their modern-day owner by default.

This is a read-only diagnostic script — it does not modify any game data.
Re-implements the override precedence in game.js exactly:
  1. baseline seed overrides (Somaliland split + resolved disputed
     territories) from defaultGameState()
  2. countryReassignments (whole-country swaps), keyed off the baseline
     effective owner
  3. regionReassignments (ADM1-region-level carve-outs, by world_regions.json
     numeric id), applied last and winning over step 2 for the shapes they cover

Run from the Map Painter 1 project root:
    python Scripts/preset_audit.py
"""
import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Map Painter 1/
GEO_DIR = os.path.join(BASE_DIR, 'Geo')
PRESETS_DIR = os.path.join(BASE_DIR, 'presets')
OUT_DIR = os.path.join(BASE_DIR, 'Scripts', 'preset_audit_output')

ERAS = ['1911', '1914', '1936', '1939']

# ---- Baseline seed overrides, copied from game.js's defaultGameState() ----
SOMALILAND_DISTRICT_SHAPE_IDS = [
    '84685775B58560427797094', '84685775B41100750476456', '84685775B40091123389404',
    '84685775B17570807087791', '84685775B71114106442910', '84685775B16729211759375',
    '84685775B4618356108906', '84685775B1722628585645', '84685775B49158080079573',
    '84685775B26651098111953', '84685775B82555432245075', '84685775B34990175799989',
    '84685775B49212368266991', '84685775B5876262576033', '84685775B17415415044999',
    '84685775B65673290719307', '84685775B13490583966346', '84685775B18508481977999',
]
DISPUTED_TERRITORY_OVERRIDES_BY_SHAPEID = {
    'DIS002': 'CHN', 'DIS005': 'SVN', 'DIS006': 'BTN', 'DIS007': 'GBR', 'DIS009': 'IND',
    'DIS010': 'BRA', 'DIS011': 'IND', 'DIS013': 'KOR', 'DIS015': 'CHN', 'DIS016': 'EGY',
    'DIS017': 'JPN', 'DIS020': 'MAR',
}


def build_baseline_overrides():
    overrides = {}
    for sid in SOMALILAND_DISTRICT_SHAPE_IDS:
        overrides[sid] = 'SOML'
    overrides.update(DISPUTED_TERRITORY_OVERRIDES_BY_SHAPEID)
    return overrides


def load_geometries():
    with open(os.path.join(GEO_DIR, 'custom_geo.json'), encoding='utf-8') as f:
        cg = json.load(f)
    geoms = cg['objects']['geoBoundariesCGAZ_ADM2']['geometries']
    # Exclude geoBoundaries' own null/degenerate duplicate shapes (same
    # shapeID+name pattern, {type: null}) — these never render and were a
    # source of false positives in earlier manual audits this session.
    real = [g for g in geoms if g.get('type') is not None]
    return real


def load_world_regions():
    with open(os.path.join(GEO_DIR, 'world_regions.json'), encoding='utf-8') as f:
        return json.load(f)


def load_country_lookup():
    with open(os.path.join(GEO_DIR, 'country_lookup.json'), encoding='utf-8') as f:
        return json.load(f)


def region_entry_by_id(region_index, region_id):
    for name, entry in region_index.items():
        if isinstance(entry, dict) and str(entry.get('id')) == str(region_id):
            return name, entry
    return None, None


def compute_era(era, geoms, world_regions, country_lookup, baseline):
    with open(os.path.join(PRESETS_DIR, 'era_' + era + '.json'), encoding='utf-8') as f:
        data = json.load(f)

    entities = data.get('entities', {})
    country_reassign = data.get('countryReassignments', {})
    region_reassign = data.get('regionReassignments', {})

    # Step 1: baseline + country-level reassignment
    effective = {}
    for g in geoms:
        sid = g['properties']['shapeID']
        grp = g['properties']['shapeGroup']
        base_eff = baseline.get(sid, grp)
        effective[sid] = country_reassign.get(base_eff, base_eff)

    # Step 2: region-level reassignment (wins over step 1), with the same
    # numeric-id-only lookup game.js uses (post region-ID migration).
    region_warnings = []
    for country_code, wanted in region_reassign.items():
        region_index = world_regions.get(country_code, {})
        if not region_index:
            region_warnings.append('no ADM1 region index for ' + country_code)
            continue
        for region_id, target in wanted.items():
            name, entry = region_entry_by_id(region_index, region_id)
            if not entry:
                region_warnings.append('region ID ' + str(region_id) + ' not found in ' + country_code)
                continue
            for sid in entry.get('shapeIDs', []):
                effective[sid] = target

    # Group by final effective owner
    by_country = {}
    name_by_shape = {g['properties']['shapeID']: g['properties']['shapeName'] for g in geoms}
    group_by_shape = {g['properties']['shapeID']: g['properties']['shapeGroup'] for g in geoms}
    for sid, code in effective.items():
        by_country.setdefault(code, []).append(sid)

    def display_name(code):
        if code in entities and entities[code].get('name'):
            return entities[code]['name']
        return country_lookup.get(code, code)

    countries_out = {}
    for code, sids in by_country.items():
        origin_counts = {}
        for sid in sids:
            og = group_by_shape[sid]
            origin_counts[og] = origin_counts.get(og, 0) + 1
        countries_out[code] = {
            'displayName': display_name(code),
            'isEraEntity': code in entities,
            'totalProvinces': len(sids),
            'originBreakdown': dict(sorted(origin_counts.items(), key=lambda kv: -kv[1])),
            'provinces': sorted(
                [{'shapeID': sid, 'shapeName': name_by_shape[sid], 'originalCountry': group_by_shape[sid]} for sid in sids],
                key=lambda p: (p['originalCountry'], p['shapeName'])
            ),
        }

    # "Kept fully modern" origin countries: shapeGroups that never appear as
    # a countryReassignments key AND are never touched by any
    # regionReassignments entry for that same country — i.e. every one of
    # their provinces defaults straight through to their own modern code.
    all_origin_groups = sorted(set(group_by_shape.values()))
    reassigned_origin_groups = set(country_reassign.keys())
    region_carved_origin_groups = set(region_reassign.keys())
    fully_modern_defaults = [
        c for c in all_origin_groups
        if c not in reassigned_origin_groups and c not in region_carved_origin_groups and not c.isdigit()
    ]
    partially_carved_but_mostly_modern = [
        c for c in all_origin_groups
        if c in region_carved_origin_groups and c not in reassigned_origin_groups
    ]

    return {
        'era': era,
        'startDate': {'1911': '1911-01-01', '1914': '1914-07-28', '1936': '1936-03-07', '1939': '1939-09-01'}[era],
        'entities': entities,
        'countryCount': len(countries_out),
        'countries': countries_out,
        'fullyModernDefaultCountries': fully_modern_defaults,
        'partiallyCarvedButMostlyModernCountries': partially_carved_but_mostly_modern,
        'regionReassignmentWarnings': region_warnings,
    }


def write_text_summary(all_eras_data, out_path):
    lines = []
    lines.append('=' * 100)
    lines.append('MAP PAINTER 1 — HISTORICAL PRESET DATA AUDIT')
    lines.append('Read-only dump of what game.js\'s maybeApplyEraOverrides() actually computes for each preset.')
    lines.append('=' * 100)
    for era_data in all_eras_data:
        lines.append('')
        lines.append('#' * 100)
        lines.append('ERA {0}  (start date {1})'.format(era_data['era'], era_data['startDate']))
        lines.append('#' * 100)

        if era_data['regionReassignmentWarnings']:
            lines.append('')
            lines.append('!! REGION-REASSIGNMENT WARNINGS (would also print via console.warn in the real game):')
            for w in era_data['regionReassignmentWarnings']:
                lines.append('   - ' + w)

        lines.append('')
        lines.append('-- Countries active this era, by total province count --')
        sorted_countries = sorted(era_data['countries'].items(), key=lambda kv: -kv[1]['totalProvinces'])
        for code, info in sorted_countries:
            tag = ' [NEW ERA ENTITY]' if info['isEraEntity'] else ''
            lines.append('  {0:6s} {1:40s} {2:6d} provinces{3}'.format(code, info['displayName'][:40], info['totalProvinces'], tag))
            origin_str = ', '.join('{0}:{1}'.format(og, n) for og, n in info['originBreakdown'].items())
            lines.append('           composed from: ' + origin_str)

        lines.append('')
        lines.append('-- Origin countries whose ENTIRE modern territory keeps its own code this era')
        lines.append('   (never a countryReassignments key, never touched by any regionReassignments carve) --')
        fm = era_data['fullyModernDefaultCountries']
        for i in range(0, len(fm), 12):
            lines.append('   ' + ', '.join(fm[i:i + 12]))

        if era_data['partiallyCarvedButMostlyModernCountries']:
            lines.append('')
            lines.append('-- Origin countries that keep their modern code EXCEPT for specific listed ADM1 carve-outs --')
            lines.append('   ' + ', '.join(era_data['partiallyCarvedButMostlyModernCountries']))
            lines.append('   (see the per-era JSON dump for exactly which regions were carved out of each)')

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    geoms = load_geometries()
    world_regions = load_world_regions()
    country_lookup = load_country_lookup()
    baseline = build_baseline_overrides()

    all_eras_data = []
    for era in ERAS:
        print('Computing era', era, '...')
        era_data = compute_era(era, geoms, world_regions, country_lookup, baseline)
        all_eras_data.append(era_data)
        json_path = os.path.join(OUT_DIR, 'preset_audit_{0}.json'.format(era))
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(era_data, f, ensure_ascii=False, indent=1)
        print('  wrote', json_path, '({0} countries, {1} provinces total)'.format(
            era_data['countryCount'], sum(c['totalProvinces'] for c in era_data['countries'].values())))

    summary_path = os.path.join(OUT_DIR, 'preset_audit_summary.txt')
    write_text_summary(all_eras_data, summary_path)
    print('wrote', summary_path)


if __name__ == '__main__':
    main()
