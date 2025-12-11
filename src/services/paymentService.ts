import { Payment, PaymentCreationAttributes } from "../models/Payment";
import { CreatePaymentDto, UpdatePaymentDto } from "../dtos/payment.dto";
import { ApiError } from "../utils/ApiError";

export const getAllPayments = async () => {
  return await Payment.findAll({ where: { active: true } });
};

export const getPaymentById = async (id: number) => {
  const payment = await Payment.findOne({ where: { id, active: true } });
  if (!payment) throw new ApiError("Payment not found", 404);
  return payment;
};

export const createPayment = async (data: CreatePaymentDto) => {
  const payload: PaymentCreationAttributes = {
    ...data,
    active: true,
  };
  return await Payment.create(payload);
};

export const updatePayment = async (id: number, data: UpdatePaymentDto) => {
  const payment = await Payment.findOne({ where: { id, active: true } });
  if (!payment) throw new ApiError("Payment not found", 404);
  await payment.update(data);
  return payment;
};

export const deletePayment = async (id: number) => {
  const payment = await Payment.findOne({ where: { id, active: true } });
  if (!payment) throw new ApiError("Payment not found", 404);
  await payment.update({ active: false });
  return { message: "Payment disabled successfully" };
};