export interface StudentRegistration {
  id: string;
  registration: string;
  fullName: string;
  socialName?: string;
  preferredName?: string;
  email?: string;
  cpf?: string;
  birthDate: string;
  age: number;
  phone?: string;
  cellPhone: string;
  gender: string;
  genderOther?: string;
  race: string;
  photo?: string;

  // 2. Responsável
  guardianName?: string;
  guardianKinship?: string;
  guardianPhone?: string;

  // 3. Escola
  schoolType: string;
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

  // Utilidades
  enelClientNumber?: string;

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
  imageAuthorization: string;

  // 7. Documentos
  docsDelivered: string[];
  registrationDate: string;
  status: string;
  class: string;
}