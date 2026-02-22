import csv
import random
from datetime import datetime, timedelta

def generate_clean_data(rows, cols):
    headers = [f"col_{i}" for i in range(cols)]
    data = []
    for r in range(rows):
        row = []
        for c in range(cols):
            if c == 0: # ID
                row.append(r + 1)
            elif "date" in headers[c] or c % 5 == 1:
                row.append((datetime(2023, 1, 1) + timedelta(days=r)).strftime("%Y-%m-%d"))
            elif "amount" in headers[c] or c % 5 == 2:
                row.append(round(random.uniform(10, 1000), 2))
            else:
                row.append(f"value_{r}_{c}")
        data.append(row)
    
    # Introduce exactly 4 mistakes
    # 1. Null value
    data[5][5] = ""
    # 2. Wrong date format
    data[10][1] = "10/10/2023"
    # 3. Typo/Garbage in number
    data[15][2] = "123.45.67"
    # 4. Out of range or weird string in numeric column
    data[20][7] = "N/A"
    
    return headers, data

def generate_messy_data(rows, cols):
    headers = [f"col_{i}" for i in range(cols)]
    # Messy headers too?
    headers[1] = "Date (Mixed)"
    headers[2] = "Amount!!!"
    
    data = []
    for r in range(rows):
        row = []
        for c in range(cols):
            rand = random.random()
            if rand < 0.2:
                row.append("") # Null
            elif rand < 0.4:
                row.append("NULL")
            elif rand < 0.5:
                row.append("undefined")
            elif rand < 0.6:
                row.append(random.choice(["2023-01-01", "01/01/23", "Jan 1st", "yesterday", "??-??-??"]))
            elif rand < 0.7:
                row.append(random.choice(["$100", "100.00", "100,00", "low", "high", "-99999"]))
            else:
                row.append(f"messy_{random.randint(0, 1000)}_{random.choice(['!', '@', '#', '$'])}")
        data.append(row)
    return headers, data

def save_csv(filename, headers, data):
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(data)

# Generate 40x40 datasets
clean_headers, clean_data = generate_clean_data(40, 40)
save_csv('clean_dataset.csv', clean_headers, clean_data)

messy_headers, messy_data = generate_messy_data(40, 40)
save_csv('messy_dataset.csv', messy_headers, messy_data)

print("Datasets generated successfully.")
