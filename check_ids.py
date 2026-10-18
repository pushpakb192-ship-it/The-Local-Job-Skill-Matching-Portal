import re

with open('templates/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('static/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html))
js_ids = set(re.findall(r'getElementById\(["\']([^"\']+)["\']\)', js))

print('HTML total IDs:', len(html_ids))
print('JS total referenced IDs:', len(js_ids))

missing_in_html = js_ids - html_ids
print('IDs referenced in JS but MISSING in HTML:', missing_in_html)

unused_in_js = html_ids - js_ids
print('IDs in HTML not referenced in JS:', unused_in_js)
