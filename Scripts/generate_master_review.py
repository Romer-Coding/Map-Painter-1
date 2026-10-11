"""
Builds Scripts/preset_review_master.txt from the preset_audit_output/*.json
dumps (run preset_audit.py first / after any preset data changes to refresh
those). One TAG block per active country per era, in the exact format
requested for manual historical-accuracy review.
"""
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AUDIT_DIR = os.path.join(BASE_DIR, 'preset_audit_output')
OUT_PATH = os.path.join(BASE_DIR, 'preset_review_master.txt')
ERAS = ['1911', '1914', '1936', '1939']


def main():
    lines = []
    for era in ERAS:
        with open(os.path.join(AUDIT_DIR, 'preset_audit_{0}.json'.format(era)), encoding='utf-8') as f:
            data = json.load(f)

        lines.append('=' * 50)
        lines.append('ERA: {0}  (start date {1})'.format(era, data['startDate']))
        lines.append('=' * 50)
        lines.append('')

        sorted_countries = sorted(data['countries'].items(), key=lambda kv: -kv[1]['totalProvinces'])
        for code, info in sorted_countries:
            origin_str = ', '.join('{0}:{1}'.format(og, n) for og, n in info['originBreakdown'].items())
            modern_fallback = 'No' if info['isEraEntity'] else 'Yes'
            owned_states = [p['shapeID'] for p in info['provinces']]
            assert len(owned_states) == info['totalProvinces'], \
                '{0}/{1}: owned_states count {2} != Province Count {3}'.format(
                    era, code, len(owned_states), info['totalProvinces'])
            lines.append('TAG: {0}'.format(code))
            lines.append('Name: {0}'.format(info['displayName']))
            lines.append('Province Count: {0}'.format(info['totalProvinces']))
            lines.append('Holdings / Major Regions: {0}'.format(origin_str))
            lines.append('Modern Fallback: {0}'.format(modern_fallback))
            lines.append('Owned States: {0}'.format(', '.join(owned_states)))
            lines.append('-' * 50)
        lines.append('')

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print('wrote', OUT_PATH, '(', len(lines), 'lines )')


if __name__ == '__main__':
    main()
