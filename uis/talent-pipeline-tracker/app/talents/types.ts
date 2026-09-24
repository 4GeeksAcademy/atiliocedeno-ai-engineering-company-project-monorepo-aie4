export type RecordValue = string | number | boolean | null;

export type TalentStatus = "received" | "in_progress" | "selected" | "discarded" | string;
export type TalentStage =
  | "pending"
  | "review"
  | "personal_interview"
  | "technical_interview"
  | "offer_presented"
  | string;

export type TalentRecord = Record<string, RecordValue> & {
  id?: string | number;
  _id?: string | number;
  name?: string;
  full_name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  position?: string;
  linkedin_url?: string;
  cv_url?: string;
  experience_years?: number | string | null;
  status?: TalentStatus;
  stage?: TalentStage;
  application_date?: string;
  applied_at?: string;
  created_at?: string;
  createdAt?: string;
};

export type TalentNote = Record<string, RecordValue> & {
  id?: string | number;
  note_id?: string | number;
  content?: string;
  text?: string;
  note?: string;
  created_at?: string;
};
