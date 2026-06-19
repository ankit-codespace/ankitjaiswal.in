import subprocess
import os
import sys

base_dir = r"c:\Users\LENOVO-PC\Documents\Ankit Jaiswal Portfolio\Ankit Jaiswal Portfolio\ankitjaiswal.in"
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

if not os.path.exists(chrome_path):
    print("Error: Chrome executable not found at Program Files path")
    sys.exit(1)

for i in range(1, 7):
    html_file = os.path.join(base_dir, "store-assets", f"store-screenshot-{i}.html")
    output_png = os.path.join(base_dir, "store-assets", "screenshots", f"{i}.png")
    
    # Make sure output directory exists
    os.makedirs(os.path.dirname(output_png), exist_ok=True)
    
    # Convert file path to file URL
    html_url = f"file:///{html_file.replace(os.sep, '/')}"
    
    print(f"Generating screenshot {i} from {os.path.basename(html_file)}...")
    
    cmd = [
        chrome_path,
        "--headless",
        "--disable-gpu",
        f"--screenshot={output_png}",
        "--window-size=1920,1080",
        "--hide-scrollbars",
        html_url
    ]
    
    try:
        # Run command synchronously
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        if os.path.exists(output_png):
            size = os.path.getsize(output_png)
            print(f"  Saved to {os.path.basename(output_png)} ({size} bytes)")
        else:
            print(f"  Warning: command finished but {os.path.basename(output_png)} was not found")
    except Exception as e:
        print(f"  Error generating screenshot {i}: {e}")

print("All screenshots generated successfully.")
