"""
Seed script to populate initial data
Run: python -m app.seed
"""
from .database import SessionLocal, engine, Base
from . import models, auth

# Create tables
Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    
    try:
        # Check if already seeded
        if db.query(models.User).first():
            print("Database already seeded")
            return
        
        # Create users
        users = [
            models.User(
                email="admin@dragonpalace.com",
                full_name="Michael Chen",
                pin_hash=auth.hash_pin("1234"),
                role=models.UserRole.admin,
                permissions=auth.ROLE_PERMISSIONS["admin"]
            ),
            models.User(
                email="manager@dragonpalace.com",
                full_name="Sarah Wong",
                pin_hash=auth.hash_pin("5678"),
                role=models.UserRole.manager,
                permissions=auth.ROLE_PERMISSIONS["manager"]
            ),
            models.User(
                email="server1@dragonpalace.com",
                full_name="David Liu",
                pin_hash=auth.hash_pin("1111"),
                role=models.UserRole.server,
                permissions=auth.ROLE_PERMISSIONS["server"]
            ),
            models.User(
                email="cashier@dragonpalace.com",
                full_name="Kevin Tan",
                pin_hash=auth.hash_pin("3333"),
                role=models.UserRole.cashier,
                permissions=auth.ROLE_PERMISSIONS["cashier"]
            ),
        ]
        db.add_all(users)
        print(f"Created {len(users)} users")
        
        # Create menu items
        menu_items = [
            # Dim Sum
            models.MenuItem(
                sku="DS-001", name="Har Gow", name_chinese="蝦餃",
                description="Crystal shrimp dumplings with bamboo shoots",
                price=7.95, category="dimsum", subcategory="Steamed",
                tags=["seafood", "steamed", "popular"], spice_level=0,
                allergens=["shellfish", "gluten"]
            ),
            models.MenuItem(
                sku="DS-002", name="Siu Mai", name_chinese="燒賣",
                description="Open-top pork and shrimp dumplings",
                price=6.95, category="dimsum", subcategory="Steamed",
                tags=["pork", "seafood", "steamed", "popular"], spice_level=0
            ),
            models.MenuItem(
                sku="DS-003", name="Char Siu Bao", name_chinese="叉燒包",
                description="Fluffy steamed buns with BBQ pork",
                price=6.50, category="dimsum", subcategory="Steamed",
                tags=["pork", "steamed", "popular"], spice_level=0
            ),
            models.MenuItem(
                sku="DS-004", name="Xiao Long Bao", name_chinese="小籠包",
                description="Soup dumplings with pork and rich broth",
                price=9.95, category="dimsum", subcategory="Steamed",
                tags=["pork", "steamed", "soup", "popular"], spice_level=0
            ),
            models.MenuItem(
                sku="DS-005", name="Spring Rolls", name_chinese="春卷",
                description="Crispy vegetable spring rolls",
                price=5.50, category="dimsum", subcategory="Fried",
                tags=["vegetarian", "fried", "crispy"], spice_level=0
            ),
            
            # Lunch
            models.MenuItem(
                sku="LN-001", name="Kung Pao Chicken", name_chinese="宮保雞丁",
                description="Stir-fried chicken with peanuts and chili",
                price=14.95, category="lunch", subcategory="Poultry",
                tags=["chicken", "spicy", "popular", "nuts"], spice_level=2
            ),
            models.MenuItem(
                sku="LN-002", name="Beef Chow Fun", name_chinese="乾炒牛河",
                description="Wide rice noodles with tender beef",
                price=15.50, category="lunch", subcategory="Noodles",
                tags=["beef", "noodles", "popular"], spice_level=0
            ),
            models.MenuItem(
                sku="LN-003", name="Mapo Tofu", name_chinese="麻婆豆腐",
                description="Silky tofu in spicy fermented bean sauce",
                price=13.95, category="lunch", subcategory="Tofu",
                tags=["tofu", "spicy", "vegetarian-option"], spice_level=3
            ),
            models.MenuItem(
                sku="LN-004", name="Yang Chow Fried Rice", name_chinese="揚州炒飯",
                description="Classic fried rice with shrimp and char siu",
                price=13.95, category="lunch", subcategory="Rice",
                tags=["rice", "seafood", "pork", "popular"], spice_level=0
            ),
            
            # Dinner
            models.MenuItem(
                sku="DN-001", name="Peking Duck", name_chinese="北京烤鴨",
                description="Whole roasted duck with pancakes and hoisin",
                price=58.00, category="dinner", subcategory="Signature",
                tags=["duck", "signature", "share"], spice_level=0
            ),
            models.MenuItem(
                sku="DN-002", name="Lobster Ginger Scallion", name_chinese="薑蔥龍蝦",
                description="Fresh lobster wok-fried with ginger and scallions",
                price=48.00, category="dinner", subcategory="Seafood",
                tags=["seafood", "signature", "premium"], spice_level=0
            ),
            models.MenuItem(
                sku="DN-003", name="Mongolian Beef", name_chinese="蒙古牛肉",
                description="Tender beef with scallions in brown sauce",
                price=22.95, category="dinner", subcategory="Beef",
                tags=["beef", "popular"], spice_level=1
            ),
            
            # Drinks
            models.MenuItem(
                sku="DR-001", name="Jasmine Tea", name_chinese="茉莉花茶",
                description="Fragrant green tea with jasmine blossoms",
                price=4.00, category="drinks", subcategory="Hot Tea",
                tags=["tea", "hot"], spice_level=0
            ),
            models.MenuItem(
                sku="DR-002", name="Tsingtao Beer", name_chinese="青島啤酒",
                description="Classic Chinese lager",
                price=6.00, category="drinks", subcategory="Alcohol",
                tags=["beer", "alcohol"], spice_level=0
            ),
            
            # Desserts
            models.MenuItem(
                sku="DE-001", name="Mango Pudding", name_chinese="芒果布甸",
                description="Silky mango pudding with fresh cream",
                price=6.50, category="desserts", subcategory="Pudding",
                tags=["sweet", "fruit", "cold", "popular"], spice_level=0
            ),
            models.MenuItem(
                sku="DE-002", name="Egg Tart", name_chinese="蛋撻",
                description="Flaky pastry with silky egg custard",
                price=4.50, category="desserts", subcategory="Pastry",
                tags=["dessert", "sweet", "popular"], spice_level=0
            ),
        ]
        db.add_all(menu_items)
        print(f"Created {len(menu_items)} menu items")
        
        # Create tables
        tables = [
            models.Table(label="T1", seats=4, shape="square", position_x=60, position_y=60, section="main"),
            models.Table(label="T2", seats=4, shape="square", position_x=180, position_y=60, section="main"),
            models.Table(label="T3", seats=4, shape="square", position_x=300, position_y=60, section="main"),
            models.Table(label="T4", seats=6, shape="rectangle", position_x=420, position_y=60, width=120, section="main"),
            models.Table(label="T5", seats=2, shape="round", position_x=60, position_y=180, width=70, height=70, section="main"),
            models.Table(label="T6", seats=2, shape="round", position_x=160, position_y=180, width=70, height=70, section="main"),
            models.Table(label="T7", seats=4, shape="square", position_x=260, position_y=180, section="main"),
            models.Table(label="T8", seats=4, shape="square", position_x=380, position_y=180, section="main"),
            models.Table(label="T9", seats=8, shape="round", position_x=500, position_y=170, width=100, height=100, section="main"),
            models.Table(label="VIP1", seats=10, shape="round", position_x=650, position_y=100, width=120, height=120, section="vip"),
            models.Table(label="VIP2", seats=12, shape="round", position_x=650, position_y=260, width=130, height=130, section="vip"),
            models.Table(label="B1", seats=2, shape="round", position_x=60, position_y=430, width=60, height=60, section="bar"),
            models.Table(label="B2", seats=2, shape="round", position_x=140, position_y=430, width=60, height=60, section="bar"),
            models.Table(label="B3", seats=2, shape="round", position_x=220, position_y=430, width=60, height=60, section="bar"),
        ]
        db.add_all(tables)
        print(f"Created {len(tables)} tables")
        
        db.commit()
        print("Database seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()

