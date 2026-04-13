// Mock M-Pesa STK Push implementation
// In production, integrate with Daraja API

export interface STKPushRequest {
  phone: string;
  amount: number;
  reference: string;
  description: string;
}

export interface STKPushResponse {
  success: boolean;
  message: string;
  checkoutRequestId?: string;
  mpesaReceiptNumber?: string;
}

export async function initiateSTKPush(request: STKPushRequest): Promise<STKPushResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock success response
  return {
    success: true,
    message: 'STK push initiated successfully. Please enter your M-Pesa PIN to complete the payment.',
    checkoutRequestId: `ws_CO_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    mpesaReceiptNumber: `SJ${Date.now().toString().slice(-8)}`,
  };
}

export async function checkSTKPushStatus(checkoutRequestId: string): Promise<{ success: boolean; status: string }> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    success: true,
    status: 'Success',
  };
}
