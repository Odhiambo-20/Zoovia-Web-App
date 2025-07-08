# Zoovio Pet Store

A modern pet store web application built with React, TypeScript, and Tailwind CSS, featuring Stripe payment integration.

## Features

- **Pet Browsing**: Browse dogs, cats, and adoption pets
- **Shopping Cart**: Add pets to cart with quantity management
- **Multi-Currency Support**: Support for USD, EUR, GBP, AUD, CNY, and EGP
- **Stripe Payment Integration**: Secure payment processing with Stripe
- **User Authentication**: Login and registration system
- **Responsive Design**: Mobile-friendly interface
- **Order Tracking**: Monitor order status from processing to delivery

## Supported Regions

- 🇺🇸 United States (USD)
- 🇬🇧 United Kingdom (GBP)
- 🇦🇺 Australia (AUD)
- 🇩🇪 Germany (EUR)
- 🇫🇷 France (EUR)
- 🇨🇳 China (CNY)
- 🇪🇬 Egypt (EGP)

## Payment Restrictions

- One card per transaction
- Cards from Arab & African regions not accepted (except Egypt)
- No maximum transaction limit
- All major credit cards supported

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with your Stripe keys:

```env
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here

# Application Configuration
VITE_APP_URL=http://localhost:5173
```

### 2. Get Stripe API Keys

1. Create a Stripe account at [https://stripe.com](https://stripe.com)
2. Go to the Stripe Dashboard
3. Navigate to Developers > API keys
4. Copy your Publishable key and Secret key
5. Replace the placeholder values in your `.env` file

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

## Payment Integration

The application uses Stripe for secure payment processing:

- **Frontend**: Uses `@stripe/stripe-js` for client-side payment handling
- **Backend**: Requires a backend API to create payment intents (see `src/server/api.ts` for reference)
- **Security**: All sensitive operations are handled server-side
- **Validation**: Comprehensive form validation with error handling

## Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React context providers
├── pages/              # Page components
├── services/           # API service functions
├── utils/              # Utility functions
└── server/             # Backend API reference
```

## Key Components

- **Cart**: Shopping cart with Stripe payment integration
- **Header**: Navigation with cart counter
- **AuthContext**: User authentication management
- **CartContext**: Shopping cart state management
- **PaymentService**: Stripe API integration

## Development Notes

- All images are sourced from Pexels (no AI-generated content)
- Responsive design with Tailwind CSS
- TypeScript for type safety
- Modular component architecture
- Error handling and validation throughout

## Deployment

The application is deployed on Netlify and can be accessed at the provided deployment URL.

For production deployment:
1. Set up your production Stripe keys
2. Configure your backend API endpoints
3. Update environment variables for production
4. Deploy to your preferred hosting platform

## Support

For technical support or questions about the payment integration, please refer to the Stripe documentation or contact the development team.

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