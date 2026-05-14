export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      [_ in string]: {
        Row: {
          [_ in string]: any
        }
        Insert: {
          [_ in string]: any
        }
        Update: {
          [_ in string]: any
        }
      }
    }
    Views: {
      [_ in string]: {
        Row: {
          [_ in string]: any
        }
      }
    }
    Functions: {
      [_ in string]: {
        Args: {
          [_ in string]: any
        }
        Returns: any
      }
    }
    Enums: {
      [_ in string]: any
    }
  }
}
