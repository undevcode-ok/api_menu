export interface CreatePaymentDto {
  userId: number;          
  datePayments: string;
  endDatePayments: string;
  price: number;
}

export interface UpdatePaymentDto {
  userId?: number;
  datePayments?: string;
  endDatePayments?: string;
  price?: number;
}