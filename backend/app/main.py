from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
import time

from .database import engine, get_db, Base
from .config import get_settings
from . import models, schemas, auth

# Create tables
Base.metadata.create_all(bind=engine)

settings = get_settings()
app = FastAPI(title=settings.app_name, version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Order counter (in production, use database sequence)
order_counter = {"value": 1000}

# ============== AUTH ==============

@app.post("/api/auth/login", response_model=schemas.TokenResponse)
async def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.is_active == True).all()
    authenticated_user = None
    
    for u in user:
        if auth.verify_pin(request.pin, u.pin_hash):
            authenticated_user = u
            break
    
    if not authenticated_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN"
        )
    
    access_token = auth.create_access_token(data={"sub": authenticated_user.id})
    auth.create_audit_log(db, authenticated_user, "login", "session", authenticated_user.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": authenticated_user
    }

@app.post("/api/auth/logout")
async def logout(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    auth.create_audit_log(db, current_user, "logout", "session", current_user.id)
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me", response_model=schemas.UserResponse)
async def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# ============== USERS ==============

@app.get("/api/users", response_model=List[schemas.UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("users:read"))
):
    return db.query(models.User).all()

@app.post("/api/users", response_model=schemas.UserResponse)
async def create_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("users:write"))
):
    # Check if email exists
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = models.User(
        email=user_data.email,
        full_name=user_data.full_name,
        pin_hash=auth.hash_pin(user_data.pin),
        role=user_data.role,
        permissions=auth.get_permissions_for_role(user_data.role.value)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    auth.create_audit_log(db, current_user, "create", "user", user.id, {"email": user.email})
    return user

@app.put("/api/users/{user_id}", response_model=schemas.UserResponse)
async def update_user(
    user_id: str,
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("users:write"))
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_data.model_dump(exclude_unset=True)
    if "pin" in update_data:
        update_data["pin_hash"] = auth.hash_pin(update_data.pop("pin"))
    if "role" in update_data:
        update_data["permissions"] = auth.get_permissions_for_role(update_data["role"].value)
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    
    auth.create_audit_log(db, current_user, "update", "user", user.id)
    return user

@app.delete("/api/users/{user_id}")
async def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("users:write"))
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = False
    db.commit()
    
    auth.create_audit_log(db, current_user, "delete", "user", user_id)
    return {"message": "User deactivated"}

# ============== MENU ==============

@app.get("/api/menu", response_model=List[schemas.MenuItemResponse])
async def list_menu_items(
    category: Optional[str] = None,
    available_only: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(models.MenuItem)
    if category:
        query = query.filter(models.MenuItem.category == category)
    if available_only:
        query = query.filter(models.MenuItem.is_available == True)
    return query.order_by(models.MenuItem.category, models.MenuItem.name).all()

@app.post("/api/menu", response_model=schemas.MenuItemResponse)
async def create_menu_item(
    item_data: schemas.MenuItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("menu:write"))
):
    item = models.MenuItem(**item_data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    
    auth.create_audit_log(db, current_user, "create", "menu_item", item.id, {"name": item.name})
    return item

@app.put("/api/menu/{item_id}", response_model=schemas.MenuItemResponse)
async def update_menu_item(
    item_id: str,
    item_data: schemas.MenuItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("menu:write"))
):
    item = db.query(models.MenuItem).filter(models.MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    for key, value in item_data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    
    db.commit()
    db.refresh(item)
    
    auth.create_audit_log(db, current_user, "update", "menu_item", item.id)
    return item

# ============== TABLES ==============

@app.get("/api/tables", response_model=List[schemas.TableResponse])
async def list_tables(db: Session = Depends(get_db)):
    return db.query(models.Table).order_by(models.Table.label).all()

@app.post("/api/tables", response_model=schemas.TableResponse)
async def create_table(
    table_data: schemas.TableCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("tables:layout"))
):
    table = models.Table(**table_data.model_dump())
    db.add(table)
    db.commit()
    db.refresh(table)
    return table

@app.put("/api/tables/{table_id}", response_model=schemas.TableResponse)
async def update_table(
    table_id: str,
    table_data: schemas.TableUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("tables:write"))
):
    table = db.query(models.Table).filter(models.Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    old_status = table.status
    for key, value in table_data.model_dump(exclude_unset=True).items():
        setattr(table, key, value)
    
    db.commit()
    db.refresh(table)
    
    if old_status != table.status:
        action = "table_clear" if table.status == models.TableStatus.available else "table_assign"
        auth.create_audit_log(db, current_user, action, "table", table.id, {"status": table.status.value})
    
    return table

@app.delete("/api/tables/{table_id}")
async def delete_table(
    table_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("tables:layout"))
):
    table = db.query(models.Table).filter(models.Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    db.delete(table)
    db.commit()
    return {"message": "Table deleted"}

# ============== ORDERS ==============

@app.get("/api/orders", response_model=List[schemas.OrderResponse])
async def list_orders(
    status: Optional[str] = None,
    type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("orders:read"))
):
    query = db.query(models.Order)
    if status:
        query = query.filter(models.Order.status == status)
    if type:
        query = query.filter(models.Order.type == type)
    
    orders = query.order_by(models.Order.created_at.desc()).limit(limit).all()
    
    # Add server name to response
    for order in orders:
        if order.server:
            order.server_name = order.server.full_name
    
    return orders

@app.post("/api/orders", response_model=schemas.OrderResponse)
async def create_order(
    order_data: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("orders:write"))
):
    order_counter["value"] += 1
    
    table = None
    if order_data.table_id:
        table = db.query(models.Table).filter(models.Table.id == order_data.table_id).first()
        if table:
            table.status = models.TableStatus.occupied
    
    order = models.Order(
        order_number=order_counter["value"],
        type=order_data.type,
        table_id=order_data.table_id,
        table_label=table.label if table else None,
        server_id=current_user.id,
        notes=order_data.notes,
        delivery_address=order_data.delivery_address,
        delivery_contact=order_data.delivery_contact,
        guest_count=order_data.guest_count
    )
    db.add(order)
    
    if table:
        table.current_order_id = order.id
    
    db.commit()
    db.refresh(order)
    
    order.server_name = current_user.full_name
    return order

@app.get("/api/orders/{order_id}", response_model=schemas.OrderResponse)
async def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("orders:read"))
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.server:
        order.server_name = order.server.full_name
    
    return order

@app.put("/api/orders/{order_id}", response_model=schemas.OrderResponse)
async def update_order(
    order_id: str,
    order_data: schemas.OrderUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("orders:write"))
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    for key, value in order_data.model_dump(exclude_unset=True).items():
        setattr(order, key, value)
    
    # Recalculate total if tip or discount changed
    order.total = order.subtotal + order.tax + order.tip - order.discount
    
    db.commit()
    db.refresh(order)
    
    auth.create_audit_log(db, current_user, "order_modify", "order", order.id)
    return order

@app.post("/api/orders/{order_id}/items", response_model=schemas.OrderItemResponse)
async def add_order_item(
    order_id: str,
    item_data: schemas.OrderItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("orders:write"))
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    menu_item = db.query(models.MenuItem).filter(models.MenuItem.id == item_data.menu_item_id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    order_item = models.OrderItem(
        order_id=order_id,
        menu_item_id=menu_item.id,
        name=menu_item.name,
        name_chinese=menu_item.name_chinese,
        quantity=item_data.quantity,
        price=menu_item.price,
        notes=item_data.notes
    )
    db.add(order_item)
    
    # Recalculate totals
    order.subtotal += menu_item.price * item_data.quantity
    order.tax = order.subtotal * settings.tax_rate
    order.total = order.subtotal + order.tax + order.tip - order.discount
    
    db.commit()
    db.refresh(order_item)
    
    auth.create_audit_log(db, current_user, "item_add", "order_item", order_item.id, {
        "orderId": order_id,
        "name": menu_item.name,
        "quantity": item_data.quantity
    })
    
    return order_item

@app.put("/api/orders/{order_id}/items/{item_id}", response_model=schemas.OrderItemResponse)
async def update_order_item(
    order_id: str,
    item_id: str,
    item_data: schemas.OrderItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("orders:write"))
):
    order_item = db.query(models.OrderItem).filter(
        models.OrderItem.id == item_id,
        models.OrderItem.order_id == order_id
    ).first()
    
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    order = order_item.order
    old_total = order_item.price * order_item.quantity
    
    for key, value in item_data.model_dump(exclude_unset=True).items():
        setattr(order_item, key, value)
    
    new_total = order_item.price * order_item.quantity
    
    # Recalculate totals
    order.subtotal = order.subtotal - old_total + new_total
    order.tax = order.subtotal * settings.tax_rate
    order.total = order.subtotal + order.tax + order.tip - order.discount
    
    db.commit()
    db.refresh(order_item)
    
    auth.create_audit_log(db, current_user, "item_modify", "order_item", item_id, {"orderId": order_id})
    return order_item

@app.delete("/api/orders/{order_id}/items/{item_id}")
async def remove_order_item(
    order_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("orders:write"))
):
    order_item = db.query(models.OrderItem).filter(
        models.OrderItem.id == item_id,
        models.OrderItem.order_id == order_id
    ).first()
    
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")
    
    order = order_item.order
    item_total = order_item.price * order_item.quantity
    item_name = order_item.name
    item_qty = order_item.quantity
    
    db.delete(order_item)
    
    # Recalculate totals
    order.subtotal -= item_total
    order.tax = order.subtotal * settings.tax_rate
    order.total = order.subtotal + order.tax + order.tip - order.discount
    
    db.commit()
    
    auth.create_audit_log(db, current_user, "item_remove", "order_item", item_id, {
        "orderId": order_id,
        "name": item_name,
        "quantity": item_qty
    })
    
    return {"message": "Item removed"}

@app.post("/api/orders/{order_id}/send")
async def send_order_to_kitchen(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("orders:write"))
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    pending_items = [item for item in order.items if item.status == "pending"]
    now = datetime.utcnow()
    
    for item in pending_items:
        item.status = "sent"
        item.sent_at = now
    
    order.status = models.OrderStatus.sent
    db.commit()
    
    auth.create_audit_log(db, current_user, "order_send", "order", order_id, {
        "itemCount": len(pending_items)
    })
    
    return {"message": f"Sent {len(pending_items)} items to kitchen"}

@app.post("/api/orders/{order_id}/void")
async def void_order(
    order_id: str,
    reason: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("orders:void"))
):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = models.OrderStatus.voided
    
    # Clear table if assigned
    if order.table_id:
        table = db.query(models.Table).filter(models.Table.id == order.table_id).first()
        if table:
            table.status = models.TableStatus.available
            table.current_order_id = None
    
    db.commit()
    
    auth.create_audit_log(db, current_user, "order_void", "order", order_id, {
        "reason": reason,
        "total": order.total
    })
    
    return {"message": "Order voided"}

# ============== PAYMENTS ==============

@app.post("/api/payments", response_model=schemas.PaymentResponse)
async def process_payment(
    payment_data: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("payments:write"))
):
    order = db.query(models.Order).filter(models.Order.id == payment_data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    change_due = None
    if payment_data.method == schemas.PaymentMethod.cash and payment_data.cash_tendered:
        if payment_data.cash_tendered < payment_data.amount:
            raise HTTPException(status_code=400, detail="Cash tendered is less than amount due")
        change_due = payment_data.cash_tendered - payment_data.amount
    
    payment = models.Payment(
        order_id=order.id,
        method=payment_data.method,
        amount=payment_data.amount,
        tip=payment_data.tip,
        status=models.PaymentStatus.approved,
        reference=f"PAY-{int(time.time())}",
        cash_tendered=payment_data.cash_tendered,
        change_due=change_due,
        processed_by=current_user.full_name
    )
    db.add(payment)
    
    # Update order
    order.tip = payment_data.tip
    order.total = order.subtotal + order.tax + order.tip - order.discount
    order.status = models.OrderStatus.paid
    order.paid_at = datetime.utcnow()
    
    # Clear table
    if order.table_id:
        table = db.query(models.Table).filter(models.Table.id == order.table_id).first()
        if table:
            table.status = models.TableStatus.cleaning
            table.current_order_id = None
    
    db.commit()
    db.refresh(payment)
    
    auth.create_audit_log(db, current_user, "payment_process", "payment", payment.id, {
        "orderId": order.id,
        "method": payment_data.method.value,
        "amount": payment_data.amount,
        "tip": payment_data.tip
    })
    
    return payment

# ============== AUDIT LOGS ==============

@app.get("/api/audit-logs", response_model=List[schemas.AuditLogResponse])
async def list_audit_logs(
    action: Optional[str] = None,
    actor_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("audit:read"))
):
    query = db.query(models.AuditLog)
    if action:
        query = query.filter(models.AuditLog.action == action)
    if actor_id:
        query = query.filter(models.AuditLog.actor_id == actor_id)
    
    return query.order_by(models.AuditLog.created_at.desc()).limit(limit).all()

# ============== ANALYTICS ==============

@app.get("/api/analytics/daily", response_model=List[schemas.DailySummary])
async def get_daily_analytics(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("reports:read"))
):
    from datetime import date, timedelta
    
    summaries = []
    today = date.today()
    
    for i in range(days):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        
        # Get paid orders for the day
        orders = db.query(models.Order).filter(
            models.Order.status == models.OrderStatus.paid,
            models.Order.paid_at >= day_start,
            models.Order.paid_at <= day_end
        ).all()
        
        # Get payments
        payments = db.query(models.Payment).filter(
            models.Payment.status == models.PaymentStatus.approved,
            models.Payment.created_at >= day_start,
            models.Payment.created_at <= day_end
        ).all()
        
        total_revenue = sum(o.total for o in orders)
        order_count = len(orders)
        
        summaries.append(schemas.DailySummary(
            date=day.isoformat(),
            total_revenue=total_revenue,
            order_count=order_count,
            average_order_value=total_revenue / order_count if order_count > 0 else 0,
            tip_total=sum(o.tip for o in orders),
            cash_payments=sum(p.amount for p in payments if p.method == models.PaymentMethod.cash),
            card_payments=sum(p.amount for p in payments if p.method in [models.PaymentMethod.credit, models.PaymentMethod.debit]),
            dine_in_orders=len([o for o in orders if o.type == models.OrderType.dine_in]),
            takeout_orders=len([o for o in orders if o.type == models.OrderType.takeout]),
            delivery_orders=len([o for o in orders if o.type == models.OrderType.delivery])
        ))
    
    return summaries

# ============== PRINTERS ==============

@app.get("/api/printers", response_model=List[schemas.PrinterResponse])
async def list_printers(db: Session = Depends(get_db)):
    return db.query(models.Printer).all()

@app.post("/api/printers", response_model=schemas.PrinterResponse)
async def create_printer(
    printer_data: schemas.PrinterCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("settings:write"))
):
    printer = models.Printer(**printer_data.model_dump())
    db.add(printer)
    db.commit()
    db.refresh(printer)
    return printer

@app.delete("/api/printers/{printer_id}")
async def delete_printer(
    printer_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_permission("settings:write"))
):
    printer = db.query(models.Printer).filter(models.Printer.id == printer_id).first()
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    db.delete(printer)
    db.commit()
    return {"message": "Printer deleted"}

# ============== HEALTH CHECK ==============

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

