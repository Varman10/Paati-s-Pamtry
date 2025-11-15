const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const QRCode = require('qrcode');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

// Initialize Database
const db = new sqlite3.Database('./paatis_pantry.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize Database Tables
function initializeDatabase() {
    // Products table
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        image TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating products table:', err.message);
        } else {
            // Insert default products if table is empty
            db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
                if (row.count === 0) {
                    insertDefaultProducts();
                }
            });
        }
    });

    // Customers table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating customers table:', err.message);
        }
    });

    // Orders table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        order_date DATE NOT NULL,
        order_time TIME NOT NULL,
        payment_method TEXT NOT NULL,
        total_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        items TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    )`, (err) => {
        if (err) {
            console.error('Error creating orders table:', err.message);
        }
    });
}

// Insert Default Products
function insertDefaultProducts() {
    const defaultProducts = [
        { name: 'Organic Health Mix', price: 299, image: 'product.jpg', description: 'Premium organic health mix' },
        { name: 'Organic Snacks Pack 1', price: 199, image: 'product 1.jpg', description: 'Delicious organic snacks' },
        { name: 'Organic Snacks Pack 2', price: 249, image: 'product 2.jpg', description: 'Premium organic snacks' }
    ];

    const stmt = db.prepare('INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)');
    defaultProducts.forEach(product => {
        stmt.run(product.name, product.price, product.image, product.description);
    });
    stmt.finalize();
    console.log('Default products inserted');
}

// ========== PRODUCTS CRUD ==========

// Get all products
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products ORDER BY id', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single product
app.get('/api/products/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.json(row);
    });
});

// Create product
app.post('/api/products', (req, res) => {
    const { name, price, image, description } = req.body;
    if (!name || !price) {
        res.status(400).json({ error: 'Name and price are required' });
        return;
    }
    db.run('INSERT INTO products (name, price, image, description) VALUES (?, ?, ?, ?)',
        [name, price, image || '', description || ''], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, name, price, image, description });
    });
});

// Update product
app.put('/api/products/:id', (req, res) => {
    const id = req.params.id;
    const { name, price, image, description } = req.body;
    db.run('UPDATE products SET name = ?, price = ?, image = ?, description = ? WHERE id = ?',
        [name, price, image, description, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.json({ message: 'Product updated successfully', id });
    });
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Product not found' });
            return;
        }
        res.json({ message: 'Product deleted successfully' });
    });
});

// ========== CUSTOMERS CRUD ==========

// Get all customers
app.get('/api/customers', (req, res) => {
    db.all('SELECT * FROM customers ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single customer
app.get('/api/customers/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM customers WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        res.json(row);
    });
});

// Create/Update customer (upsert by mobile)
app.post('/api/customers', (req, res) => {
    const { name, mobile, email, address } = req.body;
    if (!name || !mobile || !email || !address) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }
    
    // Check if customer exists
    db.get('SELECT * FROM customers WHERE mobile = ?', [mobile], (err, existing) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (existing) {
            // Update existing customer
            db.run('UPDATE customers SET name = ?, email = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE mobile = ?',
                [name, email, address, mobile], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ id: existing.id, name, mobile, email, address, message: 'Customer updated' });
            });
        } else {
            // Create new customer
            db.run('INSERT INTO customers (name, mobile, email, address) VALUES (?, ?, ?, ?)',
                [name, mobile, email, address], function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ id: this.lastID, name, mobile, email, address, message: 'Customer created' });
            });
        }
    });
});

// Update customer
app.put('/api/customers/:id', (req, res) => {
    const id = req.params.id;
    const { name, mobile, email, address } = req.body;
    db.run('UPDATE customers SET name = ?, mobile = ?, email = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, mobile, email, address, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        res.json({ message: 'Customer updated successfully', id });
    });
});

// Delete customer
app.delete('/api/customers/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM customers WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }
        res.json({ message: 'Customer deleted successfully' });
    });
});

// ========== ORDERS CRUD ==========

// Get all orders
app.get('/api/orders', (req, res) => {
    db.all(`SELECT o.*, c.name as customer_name, c.mobile, c.email, c.address 
            FROM orders o 
            LEFT JOIN customers c ON o.customer_id = c.id 
            ORDER BY o.created_at DESC`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single order
app.get('/api/orders/:id', (req, res) => {
    const id = req.params.id;
    db.get(`SELECT o.*, c.name as customer_name, c.mobile, c.email, c.address 
            FROM orders o 
            LEFT JOIN customers c ON o.customer_id = c.id 
            WHERE o.id = ?`, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        res.json(row);
    });
});

// Create order
app.post('/api/orders', (req, res) => {
    const { customer_id, order_date, order_time, payment_method, total_amount, items, status } = req.body;
    if (!order_date || !order_time || !payment_method || !total_amount || !items) {
        res.status(400).json({ error: 'Required fields missing' });
        return;
    }
    
    db.run('INSERT INTO orders (customer_id, order_date, order_time, payment_method, total_amount, items, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [customer_id, order_date, order_time, payment_method, total_amount, JSON.stringify(items), status || 'pending'],
        function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'Order created successfully' });
    });
});

// Update order
app.put('/api/orders/:id', (req, res) => {
    const id = req.params.id;
    const { status, payment_method } = req.body;
    const updates = [];
    const values = [];
    
    if (status) {
        updates.push('status = ?');
        values.push(status);
    }
    if (payment_method) {
        updates.push('payment_method = ?');
        values.push(payment_method);
    }
    
    if (updates.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
    }
    
    values.push(id);
    db.run(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, values, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        res.json({ message: 'Order updated successfully', id });
    });
});

// Delete order
app.delete('/api/orders/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM orders WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        res.json({ message: 'Order deleted successfully' });
    });
});

// ========== SALES STATISTICS ==========

// Get sales statistics
app.get('/api/sales/stats', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().substring(0, 7);
    
    // Today's sales
    db.get(`SELECT COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as total 
            FROM orders WHERE order_date = ?`, [today], (err, todayStats) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Monthly sales
        db.get(`SELECT COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as total 
                FROM orders WHERE order_date LIKE ?`, [`${currentMonth}%`], (err, monthStats) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Total orders
            db.get(`SELECT COUNT(*) as total FROM orders`, (err, totalOrders) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                res.json({
                    today: {
                        orders: todayStats.orders,
                        total: todayStats.total
                    },
                    monthly: {
                        orders: monthStats.orders,
                        total: monthStats.total
                    },
                    totalOrders: totalOrders.total
                });
            });
        });
    });
});

// Get daily sales breakdown
app.get('/api/sales/daily', (req, res) => {
    db.all(`SELECT order_date as date, COUNT(*) as orders, COALESCE(SUM(total_amount), 0) as total 
            FROM orders 
            GROUP BY order_date 
            ORDER BY order_date DESC`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// ========== UPI QR CODE ==========

// Generate UPI QR Code
app.post('/api/upi/qrcode', async (req, res) => {
    const { upiId, amount, name, transactionNote } = req.body;
    
    // Default UPI ID (you can change this)
    const defaultUpiId = 'paatispantry@paytm'; // Change this to your actual UPI ID
    const upi = upiId || defaultUpiId;
    const amt = amount || '';
    const merchantName = name || 'Paati\'s Pantry';
    const note = transactionNote || 'Order Payment';
    
    // UPI payment URL format: upi://pay?pa=<UPI_ID>&pn=<MERCHANT_NAME>&am=<AMOUNT>&cu=INR&tn=<NOTE>
    let upiUrl = `upi://pay?pa=${upi}&pn=${encodeURIComponent(merchantName)}&cu=INR&tn=${encodeURIComponent(note)}`;
    if (amt) {
        upiUrl += `&am=${amt}`;
    }
    
    try {
        const qrCodeDataURL = await QRCode.toDataURL(upiUrl, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        res.json({ qrCode: qrCodeDataURL, upiUrl, upiId: upi });
    } catch (err) {
        res.status(500).json({ error: 'Failed to generate QR code', message: err.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed');
        process.exit(0);
    });
});

