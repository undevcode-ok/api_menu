export interface CreateUserDto {
  name: string;
  lastName: string;
  email: string;
  cel?: string | null;
  roleId: number;
}

export interface UpdateUserDto {
  name?: string;
  lastName?: string;
  email?: string;
  cel?: string;
  roleId?: number;
  password?: string;       // <- opcional para cambiar clave
}

export interface RegisterFreeUserDto {
  name: string;
  lastName: string;
  email: string;
  cel?: string | null;
  password: string;
  confirmationPassword: string;
}
