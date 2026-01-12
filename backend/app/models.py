from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    server = "server"
    cashier = "cashier"
    host = "host"

class OrderType(str, enum.Enum):
    dine_in = "dine-in"
    takeout = "takeout"
    delivery = "delivery"

class OrderStatus(str, enum.Enum):
    open = "open"
    sent = "sent"
    preparing = "preparing"
    ready = "ready"
    served = "served"
    paid = "paid"
    voided = "voided"

class TableStatus(str, enum.Enum):
    available = "available"
    occupied = "occupied"
    reserved = "reserved"
    cleaning = "cleaning"

class PaymentMethod(str, enum.Enum):
    cash = "cash"
    credit = "credit"
    debit = "debit"
    gift_card = "gift_card"

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    declined = "declined"
    refunded = "refunded"

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    pin_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.server)
    permissions = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    orders = relationship("Order", back_populates="server")
    audit_logs = relationship("AuditLog", back_populates="actor")

class MenuItem(Base):
    __tablename__ = "menu_items"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    sku = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    name_chinese = Column(String)
    description = Column(Text)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False, index=True)
    subcategory = Column(String)
    tags = Column(JSON, default=list)
    is_available = Column(Boolean, default=True)
    spice_level = Column(Integer, default=0)
    allergens = Column(JSON, default=list)
    image_url = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    order_items = relationship("OrderItem", back_populates="menu_item")

class Table(Base):
    __tablename__ = "tables"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    label = Column(String, unique=True, nullable=False)
    seats = Column(Integer, default=4)
    status = Column(Enum(TableStatus), default=TableStatus.available)
    shape = Column(String, default="square")
    position_x = Column(Float, default=0)
    position_y = Column(Float, default=0)
    width = Column(Float, default=80)
    height = Column(Float, default=80)
    rotation = Column(Float, default=0)
    section = Column(String)
    current_order_id = Column(String, ForeignKey("orders.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    orders = relationship("Order", back_populates="table", foreign_keys="Order.table_id")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    order_number = Column(Integer, nullable=False, index=True)
    type = Column(Enum(OrderType), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.open)
    table_id = Column(String, ForeignKey("tables.id"))
    table_label = Column(String)
    server_id = Column(String, ForeignKey("users.id"))
    subtotal = Column(Float, default=0)
    tax = Column(Float, default=0)
    tip = Column(Float, default=0)
    discount = Column(Float, default=0)
    total = Column(Float, default=0)
    guest_count = Column(Integer)
    notes = Column(Text)
    delivery_address = Column(String)
    delivery_contact = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    paid_at = Column(DateTime(timezone=True))
    
    table = relationship("Table", back_populates="orders", foreign_keys=[table_id])
    server = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(String, ForeignKey("menu_items.id"), nullable=False)
    name = Column(String, nullable=False)
    name_chinese = Column(String)
    quantity = Column(Integer, default=1)
    price = Column(Float, nullable=False)
    modifiers = Column(JSON, default=list)
    notes = Column(Text)
    status = Column(String, default="pending")
    sent_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem", back_populates="order_items")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("orders.id"), nullable=False)
    method = Column(Enum(PaymentMethod), nullable=False)
    amount = Column(Float, nullable=False)
    tip = Column(Float, default=0)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.pending)
    reference = Column(String)
    card_last4 = Column(String)
    cash_tendered = Column(Float)
    change_due = Column(Float)
    processed_by = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    order = relationship("Order", back_populates="payments")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    actor_id = Column(String, ForeignKey("users.id"))
    actor_name = Column(String, nullable=False)
    action = Column(String, nullable=False, index=True)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String)
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    actor = relationship("User", back_populates="audit_logs")

class Printer(Base):
    __tablename__ = "printers"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    type = Column(String, default="receipt")  # kitchen, receipt, bar
    connection_type = Column(String, default="network")  # network, usb, bluetooth
    address = Column(String)
    is_online = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PrinterMapping(Base):
    __tablename__ = "printer_mappings"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    kitchen_printer_id = Column(String, ForeignKey("printers.id"))
    receipt_printer_id = Column(String, ForeignKey("printers.id"))
    bar_printer_id = Column(String, ForeignKey("printers.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PrintJob(Base):
    __tablename__ = "print_jobs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    order_id = Column(String, ForeignKey("orders.id"))
    payment_id = Column(String, ForeignKey("payments.id"))
    printer_id = Column(String, ForeignKey("printers.id"), nullable=False)
    job_type = Column(String, nullable=False)  # kitchen, receipt
    payload = Column(Text, nullable=False)
    status = Column(String, default="queued")  # queued, printing, completed, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    key = Column(String, unique=True, nullable=False)
    value = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

