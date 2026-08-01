import os

def fix_img_name(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace('frankenstrat.jpg', 'guitarra.jpeg')
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

fix_img_name('index.html')
fix_img_name('index-pt.html')
fix_img_name('index-jp.html')
print("Fixed guitar image name to guitarra.jpeg")
