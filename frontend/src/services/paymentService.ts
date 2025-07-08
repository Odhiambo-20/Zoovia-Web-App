// Payment service for handling Stripe Checkout Sessions
export interface PaymentData {
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  description?: string;
  cartItems: any[];
  shippingAddress?: any;
  billingAddress?: any;
}

export interface CheckoutResponse {
  success: boolean;
  sessionId?: string;
  sessionUrl?: string;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  status?: string;
  paymentStatus?: string;
  amount?: number;
  currency?: string;
  customerEmail?: string;
  error?: string;
}

// Get auth token from storage
const getAuthToken = () => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.warn('localStorage not available, using session storage');
    return sessionStorage.getItem('token');
  }
};

export const createCheckoutSession = async (paymentData: PaymentData): Promise<CheckoutResponse> => {
  try {
    const response = await fetch('http://localhost:3001/api/payments/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        ...paymentData,
        cartItems: paymentData.cartItems || []
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Checkout session error response:', errorData);
      throw new Error(errorData || 'Checkout session creation failed');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Checkout session creation failed');
    }

    return {
      success: true,
      sessionId: data.data.sessionId,
      sessionUrl: data.data.sessionUrl,
      orderId: data.data.orderId,
      orderNumber: data.data.orderNumber
    };
  } catch (error) {
    console.error('Checkout session error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
};

export const redirectToCheckout = async (paymentData: PaymentData): Promise<void> => {
  try {
    const result = await createCheckoutSession(paymentData);
    
    if (result.success && result.sessionUrl) {
      // Redirect to Stripe Checkout
      window.location.href = result.sessionUrl;
    } else {
      throw new Error(result.error || 'Failed to create checkout session');
    }
  } catch (error) {
    console.error('Redirect to checkout error:', error);
    throw error;
  }
};

export const verifyPayment = async (sessionId: string): Promise<PaymentVerificationResponse> => {
  try {
    const response = await fetch(`http://localhost:3001/api/payments/verify-session/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Payment verification error response:', errorData);
      throw new Error(errorData || 'Payment verification failed');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Payment verification failed');
    }

    return {
      success: true,
      orderId: data.data.orderId,
      orderNumber: data.data.orderNumber,
      status: data.data.status,
      paymentStatus: data.data.paymentStatus,
      amount: data.data.amount,
      currency: data.data.currency,
      customerEmail: data.data.customerEmail
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
};

export const getPaymentHistory = async (): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> => {
  try {
    const response = await fetch('http://localhost:3001/api/payments/history', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Payment history error response:', errorData);
      throw new Error(errorData || 'Failed to fetch payment history');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch payment history');
    }

    return {
      success: true,
      data: data.data
    };
  } catch (error) {
    console.error('Payment history error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
};

// Legacy function name for backward compatibility
export const createPaymentIntent = createCheckoutSession;

// Legacy function for backward compatibility
export const confirmPayment = async (stripe: any, clientSecret: string, paymentMethodId: string) => {
  console.warn('confirmPayment is deprecated when using Checkout Sessions. Use verifyPayment instead.');
  return {
    success: false,
    error: 'This method is not supported with Checkout Sessions'
  };
};