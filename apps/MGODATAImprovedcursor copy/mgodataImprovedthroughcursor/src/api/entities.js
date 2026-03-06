// Use localStorage-based entities; User from Supabase auth when configured
import {
  Business,
  AuditReport,
  AuditTask,
  VisibilityCheck,
  Prospect,
  AuditResult,
  ContentKit,
  Report,
  BusinessAssistantResponse,
  Subscription,
  ScanCounter,
  FAQ,
  Review,
  SEOSettings,
  BusinessConnection,
  ScanLead,
  WaitlistEntry,
  ScanResult
} from './localStorageClient';
import { User } from './supabaseAuth';

export {
  Business,
  AuditReport,
  AuditTask,
  VisibilityCheck,
  Prospect,
  AuditResult,
  ContentKit,
  Report,
  BusinessAssistantResponse,
  Subscription,
  ScanCounter,
  FAQ,
  Review,
  SEOSettings,
  BusinessConnection,
  ScanLead,
  WaitlistEntry,
  ScanResult,
  User
};