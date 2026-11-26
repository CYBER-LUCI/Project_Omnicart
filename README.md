# 🛒 OmniCart — Next-Gen AI Visual Search & Multi-Vendor E-Commerce Platform

**OmniCart** is a full-stack, production-grade **multi-vendor e-commerce powerhouse** engineered with **AI-powered Visual Similarity Search**, a **Real-Time 4-Factor Dynamic Pricing Engine**, **ACID-compliant transactional checkout**, and **isolated multi-seller fulfillment**.

Built to bridge enterprise relational database engineering with modern deep-learning microservices, OmniCart delivers a seamless, luxury shopping experience from instant camera-to-catalog discovery down to 20-minute express hub dispatch.

---

## ✨ Standout Features

- **🧠 AI Visual Search Microservice (CLIP ViT-B-32 + MobileNetV3):** Upload any product photo or snap a live camera image to instantly find visually similar items in the catalog using deep vector embeddings and cosine similarity.
- **⚡ 4-Factor Dynamic Pricing Engine:** Automatically evaluates **Demand Velocity**, **Multi-Seller Stock Scarcity**, **Time-of-Day Windows**, and **Seller Guardrails** (min floor / max ceiling) with an anti-thrashing hysteresis noise filter and an **append-only immutable `PriceLedger`**.
- **🏬 True Multi-Seller Marketplace & Isolated Fulfillment:** Customers can order products from multiple independent stores in a single checkout. Each merchant manages and delivers only their own storefront items independently without affecting other sellers in the same order.
- **🔒 ACID Transactional Checkout & Pessimistic Locking:** Prevents overselling and race conditions with row-level database locks, exact historical price-locking in `OrderDetails`, and atomic stock restoration on item/order cancellation.
- **💳 Flexible Payments & Verified Reviews:** Supports **Razorpay** online checkout and **Cash on Delivery (COD)**, plus verified-purchase-only product reviews unlocked upon item delivery.
- **🗄️ Enterprise MySQL Architecture:** Powered by normalized tables, composite indexes, analytical views, custom SQL functions, stored procedures, and integrity triggers.
- **🎨 Luxury Dual-Theme Storefront:** Responsive Light & Dark mode UI with live cart, wishlist, order tracking timeline, PDF invoice export, and dedicated Merchant Partner Dashboard.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Port |
| :--- | :--- | :--- |
| **Frontend Storefront** | HTML5, Tailwind CSS, Vanilla JS (Modular SPA-style architecture) | `3000` |
| **Core Backend API** | Java 17+, Spring Boot 3.3.4, Spring Security, JWT, Spring Data JPA, Swagger/OpenAPI | `8080` |
| **Visual Search AI** | Python 3.10+, Flask, OpenAI CLIP (`ViT-B-32`), MobileNetV3, NumPy | `5000` |
| **Relational Database** | MySQL 8.0+ (`OmniCartDB`) | `3306` |

---

## 🚀 How to Start (Quick & Easy)

### Prerequisites
Make sure you have the following installed and running:
- **MySQL 8.0+** (running on port `3306`)
- **Java 17+** (JDK 17–23)
- **Python 3.10+** (with dependencies from `Visual Search/requirements.txt`)

---

### Option 1: One-Click Launcher (Recommended)

From the project root, simply run:

- **Command Prompt (`cmd`):**
  ```cmd
  start-all.bat
  ```
- **PowerShell:**
  ```powershell
  .\start-all.ps1
  ```

This automatically starts the **Spring Boot Backend (`8080`)**, **Visual Search AI (`5000`)**, and **Frontend Server (`3000`)**, then opens **`http://localhost:3000`** in your browser!

---

### Option 2: Manual Step-by-Step Startup

#### 1️⃣ Initialize the Database (First Time Setup)
Run the automated database initializer or execute the SQL scripts in order:
```powershell
.\init-db.ps1
```
*(Or manually source `01_schema.sql` → `02_indexes.sql` → `04_functions.sql` → `03_views.sql` → `05_procedures.sql` → `06_triggers.sql` → `07_seed_data.sql` from `omnicart_db/`).*

Default DB config in `omnicart-backend/src/main/resources/application.yml`:
- **Database:** `OmniCartDB`
- **Username:** `root` | **Password:** `root` *(override via `DB_USERNAME` / `DB_PASSWORD` env vars)*

#### 2️⃣ Start the Spring Boot Backend (Port `8080`)
```powershell
cd omnicart-backend
.\mvnw.cmd spring-boot:run
```
- **API Base URL:** `http://localhost:8080/api`
- **Swagger UI Docs:** `http://localhost:8080/swagger-ui.html`

#### 3️⃣ Start the Visual Search AI Service (Port `5000`)
Open a second terminal:
```powershell
cd "Visual Search"
pip install -r requirements.txt
python app.py
```
- **Health Check:** `http://127.0.0.1:5000/api/health`
- **Visual Search API:** `http://127.0.0.1:5000/api/search/visual`

#### 4️⃣ Start the Frontend Storefront (Port `3000`)
Open a third terminal:
```powershell
cd omnicart-frontend
python server.py 3000
```
Open your browser and visit:
```text
http://localhost:3000
```

---

## 📁 Project Structure

```text
Project_Omnicart/
├── omnicart-backend/     # Spring Boot 3 REST API, Security, JPA, Dynamic Pricing & Order Engine
├── omnicart-frontend/    # Storefront UI, Cart, Checkout, Order Tracking & Seller Dashboard
├── Visual Search/        # Python Flask AI Visual Search service (CLIP + MobileNetV3)
├── omnicart_db/          # MySQL schema, indexes, views, functions, procedures, triggers & seed data
├── init-db.ps1           # One-command MySQL database setup script
├── start-all.bat         # Windows Batch one-click launcher
├── start-all.ps1         # PowerShell one-click launcher
└── README.md             # Project documentation & setup guide
```

---

## 🔑 Demo Accounts

| Role | Email / Identifier | Password / Notes |
| :--- | :--- | :--- |
| **System Admin** | `admin@omnicart.com` | `OmniCart@2026` |
| **Merchant / Seller** | `seller@omnicart.com` | `password123` (GSTIN: `29ABCDE1234F1Z5`) |
| **Buyer / Customer** | `ritikk88@gmail.com` | Or register a new customer account via UI |
