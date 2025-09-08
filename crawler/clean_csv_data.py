#!/usr/bin/env python3
"""
Script to clean up CSV data files and remove invalid/placeholder entries
"""

import os
import csv
import re
from datetime import datetime

def clean_csv_file(file_path):
    """Clean a single CSV file by removing bad entries"""
    print(f"Cleaning {file_path}...")
    
    # Read the file
    rows = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            rows.append(row)
    
    # Filter out bad entries
    cleaned_rows = []
    bad_patterns = [
        r'bitcoin reaches new all-time high of \$100',
        r'test article',
        r'placeholder',
        r'sample data',
        r'financial news update',
        r'market analysis and financial insights'
    ]
    
    for row in rows:
        title = row.get('Title', '').lower()
        
        # Check for bad patterns
        is_bad = False
        for pattern in bad_patterns:
            if re.search(pattern, title):
                is_bad = True
                break
        
        # Check for minimum title length
        if len(title) < 10:
            is_bad = True
        
        # Check for valid date
        try:
            date_str = row.get('Published At', '')
            if date_str:
                # Try to parse the date
                if 'T' in date_str and 'Z' in date_str:
                    datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                else:
                    datetime.fromisoformat(date_str.replace(' ', 'T'))
        except:
            is_bad = True
        
        if not is_bad:
            cleaned_rows.append(row)
    
    # Write cleaned data back
    if len(cleaned_rows) != len(rows):
        print(f"  Removed {len(rows) - len(cleaned_rows)} bad entries")
        
        # Backup original file
        backup_path = file_path + '.backup'
        os.rename(file_path, backup_path)
        print(f"  Original file backed up to {backup_path}")
        
        # Write cleaned data
        with open(file_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(cleaned_rows)
        
        print(f"  Cleaned file saved with {len(cleaned_rows)} entries")
    else:
        print(f"  No bad entries found, file is clean")

def main():
    """Main function to clean all CSV files"""
    csv_dir = 'data_warehouse/csv'
    
    if not os.path.exists(csv_dir):
        print(f"CSV directory {csv_dir} not found!")
        return
    
    csv_files = [f for f in os.listdir(csv_dir) if f.endswith('.csv')]
    
    if not csv_files:
        print("No CSV files found!")
        return
    
    print(f"Found {len(csv_files)} CSV files to clean...")
    
    for csv_file in csv_files:
        file_path = os.path.join(csv_dir, csv_file)
        clean_csv_file(file_path)
        print()
    
    print("CSV cleaning completed!")

if __name__ == "__main__":
    main()
