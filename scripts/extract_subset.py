import re

target_tables = ["product_category", "supplier", "products", "product_prices"]
pattern = re.compile(r"insert\s+into\s+`?(product_category|supplier|products|product_prices)`?", re.IGNORECASE)

extracting = False
with open('sql/03_31_2026 Backup.sql', 'r', encoding='utf-8', errors='ignore') as f:
    with open('import_subset.sql', 'w', encoding='utf-8') as out:
        for line in f:
            if pattern.search(line):
                extracting = True
            
            if extracting:
                out.write(line)
                if line.strip().endswith(';'):
                    extracting = False
                    print(f"Finished extracting a table section.")
