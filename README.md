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