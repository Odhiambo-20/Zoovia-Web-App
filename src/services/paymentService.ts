// Payment service for handling Stripe API calls
export interface PaymentData {
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  description?: string;
}

export interface PaymentResponse {
  success: boolean;
  clientSecret?: string;
  error?: string;
}

export const createPaymentIntent = async (paymentData: PaymentData): Promise<PaymentResponse> => {
  try {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Payment failed'
      };
    }

    return {
      success: true,
      clientSecret: data.clientSecret
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error occurred'
    };
  }
};

export const confirmPayment = async (stripe: any, clientSecret: string, paymentMethod: any) => {
  try {
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethod
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message
      };
    }

    return {
      success: true,
      paymentIntent: result.paymentIntent
    };
  } catch (error) {
    return {
      success: false,
      error: 'Payment confirmation failed'
    };
  }
};