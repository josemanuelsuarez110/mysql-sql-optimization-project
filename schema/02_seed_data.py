import random
import datetime
from faker import Faker

fake = Faker()

# Goal: Generate a massive SQL dump file with 
# 100K Customers, 5K Products, 500K Orders, 1M Order Items.

DUMP_FILE = "03_seed_bulk_data.sql"
CUSTOMERS_COUNT = 100_000
PRODUCTS_COUNT = 5_000
ORDERS_COUNT = 500_000

def generate_seed():
    print(f"Generating massive SQL seed script: {DUMP_FILE}...")
    
    with open(DUMP_FILE, 'w', encoding='utf-8') as f:
        f.write("USE ecom_optimization;\n\n")
        
        # 1. Generate Customers
        print("-> Generating Customers...")
        f.write("INSERT INTO customers (customer_id, first_name, last_name, email, registration_date, country, is_active) VALUES\n")
        
        customer_inserts = []
        for i in range(1, CUSTOMERS_COUNT + 1):
            fn = fake.first_name().replace("'", "''")
            ln = fake.last_name().replace("'", "''")
            email = f"user{i}_{fake.domain_name()}"
            reg_date = fake.date_between(start_date='-5y', end_date='today').strftime('%Y-%m-%d %H:%M:%S')
            country = random.choice(["USA", "UK", "Canada", "Mexico", "Spain", "France", "Germany", "Japan"])
            active = random.choice([1, 1, 1, 0])
            
            customer_inserts.append(f"({i}, '{fn}', '{ln}', '{email}', '{reg_date}', '{country}', {active})")
            
            # Write in batches of 5000 to avoid huge memory spikes
            if i % 5000 == 0:
                f.write(",\n".join(customer_inserts) + ";\n")
                if i < CUSTOMERS_COUNT:
                    f.write("INSERT INTO customers (customer_id, first_name, last_name, email, registration_date, country, is_active) VALUES\n")
                customer_inserts = []
        
        # 2. Generate Products
        print("-> Generating Products...")
        f.write("\nINSERT INTO products (product_id, name, category, price, stock_quantity) VALUES\n")
        product_inserts = []
        categories = ["Electronics", "Clothing", "Home", "Sports", "Books", "Toys", "Beauty"]
        
        for i in range(1, PRODUCTS_COUNT + 1):
            name = fake.catch_phrase().replace("'", "''")
            cat = random.choice(categories)
            price = round(random.uniform(5.0, 1500.0), 2)
            stock = random.randint(0, 1000)
            product_inserts.append(f"({i}, '{name}', '{cat}', {price}, {stock})")
            
            if i % 1000 == 0:
                f.write(",\n".join(product_inserts) + ";\n")
                if i < PRODUCTS_COUNT:
                    f.write("INSERT INTO products (product_id, name, category, price, stock_quantity) VALUES\n")
                product_inserts = []
                
        # 3. Generate Orders & Order Items
        print("-> Generating Orders & Order Items (1M+ rows)...")
        
        order_inserts = []
        item_inserts = []
        item_id_counter = 1
        
        # Batch write headers
        f.write("\nINSERT INTO orders (order_id, customer_id, order_date, status, total_amount) VALUES\n")
        
        for i in range(1, ORDERS_COUNT + 1):
            cust_id = random.randint(1, CUSTOMERS_COUNT)
            date = fake.date_time_between(start_date='-3y', end_date='now').strftime('%Y-%m-%d %H:%M:%S')
            status = random.choices(["COMPLETED", "PENDING", "CANCELLED", "REFUNDED"], weights=[80, 10, 5, 5])[0]
            
            # Determine items in order
            num_items = random.randint(1, 5)
            order_total = 0.0
            
            current_order_items = []
            for _ in range(num_items):
                prod_id = random.randint(1, PRODUCTS_COUNT)
                qty = random.randint(1, 3)
                unit_price = round(random.uniform(5.0, 100.0), 2) # simplified price
                order_total += qty * unit_price
                
                current_order_items.append(f"({item_id_counter}, {i}, {prod_id}, {qty}, {unit_price})")
                item_id_counter += 1
                
            item_inserts.extend(current_order_items)
            order_inserts.append(f"({i}, {cust_id}, '{date}', '{status}', {round(order_total, 2)})")
            
            if len(order_inserts) >= 5000:
                f.write(",\n".join(order_inserts) + ";\n")
                f.write("\nINSERT INTO order_items (order_item_id, order_id, product_id, quantity, unit_price) VALUES\n")
                f.write(",\n".join(item_inserts) + ";\n")
                
                if i < ORDERS_COUNT:
                    f.write("\nINSERT INTO orders (order_id, customer_id, order_date, status, total_amount) VALUES\n")
                    
                order_inserts = []
                item_inserts = []

    print(f"✅ Success! File {DUMP_FILE} generated (~200MB of pure SQL inserts).")
    print("Run: mysql -u root ecom_optimization < 03_seed_bulk_data.sql")

if __name__ == "__main__":
    generate_seed()
