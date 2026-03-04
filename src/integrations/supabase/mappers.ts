import type { StudentRegistration } from "@/types/student";
import type { SchoolClass } from "@/types/class";
import type { TeacherRegistration } from "@/types/teacher";
import type { CoordinatorRegistration } from "@/types/coordinator";

export function mapStudentRowToModel(row: any): StudentRegistration {
  return {
    id: row.id,
    registration: row.registration,
    fullName: row.full_name,
    socialName: row.social_name ?? undefined,
    email: row.email ?? undefined,
    cpf: row.cpf ?? undefined,
    birthDate: row.birth_date,
    age: row.age,
    cellPhone: row.cell_phone,
    gender: row.gender,
    race: row.race,
    photo: row.photo ?? undefined,

    guardianName: row.guardian_name ?? undefined,
    guardianKinship: row.guardian_kinship ?? undefined,
    guardianPhone: row.guardian_phone ?? undefined,
    guardianDeclarationConfirmed: row.guardian_declaration_confirmed ?? undefined,

    schoolType: row.school_type,
    schoolName: row.school_name,
    schoolOther: row.school_other ?? undefined,

    cep: row.cep,
    street: row.street,
    number: row.number,
    complement: row.complement ?? undefined,
    neighborhood: row.neighborhood,
    city: row.city,
    uf: row.uf,

    enelClientNumber: row.enel_client_number ?? undefined,

    bloodType: row.blood_type ?? undefined,
    hasAllergy: row.has_allergy,
    allergyDetail: row.allergy_detail ?? undefined,
    hasSpecialNeeds: row.has_special_needs,
    specialNeedsDetail: row.special_needs_detail ?? undefined,
    usesMedication: row.uses_medication,
    medicationDetail: row.medication_detail ?? undefined,
    hasPhysicalRestriction: row.has_physical_restriction,
    physicalRestrictionDetail: row.physical_restriction_detail ?? undefined,
    practicedActivity: row.practiced_activity,
    practicedActivityDetail: row.practiced_activity_detail ?? undefined,
    familyHeartHistory: row.family_heart_history,
    healthProblems: row.health_problems || [],
    healthProblemsOther: row.health_problems_other ?? undefined,
    observations: row.observations ?? undefined,

    imageAuthorization: row.image_authorization,
    docsDelivered: row.docs_delivered || [],

    registrationDate: row.registration_date,
    status: row.status,
    class: row.class,
  };
}

export function mapStudentModelToRow(values: StudentRegistration) {
  return {
    id: values.id,
    registration: values.registration,
    full_name: values.fullName,
    social_name: values.socialName ?? null,
    email: values.email ?? null,
    cpf: values.cpf ?? null,
    birth_date: values.birthDate,
    age: values.age,
    cell_phone: values.cellPhone,
    gender: values.gender,
    race: values.race,
    photo: values.photo ?? null,

    guardian_name: values.guardianName ?? null,
    guardian_kinship: values.guardianKinship ?? null,
    guardian_phone: values.guardianPhone ?? null,

    school_type: values.schoolType,
    school_name: values.schoolName,
    school_other: values.schoolOther ?? null,

    cep: values.cep,
    street: values.street,
    number: values.number,
    complement: values.complement ?? null,
    neighborhood: values.neighborhood,
    city: values.city,
    uf: values.uf,

    enel_client_number: values.enelClientNumber ?? null,

    blood_type: values.bloodType ?? null,
    has_allergy: values.hasAllergy,
    allergy_detail: values.allergyDetail ?? null,
    has_special_needs: values.hasSpecialNeeds,
    special_needs_detail: values.specialNeedsDetail ?? null,
    uses_medication: values.usesMedication,
    medication_detail: values.medicationDetail ?? null,
    has_physical_restriction: values.hasPhysicalRestriction,
    physical_restriction_detail: values.physicalRestrictionDetail ?? null,
    practiced_activity: values.practicedActivity,
    practiced_activity_detail: values.practicedActivityDetail ?? null,
    family_heart_history: values.familyHeartHistory,
    health_problems: values.healthProblems ?? [],
    health_problems_other: values.healthProblemsOther ?? null,
    observations: values.observations ?? null,

    image_authorization: values.imageAuthorization,
    docs_delivered: values.docsDelivered ?? [],

    registration_date: values.registrationDate,
    status: values.status,
    class: values.class,
  };
}

export function mapClassRowToModel(row: any): SchoolClass {
  return {
    id: row.id,
    name: row.name,
    period: row.period,
    startTime: row.start_time,
    endTime: row.end_time,
    capacity: row.capacity,
    absenceLimit: row.absence_limit,
    registrationDate: row.registration_date,
    status: row.status,
    complementaryInfo: row.complementary_info ?? undefined,
  };
}

export function mapTeacherRowToModel(row: any): TeacherRegistration {
  return {
    id: row.id,
    fullName: row.full_name,
    cpf: row.cpf ?? undefined,
    rg: row.rg ?? undefined,
    cnpj: row.cnpj ?? undefined,
    email: row.email,
    cellPhone: row.cell_phone,
    gender: row.gender,
    photo: row.photo ?? undefined,

    cep: row.cep,
    street: row.street,
    number: row.number,
    complement: row.complement ?? undefined,
    neighborhood: row.neighborhood,
    city: row.city,
    uf: row.uf,

    bank: row.bank,
    agency: row.agency,
    account: row.account,
    pixKey: row.pix_key,

    authLogin: row.auth_login,
    authPassword: row.auth_password,

    registrationDate: row.registration_date,
    status: row.status,
  };
}

export function mapTeacherModelToRow(values: TeacherRegistration) {
  return {
    id: values.id,
    full_name: values.fullName,
    cpf: values.cpf ?? null,
    rg: values.rg ?? null,
    cnpj: values.cnpj ?? null,
    email: values.email,
    cell_phone: values.cellPhone,
    gender: values.gender,
    photo: values.photo ?? null,

    cep: values.cep,
    street: values.street,
    number: values.number,
    complement: values.complement ?? null,
    neighborhood: values.neighborhood,
    city: values.city,
    uf: values.uf,

    bank: values.bank,
    agency: values.agency,
    account: values.account,
    pix_key: values.pixKey,

    auth_login: values.authLogin,
    auth_password: values.authPassword,

    registration_date: values.registrationDate,
    status: values.status,
  };
}

export function mapCoordinatorRowToModel(row: any): CoordinatorRegistration {
  return {
    id: row.id,
    fullName: row.full_name,
    cpf: row.cpf ?? undefined,
    rg: row.rg ?? undefined,
    cnpj: row.cnpj ?? undefined,
    email: row.email,
    cellPhone: row.cell_phone,
    gender: row.gender,
    photo: row.photo ?? undefined,

    cep: row.cep,
    street: row.street,
    number: row.number,
    complement: row.complement ?? undefined,
    neighborhood: row.neighborhood,
    city: row.city,
    uf: row.uf,

    bank: row.bank,
    agency: row.agency,
    account: row.account,
    pixKey: row.pix_key,

    authLogin: row.auth_login,
    authPassword: row.auth_password,

    registrationDate: row.registration_date,
    status: row.status,
  };
}

export function mapCoordinatorModelToRow(values: CoordinatorRegistration) {
  return {
    id: values.id,
    full_name: values.fullName,
    cpf: values.cpf ?? null,
    rg: values.rg ?? null,
    cnpj: values.cnpj ?? null,
    email: values.email,
    cell_phone: values.cellPhone,
    gender: values.gender,
    photo: values.photo ?? null,

    cep: values.cep,
    street: values.street,
    number: values.number,
    complement: values.complement ?? null,
    neighborhood: values.neighborhood,
    city: values.city,
    uf: values.uf,

    bank: values.bank,
    agency: values.agency,
    account: values.account,
    pix_key: values.pixKey,

    auth_login: values.authLogin,
    auth_password: values.authPassword,

    registration_date: values.registrationDate,
    status: values.status,
  };
}