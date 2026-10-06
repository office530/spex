# Delete all demo data (seed.py). Run via monday MCP execute_code (python).
# Default is a dry run that only lists what would go; pass vars {"DRY_RUN": "0"} to delete.
# Finds: every item whose int_key starts with "DEMO" on the 18 business boards (subitems go with their parent),
# plus anything an automation created from a demo item — tasks keyed/linked to a demo item, intlog rows about one.
import json, os, urllib.request

DRY_RUN = os.environ.get('DRY_RUN', '1') != '0'
B = {'clients': 18433850026, 'contacts': 18433850028, 'vendors': 18433850029, 'leads': 18433850030, 'projects': 18433850032,
     'changes': 18433850033, 'journals': 18433850034, 'defects': 18433850035, 'safety': 18433850036, 'budget': 18433850037,
     'orders': 18433850038, 'vinvoices': 18433850039, 'billing': 18433850040, 'guarantees': 18433850041, 'tasks': 18433850042,
     'renewals': 18433850043, 'sensitive': 18433850044, 'snapshot': 18433850045}
INTLOG = 18433850046

def gql(q, v=None):
    req = urllib.request.Request('https://api.monday.com/v2', data=json.dumps({'query': q, 'variables': v or {}}).encode(),
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=50) as r:
        body = json.loads(r.read())
    if body.get('errors'):
        raise RuntimeError(json.dumps(body['errors'], ensure_ascii=False)[:1500])
    return body['data']

def items(board, cols, rules=None):
    qp = f', query_params: {{rules: {rules}}}' if rules else ''
    out, cursor = [], None
    while True:
        page = (f'next_items_page(limit: 200, cursor: "{cursor}")' if cursor else
                f'boards(ids: [{board}]) {{ items_page(limit: 200{qp})')
        sel = f'{{ cursor items {{ id name column_values(ids: {json.dumps(cols)}) {{ id text ... on BoardRelationValue {{ linked_item_ids }} }} }} }}'
        d = gql(f'{{ {page} {sel} {"}" if not cursor else ""} }}')
        p = d['next_items_page'] if cursor else d['boards'][0]['items_page']
        out += p['items']
        cursor = p['cursor']
        if not cursor:
            return out

cv = lambda it, c: next((x for x in it['column_values'] if x['id'] == c), {})
demo_rule = '[{column_id: "int_key", compare_value: ["DEMO"], operator: contains_text}]'

doomed = {}  # id -> (board, name)
for key, board in B.items():
    for it in items(board, ['int_key'], demo_rule):
        if cv(it, 'int_key').get('text', '').startswith('DEMO'):
            doomed[it['id']] = (key, it['name'])
demo_ids = set(doomed)

# Side effects: tasks an automation opened for a demo item (A14 renewal, A17 tour, M08 collection, M02 setup…).
for it in items(B['tasks'], ['int_key', 'project']):
    key = cv(it, 'int_key').get('text', '') or ''
    linked = {str(i) for i in cv(it, 'project').get('linked_item_ids') or []}
    if it['id'] not in doomed and (linked & demo_ids or any(f':{i}' in key for i in demo_ids)):
        doomed[it['id']] = ('tasks*', it['name'])
for it in items(INTLOG, ['source_item']):
    if cv(it, 'source_item').get('text') in demo_ids:
        doomed[it['id']] = ('intlog*', it['name'])

print(f'{"DRY RUN — " if DRY_RUN else ""}{len(doomed)} items')
for i, (board, name) in sorted(doomed.items(), key=lambda x: x[1][0]):
    print(f'  {board:11} {i}  {name}')

if not DRY_RUN:
    ids = list(doomed)
    for start in range(0, len(ids), 20):
        chunk = ids[start:start + 20]
        gql('mutation { ' + ' '.join(f'd{n}: delete_item(item_id: {i}) {{ id }}' for n, i in enumerate(chunk)) + ' }')
    print('deleted', len(ids))
