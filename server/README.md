# Zoovio Backend API

A comprehensive backend API for the Zoovio Pet Store application with Neon PostgreSQL database integration.

## Features

- **User Authentication**: JWT-based authentication with secure session management
- **Payment Processing**: Stripe integration with webhook support
- **Order Management**: Complete order lifecycle management
- **Database Integration**: Neon PostgreSQL with optimized queries
- **Security**: Rate limiting, CORS, helmet, input validation
- **Audit Logging**: Comprehensive activity tracking
- **Error Handling**: Robust error handling and logging

## Database Schema

### Tables Created:
1. **users** - User account information
2. **orders** - Order details and status
3. **order_items** - Individual items in orders
4. **payments** - Payment transaction records
5. **user_sessions** - JWT session management
6. **audit_logs** - Activity and security logging

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile

### Payments (`/api/payments`)
- `POST /create-payment-intent` - Create Stripe payment intent
- `POST /confirm-payment` - Confirm payment completion
- `GET /history` - Get user payment history
- `POST /webhook` - Stripe webhook endpoint

### Orders (`/api/orders`)
- `GET /` - Get user orders
- `GET /:orderId` - Get specific order details
- `PATCH /:orderId/status` - Update order status

## Setup Instructions

### 1. Neon Database Setup

1. Create a Neon account at [https://neon.tech](https://neon.tech)
2. Create a new project and database
3. Copy your connection string
4. Run the SQL commands from `server/database/schema.sql` in your Neon console

### 2. Environment Variables

Update your `.env` file with the following:

```env
# Neon Database Configuration
DATABASE_URL=postgresql://username:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=7d

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Server Configuration
PORT=3001
NODE_ENV=development
VITE_APP_URL=http://localhost:5173
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Server

Development mode:
```bash
npm run server:dev
```

Production mode:
```bash
npm run server
```

## Database Schema Details

### Users Table
- Stores user registration and profile information
- Includes address fields for shipping/billing
- Password hashing with bcrypt
- Email uniqueness constraint

### Orders Table
- Complete order lifecycle tracking
- Status: pending, confirmed, processing, shipped, delivered, cancelled
- Payment status: pending, processing, succeeded, failed, cancelled, refunded
- Stores shipping and billing addresses as JSON

### Payments Table
- Stripe payment integration
- Stores card details (last 4 digits, brand)
- Payment method tracking
- Failure reason logging

### Security Features
- JWT token management with session tracking
- Password hashing with bcrypt (12 rounds)
- Rate limiting (100 requests per 15 minutes)
- Input validation with express-validator
- CORS protection
- Helmet security headers
- Audit logging for all important actions

## API Usage Examples

### Register User
```javascript
POST /api/auth/register
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "country": "USA",
  "postalCode": "10001"
}
```

### Create Payment Intent
```javascript
POST /api/payments/create-payment-intent
Authorization: Bearer <token>
{
  "amount": 1299.99,
  "currency": "usd",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "cartItems": [
    {
      "id": "dog-1",
      "name": "Golden Retriever",
      "category": "dog",
      "price": 1200,
      "quantity": 1
    }
  ]
}
```

## Error Handling

All API responses follow this format:

Success:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

Error:
```json
{
  "success": false,
  "error": "Error message",
  "details": [ ... ] // For validation errors
}
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive keys to version control
2. **Database**: Use connection pooling and prepared statements
3. **Authentication**: JWT tokens expire after 7 days
4. **Rate Limiting**: Prevents abuse and DDoS attacks
5. **Input Validation**: All inputs are validated and sanitized
6. **Audit Logging**: All important actions are logged with IP and user agent

## Deployment

For production deployment:
1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up SSL/TLS certificates
4. Configure proper logging
5. Set up monitoring and alerts
6. Use environment-specific database connections

## Monitoring

The API includes:
- Health check endpoint (`/health`)
- Comprehensive error logging
- Audit trail for all user actions
- Payment transaction tracking
- Session management logging