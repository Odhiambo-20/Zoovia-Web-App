import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ShoppingBag, CreditCard, Globe, X, AlertCircle } from 'lucide-react';
import stripePromise from '../utils/stripe';
import { createPaymentIntent, confirmPayment, PaymentData } from '../services/paymentService';

// Exchange rates (in a real app, these would come from an API)
const exchangeRates = {
  USD: 1.0,
  EUR: 0.85,    // Euro (for Germany, France)
  GBP: 0.73,    // British Pound
  AUD: 1.35,    // Australian Dollar
  CNY: 6.45,    // Chinese Yuan
  EGP: 30.25    // Egyptian Pound
};

// Currency symbols
const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CNY: '¥',
  EGP: 'E£'
};

// Map country codes to currencies
const countryCurrencyMap = {
  US: 'USD',
  GB: 'GBP',
  AU: 'AUD',
  DE: 'EUR',
  FR: 'EUR',
  CN: 'CNY',
  EG: 'EGP'
};

const Cart: React.FC = () => {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'pending' | 'processing' | 'shipped' | 'delivered' | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // Customer information state
  const [customerInfo, setCustomerInfo] = useState({
    fullName: '',
    email: '',
    amount: 0
  });

  // Card information state
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });

  // Convert amount to selected currency
  const convertCurrency = (amount: number, currency: string) => {
    const rate = exchangeRates[currency as keyof typeof exchangeRates];
    return amount * rate;
  };

  // Get currency symbol
  const getCurrencySymbol = (currency: string) => {
    return currencySymbols[currency as keyof typeof currencySymbols] || currency;
  };

  // Update amount when currency changes
  useEffect(() => {
    const baseAmount = getTotalPrice() * 1.08; // Include tax
    const convertedAmount = convertCurrency(baseAmount, selectedCurrency);
    setCustomerInfo(prev => ({ ...prev, amount: convertedAmount }));
  }, [selectedCurrency, getTotalPrice]);

  // Validation functions
  const validateCustomerInfo = () => {
    const errors: {[key: string]: string} = {};
    
    if (!customerInfo.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (customerInfo.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    }
    
    if (!customerInfo.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (customerInfo.amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCardInfo = () => {
    const errors: {[key: string]: string} = {};
    
    if (!cardInfo.cardNumber.replace(/\s/g, '')) {
      errors.cardNumber = 'Card number is required';
    } else if (cardInfo.cardNumber.replace(/\s/g, '').length < 13) {
      errors.cardNumber = 'Please enter a valid card number';
    }
    
    if (!cardInfo.expiryDate) {
      errors.expiryDate = 'Expiry date is required';
    } else if (!/^\d{2}\/\d{2}$/.test(cardInfo.expiryDate)) {
      errors.expiryDate = 'Please enter date in MM/YY format';
    }
    
    if (!cardInfo.cvv) {
      errors.cvv = 'CVV is required';
    } else if (cardInfo.cvv.length < 3) {
      errors.cvv = 'CVV must be at least 3 digits';
    }
    
    if (!cardInfo.cardholderName.trim()) {
      errors.cardholderName = 'Cardholder name is required';
    }
    
    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const handleQuantityChange = (id: string, newQuantity: number) => {
    updateQuantity(id, newQuantity);
  };

  const handleCheckout = () => {
    setShowCheckout(true);
    setValidationErrors({});
    setPaymentError('');
    const baseAmount = getTotalPrice() * 1.08;
    const convertedAmount = convertCurrency(baseAmount, selectedCurrency);
    setCustomerInfo(prev => ({ ...prev, amount: convertedAmount }));
  };

  const handleCurrencyChange = (countryCode: string) => {
    const currency = countryCurrencyMap[countryCode as keyof typeof countryCurrencyMap];
    setSelectedCurrency(currency);
  };

  const handlePayment = () => {
    if (!validateCustomerInfo()) {
      return;
    }
    setShowCardModal(true);
    setValidationErrors({});
  };

  const handleStripePayment = async () => {
    if (!validateCardInfo()) {
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError('');

    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Prepare payment data
      const paymentData: PaymentData = {
        amount: Math.round(customerInfo.amount * 100), // Convert to cents
        currency: selectedCurrency.toLowerCase(),
        customerName: customerInfo.fullName,
        customerEmail: customerInfo.email,
        description: `Zoovio Pet Store - ${cartItems.length} items`
      };

      // Create payment intent
      const paymentResponse = await createPaymentIntent(paymentData);
      
      if (!paymentResponse.success || !paymentResponse.clientSecret) {
        throw new Error(paymentResponse.error || 'Failed to create payment intent');
      }

      // Create payment method
      const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: {
          number: cardInfo.cardNumber.replace(/\s/g, ''),
          exp_month: parseInt(cardInfo.expiryDate.split('/')[0]),
          exp_year: parseInt('20' + cardInfo.expiryDate.split('/')[1]),
          cvc: cardInfo.cvv,
        },
        billing_details: {
          name: cardInfo.cardholderName,
          email: customerInfo.email,
        },
      });

      if (paymentMethodError) {
        throw new Error(paymentMethodError.message);
      }

      // Confirm payment
      const confirmResult = await confirmPayment(stripe, paymentResponse.clientSecret, paymentMethod);
      
      if (!confirmResult.success) {
        throw new Error(confirmResult.error || 'Payment confirmation failed');
      }

      // Payment successful
      setOrderStatus('processing');
      setTimeout(() => {
        setOrderStatus('shipped');
        setTimeout(() => {
          setOrderStatus('delivered');
        }, 3000);
      }, 2000);
      
      clearCart();
      setShowCheckout(false);
      setShowCardModal(false);
      
      // Reset form data
      setCustomerInfo({ fullName: '', email: '', amount: 0 });
      setCardInfo({ cardNumber: '', expiryDate: '', cvv: '', cardholderName: '' });

    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // Format expiry date
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const supportedRegions = [
    { code: 'US', name: 'United States', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'CN', name: 'China', flag: '🇨🇳' },
    { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  ];

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <ShoppingBag className="h-24 w-24 text-gray-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Cart is Empty</h2>
            <p className="text-gray-600 mb-8">Start shopping to add some adorable pets to your cart!</p>
            <div className="flex justify-center space-x-4">
              <a
                href="/dogs"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Browse Dogs
              </a>
              <a
                href="/cats"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Browse Cats
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        {/* Order Status */}
        {orderStatus && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-green-800 mb-2">Order Status</h2>
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${orderStatus === 'processing' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
              <span className="text-green-700 font-medium">
                {orderStatus === 'processing' && 'Processing your order...'}
                {orderStatus === 'shipped' && 'Your order has been shipped!'}
                {orderStatus === 'delivered' && 'Order delivered successfully!'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Cart Items</h2>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-gray-600">{getCurrencySymbol(selectedCurrency)}{convertCurrency(item.price, selectedCurrency).toFixed(2)}</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        item.category === 'dog' ? 'bg-blue-100 text-blue-800' :
                        item.category === 'cat' ? 'bg-purple-100 text-purple-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{getCurrencySymbol(selectedCurrency)}{convertCurrency(getTotalPrice(), selectedCurrency).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{getCurrencySymbol(selectedCurrency)}{convertCurrency(getTotalPrice() * 0.08, selectedCurrency).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{getCurrencySymbol(selectedCurrency)}{convertCurrency(getTotalPrice() * 1.08, selectedCurrency).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Supported Regions */}
              <div className="mb-4">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  Supported Regions
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {supportedRegions.map((region) => (
                    <div key={region.code} className="flex items-center space-x-2">
                      <span>{region.flag}</span>
                      <span>{region.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                <CreditCard className="h-5 w-5" />
                <span>Proceed to Checkout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Customer Information Modal */}
        {showCheckout && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="mb-2">
                  <span className="text-gray-600">Choose currency</span>
                  <select 
                    className="ml-2 px-3 py-1 border rounded bg-white"
                    value={supportedRegions.find(r => countryCurrencyMap[r.code as keyof typeof countryCurrencyMap] === selectedCurrency)?.code || 'US'}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                  >
                    {supportedRegions.map((region) => (
                      <option key={region.code} value={region.code}>
                        {region.code} - {region.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-4xl font-bold text-gray-800 mb-1">
                  {selectedCurrency} {customerInfo.amount.toFixed(2)}
                </div>
                <div className="text-gray-600 text-sm">SERVICE RENDERED</div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerInfo.fullName}
                      onChange={(e) => setCustomerInfo({...customerInfo, fullName: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {validationErrors.fullName && (
                      <div className="flex items-center mt-1 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.fullName}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email"
                    />
                    {validationErrors.email && (
                      <div className="flex items-center mt-1 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.email}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={customerInfo.amount.toFixed(2)}
                      onChange={(e) => setCustomerInfo({...customerInfo, amount: parseFloat(e.target.value) || 0})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.amount ? 'border-red-500' : 'border-gray-300'
                      }`}
                      step="0.01"
                      readOnly
                    />
                    {validationErrors.amount && (
                      <div className="flex items-center mt-1 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.amount}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                >
                  Pay {selectedCurrency} {customerInfo.amount.toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Card Payment Modal */}
        {showCardModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
              <button
                onClick={() => setShowCardModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                disabled={isProcessingPayment}
              >
                <X className="h-6 w-6" />
              </button>

              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-black text-white px-2 py-1 rounded text-sm font-bold mr-4">
                    Zoovio
                  </div>
                  <div className="text-right">
                    <div className="text-blue-600 text-sm">{customerInfo.email}</div>
                    <div className="flex items-center">
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs mr-2">{selectedCurrency}</span>
                      <span className="font-bold">{customerInfo.amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {paymentError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-700 text-sm">{paymentError}</span>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="border-b border-gray-200 mb-4">
                  <button className="px-4 py-2 text-blue-600 border-b-2 border-blue-600 font-semibold">
                    💳 Card
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CARDHOLDER NAME <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cardInfo.cardholderName}
                      onChange={(e) => setCardInfo({...cardInfo, cardholderName: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        validationErrors.cardholderName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="John Doe"
                      disabled={isProcessingPayment}
                    />
                    {validationErrors.cardholderName && (
                      <div className="flex items-center mt-1 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.cardholderName}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CARD NUMBER <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardInfo.cardNumber}
                        onChange={(e) => setCardInfo({...cardInfo, cardNumber: formatCardNumber(e.target.value)})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          validationErrors.cardNumber ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        disabled={isProcessingPayment}
                      />
                      <div className="absolute right-3 top-2.5">
                        <div className="w-6 h-4 bg-blue-600 rounded-sm"></div>
                      </div>
                    </div>
                    {validationErrors.cardNumber && (
                      <div className="flex items-center mt-1 text-red-600 text-sm">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {validationErrors.cardNumber}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        EXPIRY DATE <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cardInfo.expiryDate}
                        onChange={(e) => setCardInfo({...cardInfo, expiryDate: formatExpiryDate(e.target.value)})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          validationErrors.expiryDate ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="MM/YY"
                        maxLength={5}
                        disabled={isProcessingPayment}
                      />
                      {validationErrors.expiryDate && (
                        <div className="flex items-center mt-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {validationErrors.expiryDate}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVV <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={cardInfo.cvv}
                        onChange={(e) => setCardInfo({...cardInfo, cvv: e.target.value.replace(/\D/g, '')})}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          validationErrors.cvv ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="000"
                        maxLength={4}
                        disabled={isProcessingPayment}
                      />
                      {validationErrors.cvv && (
                        <div className="flex items-center mt-1 text-red-600 text-sm">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {validationErrors.cvv}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStripePayment}
                disabled={isProcessingPayment}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
              >
                {isProcessingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>Pay {getCurrencySymbol(selectedCurrency)}{customerInfo.amount.toFixed(2)}</span>
                  </>
                )}
              </button>
              
              <div className="text-center mt-4 text-xs text-gray-500">
                Secured by Stripe
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;