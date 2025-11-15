# Paati's Pantry - E-commerce Website

A complete e-commerce website for organic health mix and snacks business with CRUD operations, database storage, and UPI payment integration.

## Features

- ✅ Product catalog with images
- ✅ Shopping cart functionality
- ✅ Customer details form (name, address, mobile, email)
- ✅ Multiple payment options (Cash, UPI, Card, Bank Transfer)
- ✅ UPI QR code generation for payments
- ✅ Sales tracking (daily and monthly)
- ✅ CRUD operations for products, customers, and orders
- ✅ Database storage (SQLite)
- ✅ Admin dashboard to view orders and customer addresses
- ✅ Fully responsive (desktop and mobile)

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

3. **Access the Website**
   - Open your browser and go to: `http://localhost:3000`
   - The database will be automatically created on first run

## Configuration

### UPI Payment Setup

To use your own UPI ID for QR code generation, edit `server.js` and update the default UPI ID:

```javascript
const defaultUpiId = 'your-upi-id@paytm'; // Change this to your actual UPI ID
```

## Database

The application uses SQLite database (`paatis_pantry.db`) which is automatically created when you first run the server.

### Database Tables

1. **products** - Stores product information
2. **customers** - Stores customer details and addresses
3. **orders** - Stores order information with customer references

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/:id` - Get single customer
- `POST /api/customers` - Create/Update customer (by mobile)
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Sales
- `GET /api/sales/stats` - Get sales statistics
- `GET /api/sales/daily` - Get daily sales breakdown

### UPI
- `POST /api/upi/qrcode` - Generate UPI QR code

## Usage

1. **Browse Products**: Click on products to add them to cart
2. **Manage Cart**: Use the cart icon to view, update, or clear items
3. **Checkout**: Fill in customer details and select payment method
4. **UPI Payment**: When UPI is selected, a QR code will be generated automatically
5. **View Sales**: Click the 📊 button (bottom-right) to view sales dashboard
6. **View Orders & Customers**: Access from the sales dashboard

## File Structure

```
Website/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── script.js           # Frontend JavaScript
├── server.js           # Backend server (Node.js/Express)
├── package.json        # Node.js dependencies
├── paatis_pantry.db    # SQLite database (created automatically)
├── logo.jpg            # Logo image
├── product.jpg         # Product images
├── product 1.jpg
├── product 2.jpg
├── about.jpg           # About section image
├── contact.jpg         # Contact section image
└── README.md           # This file
```

## Notes

- All customer addresses are stored in the database and can be viewed later
- Sales data is calculated automatically from orders
- The database persists data between server restarts
- The application is fully responsive and works on mobile devices

## Troubleshooting

- **Port already in use**: Change the PORT in `server.js` or stop the process using port 3000
- **Database errors**: Delete `paatis_pantry.db` and restart the server to recreate it
- **UPI QR not showing**: Check that the server is running and the API endpoint is accessible

## License

ISC

