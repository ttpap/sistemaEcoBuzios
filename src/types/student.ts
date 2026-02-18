export interface StudentRegistration {
  id: string;
  fullName: string;
  socialName?: string;
  preferredName?: string;
  email?: string;
  cpf?: string;
  rg?: string;
  birthDate: string;
  age: number;
  phone: string;
  cellPhone: string;
  gender: string;
  genderOther?: string;
  race: string;
  photo?: string; // Base64 da foto

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
}