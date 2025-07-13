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

// Get the API base URL based on environment
const getApiBaseUrl = (): string => {
  // Use environment variable in production
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL || 'https://zoovia-web-app-6.onrender.com';
  }
  
  // In development, use environment variable or default local URL
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

// Get auth token from storage with proper error handling
const getAuthToken = (): string => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      throw new Error('Authentication required - Please login again');
    }
    return token;
  } catch (error) {
    console.error('Token retrieval error:', error);
    throw new Error('Failed to retrieve authentication token');
  }
};

// Enhanced fetch wrapper with common headers and error handling
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const apiBaseUrl = getApiBaseUrl();
  const url = `${apiBaseUrl}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAuthToken()}`,
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        url,
        errorData
      });

      throw new Error(
        errorData?.message || 
        errorData?.error || 
        response.statusText || 
        `Request failed with status ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error('Network Error:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

export const createCheckoutSession = async (paymentData: PaymentData): Promise<CheckoutResponse> => {
  try {
    const data = await apiFetch('/api/payments/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({
        ...paymentData,
        cartItems: paymentData.cartItems || []
      }),
    });

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
    const data = await apiFetch(`/api/payments/verify-session/${sessionId}`);

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
    const data = await apiFetch('/api/payments/history');
    
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

export const testApiConnection = async (): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> => {
  try {
    const data = await apiFetch('/api/payments/test-stripe');
    
    return {
      success: true,
      url: getApiBaseUrl(),
      ...data
    };
  } catch (error) {
    console.error('API connection test error:', error);
    return {
      success: false,
      url: getApiBaseUrl(),
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
};

// Debug function to log current configuration
export const debugConfiguration = () => {
  console.log('Payment Service Configuration:', {
    isProd: import.meta.env.PROD,
    apiBaseUrl: getApiBaseUrl(),
    viteApiUrl: import.meta.env.VITE_API_URL,
    viteAppUrl: import.meta.env.VITE_APP_URL,
    hasToken: !!getAuthToken()
  });
};

// Legacy functions for backward compatibility
export const createPaymentIntent = createCheckoutSession;

export const confirmPayment = async () => {
  console.warn('confirmPayment is deprecated when using Checkout Sessions. Use verifyPayment instead.');
  return {
    success: false,
    error: 'This method is not supported with Checkout Sessions'
  };
};
