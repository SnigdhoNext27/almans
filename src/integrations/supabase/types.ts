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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          cart_data: Json
          created_at: string
          guest_id: string | null
          id: string
          last_reminder_at: string | null
          recovered: boolean | null
          reminder_count: number | null
          reminder_sent: boolean | null
          total_value: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cart_data: Json
          created_at?: string
          guest_id?: string | null
          id?: string
          last_reminder_at?: string | null
          recovered?: boolean | null
          reminder_count?: number | null
          reminder_sent?: boolean | null
          total_value?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cart_data?: Json
          created_at?: string
          guest_id?: string | null
          id?: string
          last_reminder_at?: string | null
          recovered?: boolean | null
          reminder_count?: number | null
          reminder_sent?: boolean | null
          total_value?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          created_at: string
          district: string | null
          full_name: string
          id: string
          is_default: boolean | null
          label: string | null
          phone: string
          postal_code: string | null
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          created_at?: string
          district?: string | null
          full_name: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          phone: string
          postal_code?: string | null
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          created_at?: string
          district?: string | null
          full_name?: string
          id?: string
          is_default?: boolean | null
          label?: string | null
          phone?: string
          postal_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          bundle_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
        }
        Update: {
          bundle_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "product_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          has_sizes: boolean | null
          id: string
          image_url: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          has_sizes?: boolean | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          has_sizes?: boolean | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          bot_turn_count: number
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          escalation_reason: string | null
          guest_session_id: string | null
          handled_by: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          bot_turn_count?: number
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          escalation_reason?: string | null
          guest_session_id?: string | null
          handled_by?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          bot_turn_count?: number
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          escalation_reason?: string | null
          guest_session_id?: string | null
          handled_by?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          uses_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          uses_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          uses_count?: number | null
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          code: string
          created_at: string
          current_balance: number
          expires_at: string | null
          id: string
          initial_balance: number
          is_active: boolean
          message: string | null
          purchaser_id: string | null
          recipient_email: string | null
          recipient_name: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_balance?: number
          expires_at?: string | null
          id?: string
          initial_balance?: number
          is_active?: boolean
          message?: string | null
          purchaser_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_balance?: number
          expires_at?: string | null
          id?: string
          initial_balance?: number
          is_active?: boolean
          message?: string | null
          purchaser_id?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_text: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          subtitle: string | null
          tagline: string | null
          title: string
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          subtitle?: string | null
          tagline?: string | null
          title: string
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          subtitle?: string | null
          tagline?: string | null
          title?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          created_at: string
          id: string
          lifetime_points: number
          points: number
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lifetime_points?: number
          points?: number
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lifetime_points?: number
          points?: number
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean | null
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean | null
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean | null
          subscribed_at?: string
        }
        Relationships: []
      }
      notification_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          notification_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          notification_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          notification_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_analytics_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          abandoned_cart: boolean | null
          created_at: string
          email_enabled: boolean | null
          id: string
          new_products: boolean | null
          order_updates: boolean | null
          promotions: boolean | null
          push_enabled: boolean | null
          restock_alerts: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abandoned_cart?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          new_products?: boolean | null
          order_updates?: boolean | null
          promotions?: boolean | null
          push_enabled?: boolean | null
          restock_alerts?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abandoned_cart?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          new_products?: boolean | null
          order_updates?: boolean | null
          promotions?: boolean | null
          push_enabled?: boolean | null
          restock_alerts?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_triggers: {
        Row: {
          created_at: string
          delay_minutes: number | null
          id: string
          is_active: boolean | null
          message_template: string
          send_email: boolean | null
          send_push: boolean | null
          title_template: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          message_template: string
          send_email?: boolean | null
          send_push?: boolean | null
          title_template: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          message_template?: string
          send_email?: boolean | null
          send_push?: boolean | null
          title_template?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          ab_test_name: string | null
          clicked_count: number | null
          created_at: string
          delivered_count: number | null
          id: string
          image_url: string | null
          is_ab_test: boolean | null
          is_global: boolean | null
          is_read: boolean | null
          is_sent: boolean | null
          link: string | null
          message: string
          opened_count: number | null
          parent_id: string | null
          scheduled_at: string | null
          send_email: boolean | null
          target_criteria: Json | null
          target_segment: string | null
          title: string
          type: string
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          ab_test_name?: string | null
          clicked_count?: number | null
          created_at?: string
          delivered_count?: number | null
          id?: string
          image_url?: string | null
          is_ab_test?: boolean | null
          is_global?: boolean | null
          is_read?: boolean | null
          is_sent?: boolean | null
          link?: string | null
          message: string
          opened_count?: number | null
          parent_id?: string | null
          scheduled_at?: string | null
          send_email?: boolean | null
          target_criteria?: Json | null
          target_segment?: string | null
          title: string
          type?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          ab_test_name?: string | null
          clicked_count?: number | null
          created_at?: string
          delivered_count?: number | null
          id?: string
          image_url?: string | null
          is_ab_test?: boolean | null
          is_global?: boolean | null
          is_read?: boolean | null
          is_sent?: boolean | null
          link?: string | null
          message?: string
          opened_count?: number | null
          parent_id?: string | null
          scheduled_at?: string | null
          send_email?: boolean | null
          target_criteria?: Json | null
          target_segment?: string | null
          title?: string
          type?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          color: string | null
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          size: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity: number
          size?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          delivery_fee: number
          discount: number | null
          gift_card_code: string | null
          gift_message: string | null
          gift_wrap: boolean | null
          guest_email: string | null
          guest_phone: string | null
          id: string
          notes: string | null
          order_number: string
          shipping_address: Json
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          discount?: number | null
          gift_card_code?: string | null
          gift_message?: string | null
          gift_wrap?: boolean | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          order_number: string
          shipping_address: Json
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          discount?: number | null
          gift_card_code?: string | null
          gift_message?: string | null
          gift_wrap?: boolean | null
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          shipping_address?: Json
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_answers: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_official: boolean
          question_id: string
          user_id: string | null
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_official?: boolean
          question_id: string
          user_id?: string | null
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_official?: boolean
          question_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "product_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_bundles: {
        Row: {
          created_at: string
          description: string | null
          discount_percentage: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percentage?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percentage?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      product_questions: {
        Row: {
          created_at: string
          id: string
          is_answered: boolean
          product_id: string
          question: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_answered?: boolean
          product_id: string
          question: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_answered?: boolean
          product_id?: string
          question?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          colors: string[] | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          is_new: boolean | null
          name: string
          price: number
          rating: number | null
          review_count: number | null
          sale_price: number | null
          short_description: string | null
          sizes: string[] | null
          sku: string | null
          slug: string
          stock: number
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category_id?: string | null
          colors?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          name: string
          price: number
          rating?: number | null
          review_count?: number | null
          sale_price?: number | null
          short_description?: string | null
          sizes?: string[] | null
          sku?: string | null
          slug: string
          stock?: number
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category_id?: string | null
          colors?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          name?: string
          price?: number
          rating?: number | null
          review_count?: number | null
          sale_price?: number | null
          short_description?: string | null
          sizes?: string[] | null
          sku?: string | null
          slug?: string
          stock?: number
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          referral_code: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean | null
          p256dh_key: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean | null
          p256dh_key: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean | null
          p256dh_key?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_email: string
          referred_id: string | null
          referrer_id: string
          reward_points: number | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_email: string
          referred_id?: string | null
          referrer_id: string
          reward_points?: number | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_email?: string
          referred_id?: string | null
          referrer_id?: string
          reward_points?: number | null
          status?: string
        }
        Relationships: []
      }
      restock_alerts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          notified: boolean | null
          product_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          notified?: boolean | null
          product_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          notified?: boolean | null
          product_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      review_photos: {
        Row: {
          created_at: string
          id: string
          image_url: string
          review_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          review_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_photos_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean | null
          product_id: string
          rating: number
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          product_id: string
          rating: number
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean | null
          product_id?: string
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_payment_methods: {
        Row: {
          card_brand: string | null
          created_at: string
          id: string
          is_default: boolean | null
          last_four: string | null
          method_type: string
          nickname: string | null
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          card_brand?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          method_type: string
          nickname?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          card_brand?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          method_type?: string
          nickname?: string | null
          phone_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_order_with_items: {
        Args: {
          p_delivery_fee: number
          p_guest_email?: string
          p_guest_phone?: string
          p_items: Json
          p_notes?: string
          p_order_number: string
          p_shipping_address: Json
          p_subtotal: number
          p_total: number
          p_user_id?: string
        }
        Returns: Json
      }
      get_admin_count: { Args: never; Returns: number }
      get_user_admin_role: { Args: { _user_id: string }; Returns: string }
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin" | "officer"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
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
      app_role: ["admin", "moderator", "user", "super_admin", "officer"],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
