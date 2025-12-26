from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum

# Enums
class UserRole(str, Enum):
    admin = "admin"
    manager = "manager"
    server = "server"
    cashier = "cashier"
    host = "host"

class OrderType(str, Enum):
    dine_in = "dine-in"
    takeout = "takeout"
    delivery = "delivery"

class OrderStatus(str, Enum):
    open = "open"
    sent = "sent"
    preparing = "preparing"
    ready = "ready"
    served = "served"
    paid = "paid"
    voided = "voided"

class TableStatus(str, Enum):
    available = "available"
    occupied = "occupied"
    reserved = "reserved"
    cleaning = "cleaning"

class PaymentMethod(str, Enum):
    cash = "cash"
    credit = "credit"
    debit = "debit"
    gift_card = "gift_card"

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.server

class UserCreate(UserBase):
    pin: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    pin: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: str
    permissions: List[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    pin: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Menu Item Schemas
class MenuItemBase(BaseModel):
    sku: str
    name: str
    name_chinese: Optional[str] = None
    description: Optional[str] = None
    price: float
    category: str
    subcategory: Optional[str] = None
    tags: List[str] = []
    spice_level: int = 0
    allergens: List[str] = []
    image_url: Optional[str] = None

class MenuItemCreate(MenuItemBase):
    pass

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    name_chinese: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    tags: Optional[List[str]] = None
    is_available: Optional[bool] = None
    spice_level: Optional[int] = None
    allergens: Optional[List[str]] = None

class MenuItemResponse(MenuItemBase):
    id: str
    is_available: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Table Schemas
class TableBase(BaseModel):
    label: str
    seats: int = 4
    shape: str = "square"
    position_x: float = 0
    position_y: float = 0
    width: float = 80
    height: float = 80
    rotation: float = 0
    section: Optional[str] = None

class TableCreate(TableBase):
    pass

class TableUpdate(BaseModel):
    label: Optional[str] = None
    seats: Optional[int] = None
    status: Optional[TableStatus] = None
    shape: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    rotation: Optional[float] = None
    section: Optional[str] = None

class TableResponse(TableBase):
    id: str
    status: TableStatus
    current_order_id: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Order Item Schemas
class OrderItemBase(BaseModel):
    menu_item_id: str
    quantity: int = 1
    notes: Optional[str] = None

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemUpdate(BaseModel):
    quantity: Optional[int] = None
    notes: Optional[str] = None

class OrderItemResponse(BaseModel):
    id: str
    menu_item_id: str
    name: str
    name_chinese: Optional[str] = None
    quantity: int
    price: float
    modifiers: List[Any] = []
    notes: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Order Schemas
class OrderBase(BaseModel):
    type: OrderType
    table_id: Optional[str] = None
    notes: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_contact: Optional[str] = None
    guest_count: Optional[int] = None

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    tip: Optional[float] = None
    discount: Optional[float] = None
    notes: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_contact: Optional[str] = None

class OrderResponse(OrderBase):
    id: str
    order_number: int
    status: OrderStatus
    table_label: Optional[str] = None
    server_id: str
    server_name: Optional[str] = None
    items: List[OrderItemResponse] = []
    subtotal: float
    tax: float
    tip: float
    discount: float
    total: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Payment Schemas
class PaymentCreate(BaseModel):
    order_id: str
    method: PaymentMethod
    amount: float
    tip: float = 0
    cash_tendered: Optional[float] = None

class PaymentResponse(BaseModel):
    id: str
    order_id: str
    method: PaymentMethod
    amount: float
    tip: float
    status: str
    reference: Optional[str] = None
    cash_tendered: Optional[float] = None
    change_due: Optional[float] = None
    processed_by: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_name: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    metadata: dict = {}
    created_at: datetime
    
    class Config:
        from_attributes = True

# Analytics Schemas
class DailySummary(BaseModel):
    date: str
    total_revenue: float
    order_count: int
    average_order_value: float
    tip_total: float
    cash_payments: float
    card_payments: float
    dine_in_orders: int
    takeout_orders: int
    delivery_orders: int

class TopItem(BaseModel):
    name: str
    quantity: int
    revenue: float

# Printer Schemas
class PrinterCreate(BaseModel):
    name: str
    type: str = "receipt"
    connection_type: str = "network"
    address: str

class PrinterResponse(BaseModel):
    id: str
    name: str
    type: str
    connection_type: str
    address: str
    is_online: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class PrinterMappingUpdate(BaseModel):
    kitchen_printer_id: Optional[str] = None
    receipt_printer_id: Optional[str] = None
    bar_printer_id: Optional[str] = None

