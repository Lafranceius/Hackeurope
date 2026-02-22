import csv
import os
import random
from datetime import datetime, timedelta

DATA_DIR = "messy_data"

def generate_large_clean():
    file_path = os.path.join(DATA_DIR, "large_clean_data.csv")
    headers = ["transaction_id", "date", "customer_id", "amount", "currency", "status", "country"]
    countries = ["US", "UK", "DE", "FR", "JP", "CA", "AU"]
    statuses = ["COMPLETED", "PENDING", "FAILED"]
    
    start_date = datetime(2023, 1, 1)
    
    with open(file_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for i in range(1, 10001):
            date = (start_date + timedelta(minutes=i * 15)).strftime("%Y-%m-%d %H:%M:%S")
            row = [
                f"TXN-{i:06d}",
                date,
                f"CUST-{random.randint(1000, 9999)}",
                round(random.uniform(10.0, 5000.0), 2),
                "USD",
                random.choice(statuses),
                random.choice(countries)
            ]
            writer.writerow(row)

def generate_large_messy():
    file_path = os.path.join(DATA_DIR, "large_messy_data.csv")
    # Messy headers (inconsistent casing/spaces)
    headers = ["ID", " timestamp ", "Cust_ID", "AMT", "curr", "STATUS", "cntry"]
    countries = ["US", "USA", "U.S.A.", "UK", "United Kingdom", "de", "DE", "FR", "France", "JP", "Japan", "NULL", ""]
    statuses = ["COMPLETED", "completed", "Pending", "FAILED", "fail", "ERROR", "n/a"]
    date_formats = ["%Y-%m-%d %H:%M:%S", "%d/%m/%Y", "%m-%d-%Y", "Unknown", ""]
    
    start_date = datetime(2023, 1, 1)
    
    with open(file_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for i in range(1, 10001):
            # Introduce duplicates
            if i % 100 == 0:
                idx = i
            else:
                idx = i

            # Randomly mess up the date
            fmt = random.choice(date_formats)
            if fmt == "":
                date = ""
            elif fmt == "Unknown":
                date = "Unknown"
            else:
                date = (start_date + timedelta(minutes=i * 23)).strftime(fmt)

            # Randomly mess up amount
            amt = random.uniform(10.0, 5000.0)
            if i % 50 == 0:
                amt_str = f"${amt:,.2f}" # Currency symbol and commas
            elif i % 75 == 0:
                amt_str = "NULL"
            elif i % 120 == 0:
                amt_str = -999.99 # Outlier/Error code
            elif i % 200 == 0:
                amt_str = "inf"
            else:
                amt_str = round(amt, random.randint(0, 5)) # Inconsistent precision

            # Randomly mess up customer ID
            cust_id = f"CUST-{random.randint(1000, 9999)}"
            if i % 80 == 0:
                cust_id = cust_id.lower()
            if i % 150 == 0:
                cust_id = f"  {cust_id}  " # Extra spaces

            row = [
                f"TXN-{idx:06d}" if i % 95 != 0 else f"{idx}", # Inconsistent ID format
                date,
                cust_id,
                amt_str,
                "USD" if random.random() > 0.1 else "usd",
                random.choice(statuses),
                random.choice(countries)
            ]
            
            # Randomly inject completely empty rows or rows with wrong column count
            if i % 500 == 0:
                writer.writerow([])
                continue
            
            writer.writerow(row)
            
            # Inject explicit duplicates
            if i % 1000 == 0:
                writer.writerow(row)

def main():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    print("Generating large clean dataset...")
    generate_large_clean()
    print("Generating large messy dataset...")
    generate_large_messy()
    print("Done.")

if __name__ == "__main__":
    main()
