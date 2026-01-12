# 🐉 Dragon Palace POS

A modern, beautiful Point of Sale system designed for Chinese restaurants. Built with React, TypeScript, and FastAPI.

![Dragon Palace POS](https://img.shields.io/badge/version-1.0.0-red)
![React](https://img.shields.io/badge/React-18.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green)

## ✨ Features

### 🍽️ Floor Plan Management
- **Interactive drag-and-drop table layout** - Configure your dining room to match your actual restaurant
- **Real-time table status** - Available, Occupied, Reserved, Cleaning
- **VIP sections and bar areas** - Organize tables by section
- **Click-to-order** - Start orders directly from tables

### 📋 Order Management
- **Dine-in, Takeout & Delivery** - Full support for all order types
- **Real-time order tracking** - Open, Sent, Preparing, Ready, Served, Paid
- **Kitchen ticket integration** - Send orders to kitchen with one click
- **Order modification history** - Track all changes

### 🥡 Menu System
- **Dim Sum, Lunch & Dinner categories** - Organize your authentic menu
- **Chinese character support** - Display names in both English and Chinese
- **Smart search** - Find items by name, description, or SKU
- **Quick filters** - Spicy, Vegetarian, Seafood, and more
- **Allergen tracking** - Keep customers safe

### 💳 Payment Processing
- **Cash handling** - Automatic change calculation
- **Credit/Debit cards** - Stripe Terminal integration ready
- **Split payments** - Multiple payment methods per order
- **Tip management** - Preset percentages or custom amounts
- **Gift cards** - Coming soon

### 👥 User Management
- **Role-based access** - Admin, Manager, Server, Cashier, Host
- **PIN authentication** - Fast and secure login
- **Granular permissions** - Control who can do what
- **Activity tracking** - Know who's working

### 📊 Analytics & Reports
- **Revenue tracking** - Daily, weekly, monthly insights
- **Order trends** - See what's selling
- **Payment breakdown** - Cash vs card analysis
- **Top items** - Best sellers at a glance

### 📜 Audit Logging
- **Complete activity history** - Every action is logged
- **User tracking** - Know who did what
- **Export functionality** - Download logs as CSV
- **Searchable** - Find specific actions quickly

### 🖨️ Printer Integration
- **Kitchen printers** - ESC/POS and network printers
- **Receipt printers** - Customer receipts on payment
- **Bar printers** - Separate drink tickets
- **Print routing** - Configure which printer gets what

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- npm or pnpm

### Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed the database
python -m app.seed

# Start the server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Default Login PINs

| Role | PIN | User |
|------|-----|------|
| Admin | 1234 | Michael Chen |
| Manager | 5678 | Sarah Wong |
| Server | 1111 | David Liu |
| Cashier | 3333 | Kevin Tan |

## 🏗️ Architecture

```
restaurantpos/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── store/             # Zustand state management
│   ├── types/             # TypeScript types
│   └── data/              # Sample data
├── backend/               # FastAPI backend
│   └── app/
│       ├── main.py        # API routes
│       ├── models.py      # SQLAlchemy models
│       ├── schemas.py     # Pydantic schemas
│       ├── auth.py        # Authentication
│       └── seed.py        # Database seeding
└── public/                # Static assets
```

## 🎨 Design System

The UI uses a custom design system with:
- **Dragon Red** - Primary brand color
- **Gold** - Accent and highlights
- **Jade Green** - Success states
- **Ink** - Dark mode backgrounds

Fonts:
- **Playfair Display** - Headings
- **DM Sans** - Body text
- **JetBrains Mono** - Numbers and codes

## 🔧 Configuration

### Tax Rate
Default tax rate is 8.25%. Change in Settings or via environment:

```env
TAX_RATE=0.0825
```

### Printer Setup
1. Go to Settings > Printers
2. Add your ESC/POS or network printer
3. Configure print routing

## 📱 Responsive Design

The POS is optimized for:
- **Tablets** - Primary use case (iPad, Android tablets)
- **Desktop** - Manager workstations
- **Large touchscreens** - Counter displays

## 🔒 Security

- PIN-based authentication
- JWT tokens with expiration
- Role-based permissions
- Audit logging of all actions
- Secure password hashing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

---

Built with ❤️ for Dragon Palace Restaurant
