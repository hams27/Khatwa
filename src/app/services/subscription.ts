import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api';

export interface Subscription {
  id?: number;
  userId?: number;
  planType: 'Free' | 'Pro' | 'Business';
  status: 'active' | 'canceled' | 'expired';
  startDate?: string;
  endDate?: string;
  paymentDetails?: any;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiUrl = `${API_BASE_URL}/subscriptions`;

  constructor(private http: HttpClient) {}

  // الحصول على الاشتراك الحالي
  getCurrentSubscription(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  // ترقية/تغيير الاشتراك
  updateSubscription(planType: string): Observable<any> {
    return this.http.put(this.apiUrl, { planType });
  }

  // إلغاء الاشتراك
  cancelSubscription(): Observable<any> {
    return this.http.delete(this.apiUrl);
  }
}
