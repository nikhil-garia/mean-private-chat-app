import { ArrayType } from "@angular/compiler";

// Call Model
export interface Call {
  _id: string;
  participants: ArrayType;
  status: string;
  verdict: string;
  startedAt: Date;
  created_at: Date;
  to_id: JSON;
  from_id: JSON;
}