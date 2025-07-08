import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, Plus, Minus, ShoppingBag, CreditCard, Globe, X, AlertCircle } from 'lucide-react';
import { redirectToCheckout, PaymentData } from '../services/paymentService'; // Import payment service

// Exchange rates
const exchangeRates = {
  USD: 1.0,
  EUR: 0.85,
  GBP: 0.73,
  AUD: 1.35,
  CNY: 6.45,
  EGP: 30.25
};

const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CNY: '¥',
  EGP: 'E£'
};

const countryCurrencyMap = {
  US: 'USD',
  GB: 'GBP',
  AU: 'AUD',
  DE: 'EUR',
  FR: 'EUR',
  CN: 'CNY',
  EG: 'EGP'
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

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  image: string;
}

// Updated PaymentForm Component to use Stripe Checkout
const PaymentForm: React.FC<{
  customerInfo: any;
  selectedCurrency: string;
  cartItems: CartItem[];
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
  onClose: () => void;
}> = ({ customerInfo, selectedCurrency, cartItems, onPaymentSuccess, onPaymentError, onClose }) => {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const handleRealPayment = async () => {
    setIsProcessingPayment(true);
    setPaymentError('');

    const paymentData: PaymentData = {
      amount: customerInfo.amount,
      currency: selectedCurrency.toLowerCase(),
      customerName: customerInfo.fullName,
      customerEmail: customerInfo.email || '',
      cartItems: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
        image: item.image
      })),
    };

    try {
      await redirectToCheckout(paymentData);
      // Note: The actual payment will be handled by Stripe's redirect, so no success/failure here
      // Success and error handling will occur after redirect in your success/cancel URLs
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      setPaymentError(errorMessage);
      onPaymentError(errorMessage);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getCurrencySymbol = (currency: keyof typeof currencySymbols) => {
    return currencySymbols[currency] || currency;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
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
          <p className="text-center text-gray-600 mb-4">You will be redirected to Stripe to complete your payment securely.</p>
        </div>

        <button
          onClick={handleRealPayment}
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
              <span>Pay {getCurrencySymbol(selectedCurrency as keyof typeof currencySymbols)}{customerInfo.amount.toFixed(2)}</span>
            </>
          )}
        </button>
        
        <div className="text-center mt-4 text-xs text-gray-500">
          Secure Payment via Stripe
        </div>
      </div>
    </div>
  );
};

const Cart: React.FC = () => {
  const { cartItems, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'pending' | 'processing' | 'shipped' | 'delivered' | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  const [customerInfo, setCustomerInfo] = useState({
    fullName: '',
    email: '',
    amount: 0
  });

  const convertCurrency = (amount: number, currency: keyof typeof exchangeRates) => {
    const rate = exchangeRates[currency];
    return amount * rate;
  };

  const getCurrencySymbol = (currency: keyof typeof currencySymbols) => {
    return currencySymbols[currency] || currency;
  };

  useEffect(() => {
    const baseAmount = getTotalPrice() * 1.08;
    const convertedAmount = convertCurrency(baseAmount, selectedCurrency as keyof typeof exchangeRates);
    setCustomerInfo(prev => ({ ...prev, amount: convertedAmount }));
  }, [selectedCurrency, getTotalPrice]);

  const validateCustomerInfo = () => {
    const errors: { [key: string]: string } = {};

    if (!customerInfo.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (customerInfo.amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(id, newQuantity);
  };

  const handleCheckout = () => {
    setShowCheckout(true);
    setValidationErrors({});
    const baseAmount = getTotalPrice() * 1.08;
    const convertedAmount = convertCurrency(baseAmount, selectedCurrency as keyof typeof exchangeRates);
    setCustomerInfo(prev => ({ ...prev, amount: convertedAmount }));
  };

  const handleCurrencyChange = (countryCode: keyof typeof countryCurrencyMap) => {
    const currency = countryCurrencyMap[countryCode];
    setSelectedCurrency(currency);
  };

  const handlePayment = async () => {
    if (!validateCustomerInfo()) {
      console.error('Customer info validation failed');
      return;
    }

    setShowCardModal(true);
    setValidationErrors({});
  };

  const handlePaymentSuccess = () => {
    setOrderStatus('processing');
    setTimeout(() => {
      setOrderStatus('shipped');
      setTimeout(() => {
        setOrderStatus('delivered');
        clearCart();
        setShowCheckout(false);
        setShowCardModal(false);
        setCustomerInfo({ fullName: '', email: '', amount: 0 });
      }, 3000);
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <ShoppingBag className="h-24 w-24 text-gray-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Cart is Empty</h2>
            <p className="text-gray-600 mb-8">Start shopping to add some adorable pets to your cart!</p>
            <div className="flex justify-center space-x-4">
              <a href="/dogs" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                Browse Dogs
              </a>
              <a href="/cats" className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
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

        {orderStatus && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-green-800 mb-2">Order Status</h2>
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${
                orderStatus === 'processing' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <span className="text-green-700 font-medium">
                {orderStatus === 'processing' && 'Processing your order...'}
                {orderStatus === 'shipped' && 'Your order has been shipped!'}
                {orderStatus === 'delivered' && 'Order delivered successfully!'}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Cart Items</h2>
              <div className="space-y-4">
                {cartItems.map((item: CartItem) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-lg" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-gray-600">
                        {getCurrencySymbol(selectedCurrency as keyof typeof currencySymbols)}{convertCurrency(item.price, selectedCurrency as keyof typeof exchangeRates).toFixed(2)}
                      </p>
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
                        disabled={item.quantity <= 1}
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

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{getCurrencySymbol(selectedCurrency as keyof typeof currencySymbols)}{convertCurrency(getTotalPrice(), selectedCurrency as keyof typeof exchangeRates).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{getCurrencySymbol(selectedCurrency as keyof typeof currencySymbols)}{convertCurrency(getTotalPrice() * 0.08, selectedCurrency as keyof typeof exchangeRates).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{getCurrencySymbol(selectedCurrency as keyof typeof currencySymbols)}{convertCurrency(getTotalPrice() * 1.08, selectedCurrency as keyof typeof exchangeRates).toFixed(2)}</span>
                  </div>
                </div>
              </div>

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

        {showCheckout && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="mb-2">
                  <span className="text-gray-600">Choose currency</span>
                  <select 
                    className="ml-2 px-3 py-1 border rounded bg-white"
                    value={supportedRegions.find(r => countryCurrencyMap[r.code as keyof typeof countryCurrencyMap] === selectedCurrency)?.code || 'US'}
                    onChange={(e) => handleCurrencyChange(e.target.value as keyof typeof countryCurrencyMap)}
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
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your email"
                    />
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

        {showCardModal && (
          <PaymentForm
            customerInfo={customerInfo}
            selectedCurrency={selectedCurrency}
            cartItems={cartItems}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            onClose={() => setShowCardModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Cart;