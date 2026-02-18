export interface StudentRegistration {
  // 1. Dados Gerais
  fullName: string;
  socialName?: string;
  preferredName?: string;
  email?: string;
  cpf?: string;
  rg?: string;
  birthDate: string;
  age: string;
  phone: string;
  cellPhone: string;
  gender: string;
  genderOther?: string;
  race: string;

  // 2. Responsável
  guardianName?: string;
  guardianKinship?: string;
  guardianPhone?: string;

  // 3. Escola
  schoolType: 'municipal' | 'state' | 'private' | 'higher' | '';
  schoolName: string;
  schoolOther?: string;

  // 4. Endereço
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  uf: string;

  // 5. Saúde
  bloodType?: string;
  hasAllergy: boolean;
  allergyDetail?: string;
  hasSpecialNeeds: boolean;
  specialNeedsDetail?: string;
  usesMedication: boolean;
  medicationDetail?: string;
  hasPhysicalRestriction: boolean;
  physicalRestrictionDetail?: string;
  practicedActivity: boolean;
  practicedActivityDetail?: string;
  familyHeartHistory: boolean;
  healthProblems: string[];
  healthProblemsOther?: string;
  observations?: string;

  // 6. Imagem
  imageAuthorization: 'authorized' | 'not_authorized' | '';

  // 7. Documentos
  docsDelivered: string[];
}