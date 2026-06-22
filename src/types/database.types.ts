//database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance_reports: {
        Row: {
          by_congregation: Json | null
          id: string
          is_official: boolean
          notes: string | null
          occurrence_id: string
          submitted_at: string | null
          submitted_by: string
          total_members: number
          total_visitors: number
        }
        Insert: {
          by_congregation?: Json | null
          id?: string
          is_official?: boolean
          notes?: string | null
          occurrence_id: string
          submitted_at?: string | null
          submitted_by: string
          total_members?: number
          total_visitors?: number
        }
        Update: {
          by_congregation?: Json | null
          id?: string
          is_official?: boolean
          notes?: string | null
          occurrence_id?: string
          submitted_at?: string | null
          submitted_by?: string
          total_members?: number
          total_visitors?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_reports_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "event_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      baptism_records: {
        Row: {
          baptism_date: string
          baptized_by: string | null
          certificate_number: string | null
          created_at: string | null
          id: string
          jemaat_id: string | null
          location: string | null
        }
        Insert: {
          baptism_date: string
          baptized_by?: string | null
          certificate_number?: string | null
          created_at?: string | null
          id?: string
          jemaat_id?: string | null
          location?: string | null
        }
        Update: {
          baptism_date?: string
          baptized_by?: string | null
          certificate_number?: string | null
          created_at?: string | null
          id?: string
          jemaat_id?: string | null
          location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "baptism_records_jemaat_id_fkey"
            columns: ["jemaat_id"]
            isOneToOne: false
            referencedRelation: "jemaat"
            referencedColumns: ["id"]
          },
        ]
      }
      cashflow_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      cashflow_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string
          id: string
          notes: string | null
          reference_no: string | null
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          reference_no?: string | null
          transaction_date: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          reference_no?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashflow_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cashflow_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      department_members: {
        Row: {
          department_id: string | null
          id: string
          jemaat_id: string | null
          role_pelayanan: string | null
          tanggal_join: string | null
        }
        Insert: {
          department_id?: string | null
          id?: string
          jemaat_id?: string | null
          role_pelayanan?: string | null
          tanggal_join?: string | null
        }
        Update: {
          department_id?: string | null
          id?: string
          jemaat_id?: string | null
          role_pelayanan?: string | null
          tanggal_join?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_members_jemaat_id_fkey"
            columns: ["jemaat_id"]
            isOneToOne: false
            referencedRelation: "jemaat"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          deskripsi: string | null
          id: string
          leader_id: string | null
          nama_pelayanan: string
        }
        Insert: {
          created_at?: string | null
          deskripsi?: string | null
          id?: string
          leader_id?: string | null
          nama_pelayanan: string
        }
        Update: {
          created_at?: string | null
          deskripsi?: string | null
          id?: string
          leader_id?: string | null
          nama_pelayanan?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "jemaat"
            referencedColumns: ["id"]
          },
        ]
      }
      event_occurrences: {
        Row: {
          created_at: string | null
          end_time: string | null
          event_id: string
          id: string
          is_cancelled: boolean
          location_override: string | null
          occurrence_date: string
          start_time: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          event_id: string
          id?: string
          is_cancelled?: boolean
          location_override?: string | null
          occurrence_date: string
          start_time?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          event_id?: string
          id?: string
          is_cancelled?: boolean
          location_override?: string | null
          occurrence_date?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_occurrences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          created_at: string | null
          description: string | null
          end_time: string | null
          event_date: string
          event_name: string
          event_type: string | null
          id: string
          location: string | null
          recurrence_end_date: string | null
          recurrence_rule: string | null
          start_time: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          event_name: string
          event_type?: string | null
          id?: string
          location?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          start_time?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_name?: string
          event_type?: string | null
          id?: string
          location?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          start_time?: string | null
        }
        Relationships: []
      }
      icare_attendance: {
        Row: {
          hadir: boolean
          id: string
          jemaat_id: string
          keterangan: string | null
          meeting_id: string
        }
        Insert: {
          hadir?: boolean
          id?: string
          jemaat_id: string
          keterangan?: string | null
          meeting_id: string
        }
        Update: {
          hadir?: boolean
          id?: string
          jemaat_id?: string
          keterangan?: string | null
          meeting_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "icare_attendance_jemaat_id_fkey"
            columns: ["jemaat_id"]
            isOneToOne: false
            referencedRelation: "jemaat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icare_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "icare_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      icare_groups: {
        Row: {
          created_at: string | null
          deskripsi: string | null
          id: string
          jam_pertemuan: string | null
          leader_id: string | null
          lokasi_pertemuan: string | null
          nama_icare: string
        }
        Insert: {
          created_at?: string | null
          deskripsi?: string | null
          id?: string
          jam_pertemuan?: string | null
          leader_id?: string | null
          lokasi_pertemuan?: string | null
          nama_icare: string
        }
        Update: {
          created_at?: string | null
          deskripsi?: string | null
          id?: string
          jam_pertemuan?: string | null
          leader_id?: string | null
          lokasi_pertemuan?: string | null
          nama_icare?: string
        }
        Relationships: [
          {
            foreignKeyName: "icare_groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "jemaat"
            referencedColumns: ["id"]
          },
        ]
      }
      icare_meetings: {
        Row: {
          catatan: string | null
          created_at: string | null
          created_by: string | null
          icare_id: string
          id: string
          jumlah_hadir: number
          lokasi: string | null
          tanggal: string
          topik: string | null
        }
        Insert: {
          catatan?: string | null
          created_at?: string | null
          created_by?: string | null
          icare_id: string
          id?: string
          jumlah_hadir?: number
          lokasi?: string | null
          tanggal: string
          topik?: string | null
        }
        Update: {
          catatan?: string | null
          created_at?: string | null
          created_by?: string | null
          icare_id?: string
          id?: string
          jumlah_hadir?: number
          lokasi?: string | null
          tanggal?: string
          topik?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "icare_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icare_meetings_icare_id_fkey"
            columns: ["icare_id"]
            isOneToOne: false
            referencedRelation: "icare_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      icare_members: {
        Row: {
          icare_id: string | null
          id: string
          jemaat_id: string | null
          join_date: string | null
        }
        Insert: {
          icare_id?: string | null
          id?: string
          jemaat_id?: string | null
          join_date?: string | null
        }
        Update: {
          icare_id?: string | null
          id?: string
          jemaat_id?: string | null
          join_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "icare_members_icare_id_fkey"
            columns: ["icare_id"]
            isOneToOne: false
            referencedRelation: "icare_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "icare_members_jemaat_id_fkey"
            columns: ["jemaat_id"]
            isOneToOne: false
            referencedRelation: "jemaat"
            referencedColumns: ["id"]
          },
        ]
      }
      jemaat: {
        Row: {
          alamat: string | null
          created_at: string | null
          discipleship_stage: string | null
          dob: string | null
          email: string | null
          gender: string | null
          id: string
          is_baptized: boolean | null
          marital_status: string | null
          nama_lengkap: string
          notes: string | null
          phone_number: string | null
          photo_url: string | null
          status_jemaat: string | null
          tanggal_baptis: string | null
          tanggal_join: string | null
          user_id: string | null
        }
        Insert: {
          alamat?: string | null
          created_at?: string | null
          discipleship_stage?: string | null
          dob?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          is_baptized?: boolean | null
          marital_status?: string | null
          nama_lengkap: string
          notes?: string | null
          phone_number?: string | null
          photo_url?: string | null
          status_jemaat?: string | null
          tanggal_baptis?: string | null
          tanggal_join?: string | null
          user_id?: string | null
        }
        Update: {
          alamat?: string | null
          created_at?: string | null
          discipleship_stage?: string | null
          dob?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          is_baptized?: boolean | null
          marital_status?: string | null
          nama_lengkap?: string
          notes?: string | null
          phone_number?: string | null
          photo_url?: string | null
          status_jemaat?: string | null
          tanggal_baptis?: string | null
          tanggal_join?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jemaat_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offerings: {
        Row: {
          amount: number
          id: string
          jemaat_id: string | null
          offering_type: string | null
          payment_method: string | null
          transaction_date: string | null
        }
        Insert: {
          amount: number
          id?: string
          jemaat_id?: string | null
          offering_type?: string | null
          payment_method?: string | null
          transaction_date?: string | null
        }
        Update: {
          amount?: number
          id?: string
          jemaat_id?: string | null
          offering_type?: string | null
          payment_method?: string | null
          transaction_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offerings_jemaat_id_fkey"
            columns: ["jemaat_id"]
            isOneToOne: false
            referencedRelation: "jemaat"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          email: string | null
          full_name: string
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          email?: string | null
          full_name: string
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      cashflow_monthly_summary: {
        Row: {
          month: string | null
          net: number | null
          total_in: number | null
          total_out: number | null
        }
        Relationships: []
      }
      cashflow_transactions_view: {
        Row: {
          amount: number | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          description: string | null
          id: string | null
          notes: string | null
          reference_no: string | null
          transaction_date: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashflow_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "cashflow_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_profiles_with_jemaat: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
          jemaat_id: string
          jemaat_nama: string
          role: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      status_jemaat_type: "aktif" | "tidak aktif" | "pindah" | "meninggal" | "tidak di batam"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      status_jemaat_type: ["aktif", "tidak aktif", "pindah", "meninggal", "tidak di batam"],
    },
  },
} as const
