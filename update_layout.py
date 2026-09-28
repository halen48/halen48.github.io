import re
import sys

def update_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the JRPG Collection block
    jrpg_pattern = re.compile(r'(\s*<!-- JRPG & Retro Collection -->\s*<div class="glass-panel bg-card hover:bg-cardHover p-0 rounded-2xl border border-white/5 overflow-hidden card-glow group flex flex-col)[^>]*>(\s*<div class="h-64 flex gap-1 bg-black/50 p-1">)(.*?)(</div>\s*<div class="p-6">)(.*?</p>\s*</div>\s*</div>)', re.DOTALL)
    
    match = jrpg_pattern.search(content)
    if not match:
        print(f"Could not find JRPG block in {filename}")
        return
        
    jrpg_full_block = match.group(0)
    
    # Rewrite the JRPG block to the new layout
    new_jrpg_block = jrpg_full_block.replace(
        match.group(1),
        match.group(1).split(' md:col-span-2')[0] + ' md:flex-row md:col-span-2">'
    ).replace(
        match.group(2),
        '\n                    <div class="md:w-1/2 h-64 md:h-auto flex gap-1 bg-black/50 p-1 min-h-[16rem]">'
    ).replace(
        match.group(4),
        '</div>\n                    <div class="p-6 md:w-1/2 flex flex-col justify-center">'
    )

    # Remove the JRPG block from its current position
    content = content.replace(jrpg_full_block, '')

    # Find the end of MTG Collection block
    mtg_end_pattern = re.compile(r'(<!-- MTG Collection -->.*?</p>\s*</div>\s*</div>)', re.DOTALL)
    mtg_match = mtg_end_pattern.search(content)
    if mtg_match:
        # Insert JRPG right after MTG
        content = content.replace(mtg_match.group(1), mtg_match.group(1) + '\n\n' + new_jrpg_block.strip('\n'))
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Successfully updated {filename}")
    else:
        print(f"Could not find MTG block in {filename}")

update_file('index.html')
update_file('index-pt.html')
update_file('index-jp.html')
