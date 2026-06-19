import pypdf

pdf_path = r"C:\Users\LENOVO-PC\Downloads\I Love Notepad certification report _ Partner Center.pdf"
out_path = r"c:\Users\LENOVO-PC\Documents\Ankit Jaiswal Portfolio\Ankit Jaiswal Portfolio\ankitjaiswal.in\scratch\report_text.txt"

try:
    reader = pypdf.PdfReader(pdf_path)
    lines = []
    lines.append(f"Total pages: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        lines.append(f"\n--- Page {i+1} ---")
        text = page.extract_text()
        lines.append(text)
    
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("PDF read successfully. Saved to report_text.txt")
except Exception as e:
    print(f"Error reading PDF: {e}")
