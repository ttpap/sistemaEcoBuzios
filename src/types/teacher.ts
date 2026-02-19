export interface TeacherRegistration {
  id: string;
  fullName: string;
  cpf?: string;
  rg?: string;
  cnpj?: string;
  email: string;
  cellPhone: string;
  gender: 'Feminino' | 'Masculino' | 'Outro';
  photo?: string;

  // Endereço
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  uf: string;

  // Dados Bancários
  bank: string;
  agency: string;
  account: string;
  pixKey: string;

  registrationDate: string;
  status: 'Ativo' | 'Inativo';
}