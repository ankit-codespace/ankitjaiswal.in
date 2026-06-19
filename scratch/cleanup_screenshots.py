import re
import os

base_dir = r"c:\Users\LENOVO-PC\Documents\Ankit Jaiswal Portfolio\Ankit Jaiswal Portfolio\ankitjaiswal.in"
files = [
    os.path.join(base_dir, "store-assets", f"store-screenshot-{i}.html") for i in range(1, 7)
]

# Pattern to look for <div class="tabs-left"> followed by whitespace, control-dot lines, and the extra closing div
pattern = re.compile(
    r'(<div class="tabs-left">\s*\n)(\s*<div class="control-dot minimize"></div>\s*\n)(\s*<div class="control-dot maximize"></div>\s*\n)(\s*</div>\s*\n)',
    re.MULTILINE
)

for filepath in files:
    if not os.path.exists(filepath):
        print(f"Skipping {filepath} (does not exist)")
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if pattern matches
    match = pattern.search(content)
    if match:
        new_content = pattern.sub(r'\1', content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully cleaned up {os.path.basename(filepath)}")
    else:
        print(f"Pattern not found in {os.path.basename(filepath)}")
